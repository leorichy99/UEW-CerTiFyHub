"""
SSE (Server-Sent Events) views for real-time notifications and audit logs.

Async implementation: each request opens a dedicated channel-layer channel,
joins the relevant groups, and streams live events (with periodic keep-alives)
using Django's StreamingHttpResponse under ASGI. Producers push events via
`channel_layer.group_send` from `notifications.services` and the AuditLog
post_save signal in `analytics.models`.
"""

import asyncio
import json
import logging

from asgiref.sync import sync_to_async
from channels.layers import get_channel_layer
from django.http import StreamingHttpResponse
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth.models import AnonymousUser, User

logger = logging.getLogger('notifications')

# Seconds between keep-alive comments when no event arrives.
KEEP_ALIVE_INTERVAL = 30


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


def _sse_event(data, event_type='message', event_id=None):
    """Serialize `data` as a spec-compliant SSE event terminated by a blank line."""
    prefix = f'id: {event_id}\n' if event_id is not None else ''
    return f'{prefix}event: {event_type}\ndata: {json.dumps(data)}\n\n'


def _keep_alive():
    """SSE comment line that keeps the connection (and proxies) from timing out."""
    return ': keep-alive\n\n'


@sync_to_async
def _get_notification_groups(user):
    """Return (user_group, role_group) for the given user. role_group may be None."""
    user_group = f'notifications_user_{user.id}'
    role_group = None
    try:
        role = user.profile.role
        if role:
            role_group = f'notifications_role_{role}'
    except Exception:
        pass
    return user_group, role_group


@sync_to_async
def _get_unread_count(user):
    """Count the user's unread, unarchived notifications (personal + role broadcasts)."""
    from .models import Notification
    from django.db.models import Q

    role = ''
    try:
        role = user.profile.role
    except Exception:
        pass

    return Notification.objects.filter(
        Q(recipient=user) | Q(role_target=role),
        is_read=False, is_archived=False,
    ).count()


@sync_to_async
def _is_super_admin(user):
    """True if the user's profile role is SUPER_ADMIN."""
    try:
        return user.profile.role == 'SUPER_ADMIN'
    except Exception:
        return False


async def notification_sse(request):
    """
    SSE endpoint streaming live notifications to the authenticated user.
    GET /api/notifications/sse/notifications/  (JWT via Authorization header or ?token=)

    Emits an initial `unread_count` event, then a `notification` event for every
    message published to the user's personal/role groups, with keep-alives in
    between. Mirrors the WebSocket consumer's payload shape so the frontend
    handler in NotificationContext works for both transports.
    """
    from django.conf import settings

    if not getattr(settings, 'USE_SSE_NOTIFICATIONS', True):
        return StreamingHttpResponse(
            'event: error\ndata: {"message": "SSE notifications disabled"}\n\n',
            content_type='text/event-stream', status=503,
        )

    user = await sync_to_async(authenticate_sse_request)(request)
    if not user.is_authenticated:
        return StreamingHttpResponse(
            'event: error\ndata: {"message": "Unauthorized"}\n\n',
            content_type='text/event-stream', status=401,
        )

    user_group, role_group = await _get_notification_groups(user)
    groups = [g for g in (user_group, role_group) if g]

    async def event_stream():
        channel_layer = get_channel_layer()
        channel_name = await channel_layer.new_channel()
        for group in groups:
            await channel_layer.group_add(group, channel_name)
        try:
            count = await _get_unread_count(user)
            yield _sse_event({'type': 'unread_count', 'count': count}, event_type='unread_count')

            while True:
                try:
                    message = await asyncio.wait_for(
                        channel_layer.receive(channel_name),
                        timeout=KEEP_ALIVE_INTERVAL,
                    )
                except asyncio.TimeoutError:
                    yield _keep_alive()
                    continue

                if message.get('type') == 'notification.message':
                    yield _sse_event(
                        {'type': 'notification', 'data': message['data']},
                        event_type='notification',
                    )
        finally:
            for group in groups:
                try:
                    await channel_layer.group_discard(group, channel_name)
                except Exception:
                    pass

    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'  # Disable nginx buffering
    return response


async def audit_log_sse(request):
    """
    SSE endpoint streaming live audit-log entries to super admins.
    GET /api/notifications/sse/audit-logs/  (JWT via Authorization header or ?token=)

    Streams the raw audit-log payload (shape produced by the AuditLog post_save
    signal in analytics.models) for each new entry, which the AdminActivityTimeline
    parser consumes directly via interpretLog(parsed).
    """
    from django.conf import settings

    if not getattr(settings, 'USE_SSE_AUDIT_LOGS', True):
        return StreamingHttpResponse(
            'event: error\ndata: {"message": "SSE audit logs disabled"}\n\n',
            content_type='text/event-stream', status=503,
        )

    user = await sync_to_async(authenticate_sse_request)(request)
    if not user.is_authenticated:
        return StreamingHttpResponse(
            'event: error\ndata: {"message": "Unauthorized"}\n\n',
            content_type='text/event-stream', status=401,
        )

    if not await _is_super_admin(user):
        return StreamingHttpResponse(
            'event: error\ndata: {"message": "Forbidden - Super Admin only"}\n\n',
            content_type='text/event-stream', status=403,
        )

    async def event_stream():
        channel_layer = get_channel_layer()
        channel_name = await channel_layer.new_channel()
        await channel_layer.group_add('audit_logs', channel_name)
        try:
            while True:
                try:
                    message = await asyncio.wait_for(
                        channel_layer.receive(channel_name),
                        timeout=KEEP_ALIVE_INTERVAL,
                    )
                except asyncio.TimeoutError:
                    yield _keep_alive()
                    continue

                if message.get('type') == 'audit_log.message':
                    yield _sse_event(message['data'], event_type='audit_log')
        finally:
            try:
                await channel_layer.group_discard('audit_logs', channel_name)
            except Exception:
                pass

    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'  # Disable nginx buffering
    return response
