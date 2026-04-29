from django.db import models
from django.contrib.auth.models import User
import uuid
import hashlib
from datetime import timedelta
from django.utils import timezone
from .permission_constants import build_default_permissions


# ─── Authorisation Reference ────────────────────────────────────────────
# Logged by Super Admin BEFORE any account is created. Links every account
# to the physical system access request letter that authorised it.

class AuthorisationReference(models.Model):
    PURPOSE_CHOICES = [
        ('provision', 'Account Provisioning'),
        ('permission_change', 'Permission Change'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('used', 'Used'),
        ('cancelled', 'Cancelled'),
    ]

    reference_number = models.CharField(
        max_length=50, unique=True,
        help_text="Format: CERT-YYYY-STAFFID (e.g. CERT-2025-AB1234)",
    )
    requester_name = models.CharField(max_length=255, help_text="Full legal name from letter")
    requester_staff_id = models.CharField(max_length=50, help_text="Institutional staff ID")
    authorising_head_name = models.CharField(max_length=255)
    authorising_head_title = models.CharField(max_length=255)
    authorising_head_department = models.CharField(max_length=255)
    approval_date = models.DateField(help_text="Date the head in charge signed the letter")
    intake_date = models.DateField(auto_now_add=True, help_text="Date Super Admin logged this")
    scanned_letter = models.FileField(
        upload_to='authorisation_letters/', blank=True, null=True,
        help_text="Scanned copy of the approved letter",
    )
    purpose = models.CharField(
        max_length=30, choices=PURPOSE_CHOICES, default='provision',
        help_text="What this authorisation letter is for",
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='pending',
    )
    linked_account = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='authorisation_references',
        help_text="Account this reference was used for",
    )
    logged_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='logged_authorisations',
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['purpose']),
            models.Index(fields=['requester_staff_id']),
        ]

    def __str__(self):
        return f"{self.reference_number} — {self.requester_name} ({self.status})"


# ─── User Profile ───────────────────────────────────────────────────────

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('SUPER_ADMIN', 'Super Administrator'),
        ('ADMIN', 'Administrator'),
        ('STUDENT', 'Student'),
        ('EMPLOYER', 'Employer/Verifier'),
    ]

    ACCOUNT_TYPE_CHOICES = [
        ('STAFF', 'Staff'),
        ('EXTERNAL_COLLABORATOR', 'External Collaborator'),
    ]

    ACCESS_DURATION_CHOICES = [
        ('permanent', 'Permanent'),
        ('time_limited', 'Time-limited'),
    ]

    CREDENTIAL_STATUS_CHOICES = [
        ('none', 'None'),
        ('delivered', 'Credential Delivered'),
        ('completed', 'First Login Completed'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='ADMIN')
    phone_number = models.CharField(max_length=20, blank=True)
    organization = models.CharField(max_length=255, blank=True, help_text="For Employers")

    # ── New provisioning fields ──────────────────────────────────────
    staff_id = models.CharField(
        max_length=50, blank=True, unique=True, null=True,
        help_text="Institutional staff ID",
    )
    department = models.CharField(max_length=255, blank=True)
    account_type = models.CharField(
        max_length=30, choices=ACCOUNT_TYPE_CHOICES, default='STAFF',
    )
    access_duration = models.CharField(
        max_length=20, choices=ACCESS_DURATION_CHOICES, default='permanent',
    )
    access_end_date = models.DateField(
        null=True, blank=True,
        help_text="Required if access_duration is time_limited",
    )
    letter_reference = models.ForeignKey(
        AuthorisationReference, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='provisioned_profiles',
        help_text="Primary authorisation letter reference",
    )

    # ── Granular permissions ─────────────────────────────────────────
    permissions = models.JSONField(
        default=build_default_permissions,
        help_text="Granular permission flags — all default to false",
    )
    permission_history = models.JSONField(
        default=list, blank=True,
        help_text="Chronological list of permission change records",
    )

    # ── Credential / first-login tracking ────────────────────────────
    is_legacy = models.BooleanField(
        default=False,
        help_text="True for accounts that existed before the provisioning system",
    )
    first_login_completed = models.BooleanField(default=False)
    credential_token_hash = models.CharField(max_length=64, blank=True)
    credential_expires_at = models.DateTimeField(null=True, blank=True)
    credential_status = models.CharField(
        max_length=20, choices=CREDENTIAL_STATUS_CHOICES, default='none',
    )

    class Meta:
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['staff_id']),
            models.Index(fields=['credential_status']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.role}"

    def has_permission(self, perm_key):
        """Check if this profile has a specific permission enabled."""
        # Super Admins bypass all permission checks
        if self.role == 'SUPER_ADMIN' or self.user.is_superuser:
            return True
        return self.permissions.get(perm_key, False)

    def is_access_expired(self):
        """Check if a time-limited account has passed its end date."""
        if self.access_duration != 'time_limited' or not self.access_end_date:
            return False
        return self.access_end_date < timezone.now().date()


# ─── Login Attempt Tracker ──────────────────────────────────────────────

class LoginAttemptTracker(models.Model):
    email_hash = models.CharField(
        max_length=64, unique=True,
        help_text="SHA-256 hash of the email for privacy",
    )
    attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    lockout_count_24h = models.IntegerField(default=0)
    last_lockout_reset = models.DateTimeField(auto_now_add=True)
    last_attempt_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"LoginTracker {self.email_hash[:12]}… attempts={self.attempts}"

    @staticmethod
    def hash_email(email):
        return hashlib.sha256(email.lower().strip().encode('utf-8')).hexdigest()

    def is_locked(self):
        if self.locked_until and self.locked_until > timezone.now():
            return True
        return False

    def is_permanently_locked(self):
        """Locked until SA manually unlocks (3+ lockouts in 24h)."""
        if self.lockout_count_24h >= 3 and self.is_locked():
            return True
        return False

    def record_failed_attempt(self):
        self.attempts += 1
        if self.attempts >= 5:
            # Reset 24h counter if more than 24h since last reset
            if (timezone.now() - self.last_lockout_reset).total_seconds() > 86400:
                self.lockout_count_24h = 0
                self.last_lockout_reset = timezone.now()

            self.lockout_count_24h += 1
            if self.lockout_count_24h >= 3:
                # Permanent lock — SA must unlock
                self.locked_until = timezone.now() + timedelta(days=365 * 10)
            else:
                # 15-minute lock
                self.locked_until = timezone.now() + timedelta(minutes=15)
            self.attempts = 0
        self.save()

    def record_successful_login(self):
        self.attempts = 0
        self.locked_until = None
        self.save()

    def unlock(self):
        self.attempts = 0
        self.locked_until = None
        self.lockout_count_24h = 0
        self.last_lockout_reset = timezone.now()
        self.save()


# ─── Super Admin Deactivation Request ───────────────────────────────────
# Two-person authorisation: one SA initiates, another confirms.

class SuperAdminDeactivationRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Confirmation'),
        ('confirmed', 'Confirmed'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
    ]

    target_account = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='deactivation_requests',
    )
    initiated_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='initiated_deactivations',
    )
    confirmed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='confirmed_deactivations',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reason = models.TextField()
    confirmation_token_hash = models.CharField(max_length=64, blank=True)
    confirmation_token_expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"SA Deactivation: {self.target_account.username} by {self.initiated_by.username} ({self.status})"

    def is_expired(self):
        if self.confirmation_token_expires_at:
            return self.confirmation_token_expires_at < timezone.now()
        return False


# ─── Password Reset Token (kept as-is) ──────────────────────────────────

class PasswordResetToken(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='password_reset_token')
    token = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.IntegerField(default=0)
    
    def __str__(self):
        return f"Reset token for {self.user.username}"
    
    def is_expired(self):
        return self.expires_at < timezone.now()


# ─── Admin Invitation (DEPRECATED — kept for migration history) ─────────

class AdminInvitation(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('EXPIRED', 'Expired'),
        ('REVOKED', 'Revoked'),
    ]
    
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=UserProfile.ROLE_CHOICES)
    # Store a SHA-256 hash of the token instead of the raw token for security
    token_hash = models.CharField(max_length=64, unique=True, editable=False)
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    message = models.TextField(blank=True, help_text="Optional message to include in invitation email")
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"[DEPRECATED] Invitation for {self.email} ({self.role})"
    
    def is_expired(self):
        return self.expires_at < timezone.now()
    
    def is_valid(self):
        return self.status == 'PENDING' and not self.is_expired()
