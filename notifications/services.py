"""
Central notification service — single entry point for all notification creation.
"""

import logging
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from analytics.utils import log_audit

logger = logging.getLogger('notifications')


def notify(
    recipient=None,
    role_target=None,
    title='',
    message='',
    notification_type='system',
    related_object_id='',
    related_object_type='',
    priority='info',
    delivery_channel='in_app',
    metadata=None,
    request=None,
):
    """
    Create a persistent notification and push it in real-time.

    Args:
        recipient: User instance (for direct notification) or None for broadcast.
        role_target: str role name for broadcast (e.g. 'SUPER_ADMIN').
        title: Short notification title.
        message: Longer description.
        notification_type: One of Notification.TYPE_CHOICES values.
        related_object_id: ID of related object (certificate, template, etc.).
        related_object_type: Type string (e.g. 'certificate', 'template').
        priority: 'info' | 'success' | 'warning' | 'critical'.
        delivery_channel: 'in_app' | 'email' | 'sms'.
        metadata: dict of extra data.
        request: optional Django request for audit logging.
    """
    from .models import Notification
    from .serializers import NotificationSerializer

    # 1. PERSIST — always before broadcasting
    notification = Notification.objects.create(
        recipient=recipient,
        role_target=role_target or '',
        title=title,
        message=message,
        notification_type=notification_type,
        related_object_id=str(related_object_id) if related_object_id else '',
        related_object_type=related_object_type,
        priority=priority,
        delivery_channel=delivery_channel,
        metadata=metadata or {},
    )

    # 2. Audit log
    target_desc = recipient.username if recipient else f'role:{role_target}'
    try:
        log_audit(
            request=request,
            user=recipient,
            action=f'Notification: {notification_type}',
            target=target_desc,
            details=title,
            status='success',
            category='admin',
        )
    except Exception as e:
        logger.warning(f'Audit log failed for notification: {e}')

    # 3. PUSH via WebSocket channel layer or SSE
    from django.conf import settings
    use_sse = getattr(settings, 'USE_SSE_NOTIFICATIONS', True)
    
    try:
        payload = NotificationSerializer(notification).data
        channel_layer = get_channel_layer()

        if recipient:
            group_name = f'notifications_user_{recipient.id}'
            async_to_sync(channel_layer.group_send)(
                group_name,
                {'type': 'notification.message', 'data': payload},
            )

        if role_target:
            group_name = f'notifications_role_{role_target}'
            async_to_sync(channel_layer.group_send)(
                group_name,
                {'type': 'notification.message', 'data': payload},
            )
    except Exception as e:
        logger.warning(f'Push failed for notification {notification.id}: {e}')

    # 4. Queue email for critical notifications or email channel
    if priority == 'critical' or delivery_channel == 'email':
        try:
            from .tasks import send_notification_email
            send_notification_email.delay(str(notification.id))
        except Exception as e:
            logger.warning(f'Email task queue failed for notification {notification.id}: {e}')

    return notification
