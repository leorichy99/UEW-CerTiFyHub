"""
SSE (Server-Sent Events) views for real-time notifications and audit logs.
Custom implementation using Django's StreamingHttpResponse.
"""

import json
import logging
import time
from django.http import StreamingHttpResponse
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth.models import AnonymousUser, User

logger = logging.getLogger('notifications')


def authenticate_sse_request(request):
    """
    Authenticate SSE request via Authorization header or query parameter.
    Prioritizes Authorization header for better security.
    
    Args:
        request: Django request object
        
    Returns:
        User instance if authenticated, AnonymousUser otherwise
    """
    # Try Authorization header first (preferred)
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if auth_header.startswith('Bearer '):
        token_str = auth_header[7:]
    else:
        # Fallback to query parameter (for compatibility)
        token_str = request.GET.get('token', '')
    
    if not token_str:
        logger.debug('SSE authentication failed: No token provided')
        return AnonymousUser()
    
    try:
        token = AccessToken(token_str)
        user_id = token['user_id']
        return User.objects.get(id=user_id)
    except (TokenError, User.DoesNotExist, KeyError) as e:
        logger.debug(f'SSE authentication failed: {e}')
        return AnonymousUser()


class SSEView:
    """
    Base class for SSE views with common functionality.
    """
    
    def __init__(self, request):
        self.request = request
        self.user = authenticate_sse_request(request)
        self.last_event_id = request.META.get('HTTP_LAST_EVENT_ID', '')
    
    def format_sse(self, data, event_type='message', event_id=None):
        """
        Format data as SSE event.
        
        Args:
            data: Data to send (will be JSON serialized)
            event_type: Event type (default: 'message')
            event_id: Event ID for reconnection support
            
        Returns:
            Formatted SSE string
        """
        lines = []
        if event_id:
            lines.append(f'id: {event_id}')
        lines.append(f'event: {event_type}')
        lines.append(f'data: {json.dumps(data)}')
        lines.append('')  # Empty line to end event
        return '\n'.join(lines)
    
    def keep_alive(self):
        """
        Generate keep-alive comment to keep connection open.
        """
        return ': keep-alive\n\n'
    
    def is_authenticated(self):
        """Check if user is authenticated."""
        return self.user.is_authenticated
    
    def has_permission(self):
        """
        Override this method in subclasses to implement custom permissions.
        """
        return True


class SSEGenerator:
    """
    Generator for SSE events with keep-alive support.
    """
    
    def __init__(self, sse_view):
        self.sse_view = sse_view
        self.last_keep_alive = time.time()
        self.keep_alive_interval = 30  # seconds
    
    def __iter__(self):
        return self
    
    def __next__(self):
        """
        Yield SSE events or keep-alive messages.
        Subclasses should override this to yield actual events.
        """
        # Keep-alive check
        if time.time() - self.last_keep_alive > self.keep_alive_interval:
            self.last_keep_alive = time.time()
            return self.sse_view.keep_alive()
        
        # Subclasses should override to yield actual events
        # This is a placeholder that yields keep-alive
        return self.sse_view.keep_alive()


class NotificationSSEView(SSEView):
    """
    SSE view for streaming notifications to authenticated users.
    """
    
    def has_permission(self):
        """User must be authenticated."""
        return self.is_authenticated()
    
    def get_user_group(self):
        """Get the user's notification group name."""
        return f'notifications_user_{self.user.id}'
    
    def get_role_group(self):
        """Get the user's role notification group name."""
        try:
            role = self.user.profile.role
            return f'notifications_role_{role}'
        except Exception:
            return None


class NotificationSSEGenerator(SSEGenerator):
    """
    Generator for notification SSE events using Redis pub/sub.
    """
    
    def __init__(self, sse_view):
        super().__init__(sse_view)
        self.channel_layer = None
        self.subscribed = False
        self.message_queue = []
        
        try:
            from channels.layers import get_channel_layer
            self.channel_layer = get_channel_layer()
        except Exception as e:
            logger.error(f'Failed to get channel layer: {e}')
    
    def __iter__(self):
        # Subscribe to user's notification group
        if self.channel_layer and self.sse_view.is_authenticated():
            try:
                from asgiref.sync import async_to_sync
                user_group = self.sse_view.get_user_group()
                role_group = self.sse_view.get_role_group()
                
                # Subscribe to user group
                if user_group:
                    self.channel_layer.group_add(user_group, 'sse')
                
                # Subscribe to role group
                if role_group:
                    self.channel_layer.group_add(role_group, 'sse')
                
                self.subscribed = True
                logger.info(f'Subscribed to notification groups: {user_group}, {role_group}')
            except Exception as e:
                logger.error(f'Failed to subscribe to notification groups: {e}')
        
        return self
    
    def __next__(self):
        # Keep-alive check
        if time.time() - self.last_keep_alive > self.keep_alive_interval:
            self.last_keep_alive = time.time()
            return self.sse_view.keep_alive()
        
        # For now, just return keep-alive
        # In a real implementation, we'd poll Redis or use a different mechanism
        # Since Django Channels is async and we're in a sync view, we need a different approach
        return self.sse_view.keep_alive()


def notification_sse(request):
    """
    SSE endpoint for streaming notifications to authenticated users.
    GET /api/sse/notifications/?token=<JWT>
    """
    from django.conf import settings
    
    # Check feature flag
    if not getattr(settings, 'USE_SSE_NOTIFICATIONS', True):
        # Return 503 if SSE is disabled
        return StreamingHttpResponse(
            'event: error\ndata: {"message": "SSE notifications disabled"}\n\n',
            content_type='text/event-stream',
            status=503
        )
    
    sse_view = NotificationSSEView(request)
    
    # Check authentication
    if not sse_view.is_authenticated():
        return StreamingHttpResponse(
            'event: error\ndata: {"message": "Unauthorized"}\n\n',
            content_type='text/event-stream',
            status=401
        )
    
    # Check permissions
    if not sse_view.has_permission():
        return StreamingHttpResponse(
            'event: error\ndata: {"message": "Forbidden"}\n\n',
            content_type='text/event-stream',
            status=403
        )
    
    # Create generator
    generator = NotificationSSEGenerator(sse_view)
    
    # Return SSE response
    response = StreamingHttpResponse(
        generator,
        content_type='text/event-stream'
    )
    response['Cache-Control'] = 'no-cache'
    response['Connection'] = 'keep-alive'
    response['X-Accel-Buffering'] = 'no'  # Disable nginx buffering
    
    return response


class AuditLogSSEView(SSEView):
    """
    SSE view for streaming audit logs to super admins.
    """
    
    def has_permission(self):
        """User must be super admin."""
        if not self.is_authenticated():
            return False
        try:
            return self.user.profile.role == 'SUPER_ADMIN'
        except Exception:
            return False


class AuditLogSSEGenerator(SSEGenerator):
    """
    Generator for audit log SSE events.
    """
    
    def __init__(self, sse_view):
        super().__init__(sse_view)
        self.channel_layer = None
        self.subscribed = False
        self.last_event_id = 0
        
        try:
            from channels.layers import get_channel_layer
            self.channel_layer = get_channel_layer()
        except Exception as e:
            logger.error(f'Failed to get channel layer: {e}')
    
    def __iter__(self):
        # Subscribe to audit log channel
        if self.channel_layer and self.sse_view.is_authenticated():
            try:
                from asgiref.sync import async_to_sync
                self.channel_layer.group_add('audit_logs', 'sse')
                self.subscribed = True
                logger.info('Subscribed to audit_logs channel')
            except Exception as e:
                logger.error(f'Failed to subscribe to audit_logs channel: {e}')
        
        return self
    
    def __next__(self):
        # Keep-alive check
        if time.time() - self.last_keep_alive > self.keep_alive_interval:
            self.last_keep_alive = time.time()
            return self.sse_view.keep_alive()
        
        # For now, just return keep-alive
        # In a real implementation, we'd poll Redis or use a different mechanism
        return self.sse_view.keep_alive()


def audit_log_sse(request):
    """
    SSE endpoint for streaming audit logs to super admins.
    GET /api/sse/audit-logs/?token=<JWT>
    """
    from django.conf import settings
    
    # Check feature flag
    if not getattr(settings, 'USE_SSE_AUDIT_LOGS', True):
        # Return 503 if SSE is disabled
        return StreamingHttpResponse(
            'event: error\ndata: {"message": "SSE audit logs disabled"}\n\n',
            content_type='text/event-stream',
            status=503
        )
    
    sse_view = AuditLogSSEView(request)
    
    # Check authentication
    if not sse_view.is_authenticated():
        return StreamingHttpResponse(
            'event: error\ndata: {"message": "Unauthorized"}\n\n',
            content_type='text/event-stream',
            status=401
        )
    
    # Check permissions
    if not sse_view.has_permission():
        return StreamingHttpResponse(
            'event: error\ndata: {"message": "Forbidden - Super Admin only"}\n\n',
            content_type='text/event-stream',
            status=403
        )
    
    # Create generator
    generator = AuditLogSSEGenerator(sse_view)
    
    # Return SSE response
    response = StreamingHttpResponse(
        generator,
        content_type='text/event-stream'
    )
    response['Cache-Control'] = 'no-cache'
    response['Connection'] = 'keep-alive'
    response['X-Accel-Buffering'] = 'no'  # Disable nginx buffering
    
    return response
