from django.contrib import admin
from .models import Notification, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'recipient', 'role_target', 'notification_type', 'priority', 'is_read', 'created_at')
    list_filter = ('notification_type', 'priority', 'is_read', 'is_archived')
    search_fields = ('title', 'message', 'recipient__username')
    readonly_fields = ('id', 'created_at')


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'digest_mode', 'email_enabled', 'sms_enabled')
    list_filter = ('digest_mode', 'email_enabled')
