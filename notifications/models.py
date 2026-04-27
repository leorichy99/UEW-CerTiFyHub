import uuid
from django.db import models
from django.contrib.auth.models import User


class Notification(models.Model):
    PRIORITY_CHOICES = [
        ('info', 'Info'),
        ('success', 'Success'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
    ]
    CHANNEL_CHOICES = [
        ('in_app', 'In-App'),
        ('email', 'Email'),
        ('sms', 'SMS'),
    ]
    TYPE_CHOICES = [
        ('certificate_issued', 'Certificate Issued'),
        ('bulk_issuance_complete', 'Bulk Issuance Complete'),
        ('certificate_revoked', 'Certificate Revoked'),
        ('certificate_reactivated', 'Certificate Reactivated'),
        ('blockchain_confirmed', 'Blockchain Confirmed'),
        ('blockchain_failed', 'Blockchain Failed'),
        ('template_updated', 'Template Updated'),
        ('template_locked', 'Template Locked'),
        ('student_activated', 'Student Activated'),
        ('admin_created', 'Admin Created'),
        ('verification_attempt', 'Verification Attempt'),
        ('suspicious_verification', 'Suspicious Verification'),
        ('reissue_request', 'Reissue Request'),
        ('employer_verification_saved', 'Employer Verification Saved'),
        ('config_changed', 'Configuration Changed'),
        ('new_device_login', 'New Device Login'),
        ('password_reset', 'Password Reset'),
        ('system', 'System'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True, blank=True,
        related_name='notifications',
        help_text='Direct recipient. Null for role-based broadcasts.',
    )
    role_target = models.CharField(
        max_length=20, blank=True, default='',
        help_text='Broadcast to all users with this role (e.g. SUPER_ADMIN).',
    )
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True, default='')
    notification_type = models.CharField(max_length=50, choices=TYPE_CHOICES, default='system')
    related_object_id = models.CharField(max_length=255, blank=True, default='')
    related_object_type = models.CharField(max_length=100, blank=True, default='')
    is_read = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='info')
    delivery_channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default='in_app')
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read', '-created_at']),
            models.Index(fields=['role_target', '-created_at']),
            models.Index(fields=['notification_type', '-created_at']),
        ]

    def __str__(self):
        target = self.recipient.username if self.recipient else f'role:{self.role_target}'
        return f'[{self.priority}] {self.title} → {target}'


class NotificationPreference(models.Model):
    DIGEST_CHOICES = [
        ('realtime', 'Real-time'),
        ('daily_digest', 'Daily Digest'),
        ('critical_only', 'Critical Only'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    digest_mode = models.CharField(max_length=20, choices=DIGEST_CHOICES, default='realtime')
    email_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=False)
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)

    def __str__(self):
        return f'{self.user.username} — {self.digest_mode}'
