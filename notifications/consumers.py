"""
WebSocket consumer for real-time notifications.
"""

import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger('notifications')


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    Authenticated users connect to receive real-time notifications.
    Each user joins:
      - A personal group: notifications_user_{user_id}
      - A role group: notifications_role_{ROLE}
    """

    async def connect(self):
        self.user = self.scope.get('user')
        self.user_group = None
        self.role_group = None

        if not self.user or self.user.is_anonymous:
            await self.close()
            return

        # Join personal channel
        self.user_group = f'notifications_user_{self.user.id}'
        await self.channel_layer.group_add(self.user_group, self.channel_name)

        # Join role-based channel (server-side lookup)
        role = await self._get_user_role()
        if role:
            self.role_group = f'notifications_role_{role}'
            await self.channel_layer.group_add(self.role_group, self.channel_name)

        await self.accept()

        # Send unread count on connect
        count = await self._get_unread_count()
        await self.send_json({'type': 'unread_count', 'count': count})
        logger.info(f'WebSocket connected: user={self.user.username} role={role}')

    async def disconnect(self, code):
        if self.user_group:
            await self.channel_layer.group_discard(self.user_group, self.channel_name)
        if self.role_group:
            await self.channel_layer.group_discard(self.role_group, self.channel_name)
        logger.info(f'WebSocket disconnected: user={getattr(self.user, "username", "anonymous")}')

    async def receive_json(self, content, **kwargs):
        """Handle incoming messages from the client (e.g., mark as read)."""
        msg_type = content.get('type')

        if msg_type == 'mark_read':
            notification_id = content.get('id')
            if notification_id:
                await self._mark_notification_read(notification_id)
                count = await self._get_unread_count()
                await self.send_json({'type': 'unread_count', 'count': count})

        elif msg_type == 'ping':
            await self.send_json({'type': 'pong'})

    async def notification_message(self, event):
        """Forward a notification to the connected client."""
        await self.send_json({
            'type': 'notification',
            'data': event['data'],
        })

    # ── Database helpers ──────────────────────────────────────────

    @database_sync_to_async
    def _get_user_role(self):
        try:
            return self.user.profile.role
        except Exception:
            return ''

    @database_sync_to_async
    def _get_unread_count(self):
        from .models import Notification
        from django.db.models import Q

        role = ''
        try:
            role = self.user.profile.role
        except Exception:
            pass

        return Notification.objects.filter(
            Q(recipient=self.user) | Q(role_target=role),
            is_read=False, is_archived=False,
        ).count()

    @database_sync_to_async
    def _mark_notification_read(self, notification_id):
        from .models import Notification
        from django.db.models import Q

        role = ''
        try:
            role = self.user.profile.role
        except Exception:
            pass

        Notification.objects.filter(
            Q(recipient=self.user) | Q(role_target=role),
            id=notification_id,
        ).update(is_read=True)
