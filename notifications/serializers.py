from rest_framework import serializers
from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    recipient_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'recipient_name', 'role_target',
            'title', 'message', 'notification_type',
            'related_object_id', 'related_object_type',
            'is_read', 'is_archived', 'priority',
            'delivery_channel', 'metadata', 'created_at',
        ]
        read_only_fields = fields

    def get_recipient_name(self, obj):
        if obj.recipient:
            return obj.recipient.get_full_name() or obj.recipient.username
        return None


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ['digest_mode', 'email_enabled', 'sms_enabled',
                  'quiet_hours_start', 'quiet_hours_end']
