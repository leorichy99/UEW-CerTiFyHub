from django.db import models
from django.contrib.auth.models import User


class AuditLog(models.Model):
    CATEGORY_CHOICES = [
        ('admin', 'Admin Activity'),
        ('security', 'Security'),
        ('login', 'Login Attempt'),
        ('verification', 'Verification'),
        ('provisioning', 'Account Provisioning'),
        ('permissions', 'Permission Changes'),
        ('credentials', 'Credential Events'),
        ('export', 'Data Export'),
    ]
    STATUS_CHOICES = [
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('warning', 'Warning'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    username = models.CharField(max_length=150, blank=True, default='')
    action = models.CharField(max_length=255)
    target = models.CharField(max_length=500, blank=True, default='')
    details = models.TextField(blank=True, default='')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='success')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='admin')
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    # ── Tamper-evident hash chain ────────────────────────────────────
    event_type = models.CharField(
        max_length=50, blank=True, default='',
        help_text="Structured event code, e.g. authorisation.logged, account.created",
    )
    letter_reference = models.CharField(
        max_length=50, blank=True, default='',
        help_text="Authorisation letter reference number for traceability",
    )
    previous_hash = models.CharField(
        max_length=64, blank=True, default='',
        help_text="SHA-256 hash of the previous audit log entry",
    )
    entry_hash = models.CharField(
        max_length=64, blank=True, default='',
        help_text="SHA-256 hash of this entry (content + previous_hash)",
    )

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['category', '-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['event_type', '-timestamp']),
        ]

    def __str__(self):
        return f"[{self.category}] {self.username}: {self.action} ({self.timestamp})"
