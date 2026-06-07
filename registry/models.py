"""
Registry models: faculties, departments, congregation sessions, student records,
import batches, confirmation audit log, email delivery log.

Sessions are the primary organisational unit. Student records belong to exactly
one session. Public student confirmation is scoped to a session via a single-use
token sent to the student's institutional email.
"""

import secrets
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


# ─────────────────────────────────────────────────────────────────────────────
#  Reference data
# ─────────────────────────────────────────────────────────────────────────────

class Faculty(models.Model):
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(max_length=20, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Faculties'

    def __str__(self):
        return f"{self.name} ({self.code})"


class Department(models.Model):
    faculty = models.ForeignKey(
        Faculty, on_delete=models.PROTECT, related_name='departments'
    )
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        unique_together = [('faculty', 'code'), ('faculty', 'name')]

    def __str__(self):
        return f"{self.name} ({self.code})"


# ─────────────────────────────────────────────────────────────────────────────
#  Congregation (umbrella event)
# ─────────────────────────────────────────────────────────────────────────────

class Congregation(models.Model):
    """
    Institutional graduation event umbrella. Owns one or more sessions.

    Status is *derived* from child sessions (see ``CongregationService.get_status``)
    — not stored on this model.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    year = models.PositiveIntegerField(
        unique=True,
        help_text='Academic/calendar year of the congregation. Only one per year.',
    )
    description = models.CharField(max_length=500, blank=True)
    sourced_from_congregation = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='derived_congregations',
        help_text='Populated when this congregation was cloned from a previous year.',
    )
    sourced_from_template = models.ForeignKey(
        'CongregationTemplate', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='applied_congregations',
        help_text='Populated when this congregation was instantiated from a template.',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name='created_congregations',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-year']
        indexes = [models.Index(fields=['year'])]

    def __str__(self):
        return f"{self.name} ({self.year})"



# ─────────────────────────────────────────────────────────────────────────────
#  Congregation session
# ─────────────────────────────────────────────────────────────────────────────

class CongregationSession(models.Model):
    """
    A graduation/issuance event. The aggregate root for the registry pipeline.
    """

    SCOPE_INSTITUTION = 'INSTITUTION'
    SCOPE_FACULTY = 'FACULTY'
    SCOPE_DEPARTMENT = 'DEPARTMENT'
    SCOPE_CHOICES = [
        (SCOPE_INSTITUTION, 'Institution-wide'),
        (SCOPE_FACULTY, 'Faculty'),
        (SCOPE_DEPARTMENT, 'Department'),
    ]

    STATUS_DRAFT = 'DRAFT'
    STATUS_PUBLISHED = 'PUBLISHED'
    STATUS_CONFIRMATION_OPEN = 'CONFIRMATION_OPEN'
    STATUS_CONFIRMATION_CLOSED = 'CONFIRMATION_CLOSED'
    STATUS_ISSUANCE_IN_PROGRESS = 'ISSUANCE_IN_PROGRESS'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_ARCHIVED = 'ARCHIVED'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_PUBLISHED, 'Published'),
        (STATUS_CONFIRMATION_OPEN, 'Confirmation Open'),
        (STATUS_CONFIRMATION_CLOSED, 'Confirmation Closed'),
        (STATUS_ISSUANCE_IN_PROGRESS, 'Issuance In Progress'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_ARCHIVED, 'Archived'),
    ]

    # Linear forward-only transitions. CONFIRMATION_OPEN is optional and may be
    # skipped when no delayed-open is configured.
    ALLOWED_TRANSITIONS = {
        STATUS_DRAFT: {STATUS_PUBLISHED, STATUS_CONFIRMATION_OPEN},
        STATUS_PUBLISHED: {STATUS_CONFIRMATION_CLOSED},
        STATUS_CONFIRMATION_OPEN: {STATUS_PUBLISHED, STATUS_CONFIRMATION_CLOSED},
        STATUS_CONFIRMATION_CLOSED: {STATUS_ISSUANCE_IN_PROGRESS},
        STATUS_ISSUANCE_IN_PROGRESS: {STATUS_COMPLETED},
        STATUS_COMPLETED: {STATUS_ARCHIVED},
        STATUS_ARCHIVED: set(),
    }

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    congregation = models.ForeignKey(
        Congregation, on_delete=models.PROTECT, related_name='sessions',
        help_text='Parent congregation. Backfilled and made non-null by migrations 0002-0004.',
    )
    session_number = models.PositiveSmallIntegerField(
        default=1,
        help_text='Ordinal position of this session within its congregation.',
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    academic_year = models.CharField(max_length=20)

    scope_type = models.CharField(max_length=20, choices=SCOPE_CHOICES)
    faculty = models.ForeignKey(
        Faculty, on_delete=models.PROTECT, null=True, blank=True,
        related_name='sessions',
    )
    department = models.ForeignKey(
        Department, on_delete=models.PROTECT, null=True, blank=True,
        related_name='sessions',
    )

    status = models.CharField(
        max_length=30, choices=STATUS_CHOICES, default=STATUS_DRAFT
    )
    confirmation_deadline = models.DateTimeField()
    confirmation_opens_at = models.DateTimeField(
        null=True, blank=True,
        help_text='Optional delayed open. If null, confirmation opens at publish.',
    )

    # Deadline extension audit fields (Slice 2 wires the service that updates them).
    confirmation_deadline_original = models.DateTimeField(
        null=True, blank=True,
        help_text='Original confirmation deadline at creation. Never updated after first extension.',
    )
    confirmation_deadline_extended_at = models.DateTimeField(null=True, blank=True)
    confirmation_deadline_extended_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='extended_session_deadlines',
    )
    confirmation_deadline_extension_count = models.PositiveSmallIntegerField(default=0)

    certificate_template = models.ForeignKey(
        'templates.CertificateTemplate', on_delete=models.PROTECT,
        related_name='sessions',
    )

    issuance_instructions = models.TextField(
        blank=True,
        help_text='Per-session message included in the issuance notification email.',
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name='created_sessions',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    published_at = models.DateTimeField(null=True, blank=True)
    confirmation_closed_at = models.DateTimeField(null=True, blank=True)
    issuance_started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['academic_year']),
            models.Index(fields=['congregation']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['congregation', 'session_number'],
                name='registry_session_unique_number_per_congregation',
            ),
            models.UniqueConstraint(
                fields=['congregation', 'name'],
                name='registry_session_unique_name_per_congregation',
            ),
        ]

    @property
    def generated_name(self):
        ordinals = {
            1: 'First', 2: 'Second', 3: 'Third', 4: 'Fourth',
            5: 'Fifth', 6: 'Sixth', 7: 'Seventh', 8: 'Eighth',
            9: 'Ninth', 10: 'Tenth', 11: 'Eleventh', 12: 'Twelfth',
        }
        ordinal = ordinals.get(self.session_number, f'{self.session_number}th')
        return f'{ordinal} Session'

    def __str__(self):
        return f"{self.name} [{self.get_status_display()}]"

    def clean(self):
        if self.scope_type == self.SCOPE_FACULTY:
            if not self.faculty:
                raise ValidationError({'faculty': 'Faculty is required for faculty scope.'})
            if self.department:
                raise ValidationError({'department': 'Department must be empty for faculty scope.'})
        elif self.scope_type == self.SCOPE_DEPARTMENT:
            if not self.faculty or not self.department:
                raise ValidationError('Faculty and department are required for department scope.')
            if self.department.faculty_id != self.faculty_id:
                raise ValidationError({'department': 'Department must belong to the selected faculty.'})
        elif self.scope_type == self.SCOPE_INSTITUTION:
            if self.faculty or self.department:
                raise ValidationError('Faculty and department must be empty for institution scope.')
        if self.confirmation_deadline and self.confirmation_deadline <= timezone.now():
            # Only enforce on creation/draft. Updates may keep a past deadline.
            if not self.pk:
                raise ValidationError({'confirmation_deadline': 'Deadline must be in the future.'})

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(f"{self.academic_year}-{self.name}")[:240]
            slug = base
            i = 2
            while CongregationSession.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{i}"
                i += 1
            self.slug = slug
        super().save(*args, **kwargs)

    # ── Aggregated counts (computed via queries; cached here for hot reads) ──
    def counts(self):
        records = self.student_records.all()
        return {
            'total': records.count(),
            'pending': records.filter(confirmation_status=StudentRecord.CONF_PENDING).count(),
            'confirmed': records.filter(confirmation_status=StudentRecord.CONF_CONFIRMED).count(),
            'flagged': records.filter(confirmation_status=StudentRecord.CONF_FLAGGED).count(),
            'disputed': records.filter(confirmation_status=StudentRecord.CONF_DISPUTED).count(),
            'issued': records.filter(issuance_status=StudentRecord.ISSUE_ISSUED).count(),
            'issuance_failed': records.filter(issuance_status=StudentRecord.ISSUE_FAILED).count(),
        }


# ─────────────────────────────────────────────────────────────────────────────
#  Import batches
# ─────────────────────────────────────────────────────────────────────────────

class ImportBatch(models.Model):
    STATUS_PROCESSING = 'PROCESSING'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_COMPLETED_WITH_ERRORS = 'COMPLETED_WITH_ERRORS'
    STATUS_FAILED = 'FAILED'
    STATUS_CHOICES = [
        (STATUS_PROCESSING, 'Processing'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_COMPLETED_WITH_ERRORS, 'Completed With Errors'),
        (STATUS_FAILED, 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        CongregationSession, on_delete=models.CASCADE,
        related_name='import_batches',
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name='import_batches',
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    file_name = models.CharField(max_length=512)

    total_rows = models.PositiveIntegerField(default=0)
    success_count = models.PositiveIntegerField(default=0)
    skipped_count = models.PositiveIntegerField(default=0)
    error_count = models.PositiveIntegerField(default=0)

    status = models.CharField(
        max_length=30, choices=STATUS_CHOICES, default=STATUS_PROCESSING
    )
    error_log = models.JSONField(
        default=list, blank=True,
        help_text='List of {row, field, message} dicts.',
    )

    # Email delivery summary populated after publication of the parent session.
    email_summary = models.JSONField(
        default=dict, blank=True,
        help_text='{sent, failed, pending} counts captured post-publish.',
    )

    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"Batch {self.id} ({self.session_id}) - {self.status}"


# ─────────────────────────────────────────────────────────────────────────────
#  Student records
# ─────────────────────────────────────────────────────────────────────────────

class StudentRecord(models.Model):
    CONF_PENDING = 'PENDING'
    CONF_CONFIRMED = 'CONFIRMED'
    CONF_FLAGGED = 'FLAGGED'
    CONF_DISPUTED = 'DISPUTED'
    CONFIRMATION_CHOICES = [
        (CONF_PENDING, 'Pending'),
        (CONF_CONFIRMED, 'Confirmed'),
        (CONF_FLAGGED, 'Flagged'),
        (CONF_DISPUTED, 'Disputed'),
    ]

    DELIVERY_PENDING = 'PENDING'
    DELIVERY_SENT = 'SENT'
    DELIVERY_FAILED = 'FAILED'
    DELIVERY_BOUNCED = 'BOUNCED'
    DELIVERY_CHOICES = [
        (DELIVERY_PENDING, 'Pending'),
        (DELIVERY_SENT, 'Sent'),
        (DELIVERY_FAILED, 'Failed'),
        (DELIVERY_BOUNCED, 'Bounced'),
    ]

    ISSUE_NOT_ISSUED = 'NOT_ISSUED'
    ISSUE_QUEUED = 'QUEUED'
    ISSUE_ISSUED = 'ISSUED'
    ISSUE_FAILED = 'FAILED'
    ISSUANCE_CHOICES = [
        (ISSUE_NOT_ISSUED, 'Not Issued'),
        (ISSUE_QUEUED, 'Queued'),
        (ISSUE_ISSUED, 'Issued'),
        (ISSUE_FAILED, 'Failed'),
    ]

    GENDER_CHOICES = [
        ('MALE', 'Male'),
        ('FEMALE', 'Female'),
        ('OTHER', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        CongregationSession, on_delete=models.CASCADE,
        related_name='student_records',
    )
    congregation = models.ForeignKey(
        Congregation, on_delete=models.PROTECT,
        null=True, blank=True,
        related_name='student_records',
        help_text='Denormalised from session.congregation. Auto-set on save.',
    )
    import_batch = models.ForeignKey(
        ImportBatch, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='student_records',
    )
    last_issuance_batch = models.ForeignKey(
        'IssuanceBatch', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='records',
        help_text='Most recent issuance batch this record was included in.',
    )

    index_number = models.CharField(max_length=50)
    full_name = models.CharField(max_length=255)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True)
    institutional_email = models.EmailField()
    programme = models.CharField(max_length=255)
    class_of_degree = models.CharField(max_length=80)
    date_of_admission = models.DateField(null=True, blank=True)
    date_of_completion = models.DateField()
    faculty = models.ForeignKey(
        Faculty, on_delete=models.PROTECT, null=True, blank=True,
        related_name='student_records',
    )
    department = models.ForeignKey(
        Department, on_delete=models.PROTECT, null=True, blank=True,
        related_name='student_records',
    )
    extra_fields = models.JSONField(
        default=dict, blank=True,
        help_text='Template-specific fields keyed by name.',
    )

    # Confirmation state
    confirmation_status = models.CharField(
        max_length=20, choices=CONFIRMATION_CHOICES, default=CONF_PENDING
    )
    confirmation_token_hash = models.CharField(
        max_length=128, blank=True, db_index=True,
        help_text='SHA-256 of the plaintext token sent in the email.',
    )
    confirmation_token_expires_at = models.DateTimeField(null=True, blank=True)
    confirmation_email_sent_at = models.DateTimeField(null=True, blank=True)
    confirmation_email_status = models.CharField(
        max_length=20, choices=DELIVERY_CHOICES, default=DELIVERY_PENDING
    )
    confirmed_at = models.DateTimeField(null=True, blank=True)
    confirmation_ip = models.GenericIPAddressField(null=True, blank=True)

    dispute_note = models.TextField(blank=True)
    dispute_submitted_at = models.DateTimeField(null=True, blank=True)
    dispute_resolved_at = models.DateTimeField(null=True, blank=True)
    dispute_resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='disputes_resolved',
    )
    dispute_resolution_note = models.TextField(blank=True)

    # Issuance state
    issuance_status = models.CharField(
        max_length=20, choices=ISSUANCE_CHOICES, default=ISSUE_NOT_ISSUED
    )
    issued_at = models.DateTimeField(null=True, blank=True)
    issuance_error = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['index_number']
        unique_together = [('session', 'index_number')]
        indexes = [
            models.Index(fields=['session', 'confirmation_status']),
            models.Index(fields=['session', 'issuance_status']),
        ]

    def __str__(self):
        return f"{self.index_number} - {self.full_name}"

    def save(self, *args, **kwargs):
        # Keep the denormalised ``congregation`` FK in sync with the session's
        # congregation. The session FK is always set; the congregation FK on
        # the session may be null only for pre-migration legacy rows.
        if self.session_id and not self.congregation_id:
            self.congregation_id = self.session.congregation_id
        super().save(*args, **kwargs)


# ─────────────────────────────────────────────────────────────────────────────
#  Audit logs
# ─────────────────────────────────────────────────────────────────────────────

class ConfirmationAuditLog(models.Model):
    """
    Append-only log of student-facing confirmation events. Separated from the
    main system audit log because it records activity from unauthenticated users.
    """

    EVENT_CHOICES = [
        ('TOKEN_GENERATED', 'Token generated'),
        ('EMAIL_SENT', 'Confirmation email sent'),
        ('EMAIL_FAILED', 'Confirmation email delivery failed'),
        ('PAGE_VIEWED', 'Confirmation page viewed'),
        ('CONFIRMED', 'Confirmation submitted'),
        ('DISPUTED', 'Dispute submitted'),
        ('TOKEN_EXPIRED', 'Token expired'),
        ('RESEND_REQUESTED', 'Resend requested'),
        ('VALIDATION_FAILED', 'Token/index validation failed'),
        ('ANOMALOUS_IP', 'Anomalous IP flagged'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    student_record = models.ForeignKey(
        StudentRecord, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='audit_events',
    )
    session = models.ForeignKey(
        CongregationSession, on_delete=models.CASCADE,
        related_name='audit_events',
    )
    event_type = models.CharField(max_length=40, choices=EVENT_CHOICES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['session', 'event_type']),
            models.Index(fields=['student_record', 'timestamp']),
        ]


class EmailDeliveryLog(models.Model):
    """
    Tracks every outbound email sent to students.
    """

    TYPE_CONFIRMATION = 'CONFIRMATION'
    TYPE_CONFIRM_ACK = 'CONFIRMATION_ACK'
    TYPE_DISPUTE_ACK = 'DISPUTE_ACK'
    TYPE_RECORD_CORRECTED = 'RECORD_CORRECTED'
    TYPE_DISPUTE_REJECTED = 'DISPUTE_REJECTED'
    TYPE_ISSUANCE = 'ISSUANCE'
    TYPE_CHOICES = [
        (TYPE_CONFIRMATION, 'Confirmation URL'),
        (TYPE_CONFIRM_ACK, 'Confirmation acknowledgement'),
        (TYPE_DISPUTE_ACK, 'Dispute acknowledgement'),
        (TYPE_RECORD_CORRECTED, 'Record corrected re-confirmation'),
        (TYPE_DISPUTE_REJECTED, 'Dispute resolved without correction'),
        (TYPE_ISSUANCE, 'Certificate issued notification'),
    ]

    STATUS_QUEUED = 'QUEUED'
    STATUS_SENT = 'SENT'
    STATUS_DELIVERED = 'DELIVERED'
    STATUS_BOUNCED = 'BOUNCED'
    STATUS_FAILED = 'FAILED'
    STATUS_CHOICES = [
        (STATUS_QUEUED, 'Queued'),
        (STATUS_SENT, 'Sent'),
        (STATUS_DELIVERED, 'Delivered'),
        (STATUS_BOUNCED, 'Bounced'),
        (STATUS_FAILED, 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student_record = models.ForeignKey(
        StudentRecord, on_delete=models.CASCADE, related_name='email_logs',
    )
    session = models.ForeignKey(
        CongregationSession, on_delete=models.CASCADE, related_name='email_logs',
    )
    email_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    recipient = models.EmailField()
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_QUEUED
    )
    provider_message_id = models.CharField(max_length=255, blank=True)
    error_message = models.TextField(blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['session', 'email_type', 'status']),
            models.Index(fields=['student_record', 'email_type']),
        ]


# ─────────────────────────────────────────────────────────────────────────────
#  Status transition log
# ─────────────────────────────────────────────────────────────────────────────

class SessionStatusTransition(models.Model):
    """Records each session status transition for audit."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        CongregationSession, on_delete=models.CASCADE, related_name='transitions',
    )
    from_status = models.CharField(max_length=30)
    to_status = models.CharField(max_length=30)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
    )
    note = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']


# ─────────────────────────────────────────────────────────────────────────────
#  Deadline extension log (Slice 2)
# ─────────────────────────────────────────────────────────────────────────────

class IssuanceBatch(models.Model):
    """A filtered run of certificate issuance within one session.

    Replaces the "issue everything confirmed in one shot" model: each batch
    captures the filter that was applied, the totals, and the actor — so
    admins can run multiple batches (e.g. by faculty, or to retry failures)
    while preserving a full audit trail.
    """

    STATUS_QUEUED = 'QUEUED'
    STATUS_IN_PROGRESS = 'IN_PROGRESS'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_PARTIAL = 'PARTIAL'      # finished, but some records failed
    STATUS_FAILED = 'FAILED'        # finished, every record failed
    STATUS_CHOICES = [
        (STATUS_QUEUED, 'Queued'),
        (STATUS_IN_PROGRESS, 'In progress'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_PARTIAL, 'Partial'),
        (STATUS_FAILED, 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        CongregationSession, on_delete=models.CASCADE,
        related_name='issuance_batches',
    )
    # Denormalised mirror of session.congregation for cross-session reporting.
    congregation = models.ForeignKey(
        Congregation, on_delete=models.PROTECT,
        related_name='issuance_batches',
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_QUEUED,
    )
    # Captured filter expression. Free-form JSON so the API can evolve without
    # a schema migration; the service applies it via ``apply_batch_filters``.
    filter_criteria = models.JSONField(default=dict, blank=True)
    notes = models.CharField(max_length=500, blank=True)

    total_targeted = models.PositiveIntegerField(default=0)
    succeeded_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name='issuance_batches_requested',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['session', '-created_at']),
            models.Index(fields=['congregation', '-created_at']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f'Batch {self.id} ({self.status})'


class DeadlineExtensionLog(models.Model):
    """One row per confirmation-deadline extension. Append-only audit trail."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        CongregationSession, on_delete=models.CASCADE,
        related_name='deadline_extensions',
    )
    # Denormalised for congregation-level audit queries (mirrors session.congregation).
    congregation = models.ForeignKey(
        Congregation, on_delete=models.PROTECT,
        related_name='deadline_extensions',
    )
    previous_deadline = models.DateTimeField()
    new_deadline = models.DateTimeField()
    extended_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='deadline_extension_logs',
    )
    extended_at = models.DateTimeField(auto_now_add=True)
    reason = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ['-extended_at']
        indexes = [
            models.Index(fields=['session', '-extended_at']),
            models.Index(fields=['congregation', '-extended_at']),
        ]

    def __str__(self):
        return (
            f'Extension on {self.session_id}: '
            f'{self.previous_deadline:%Y-%m-%d} → {self.new_deadline:%Y-%m-%d}'
        )


# ─────────────────────────────────────────────────────────────────────────────
#  Congregation templates (Slice 4)
# ─────────────────────────────────────────────────────────────────────────────

class CongregationTemplate(models.Model):
    """Reusable session-creation scaffold for a congregation.

    A template captures the *shape* of a congregation (how many sessions,
    their scope, day offsets from the ceremony month, and confirmation
    window length) so each year's congregation can be instantiated with
    one click rather than rebuilt by hand.

    Templates are versioned by name+is_active rather than by revision number
    — older inactive templates are kept for audit but hidden from the picker.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    description = models.CharField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True)

    sourced_from_congregation = models.ForeignKey(
        Congregation, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='derived_templates',
        help_text='Populated when this template was snapshotted from a congregation.',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name='created_congregation_templates',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['is_active'])]

    def __str__(self):
        return self.name


class CongregationTemplateSessionDef(models.Model):
    """One session blueprint inside a CongregationTemplate."""

    SCOPE_INSTITUTION = CongregationSession.SCOPE_INSTITUTION
    SCOPE_FACULTY = CongregationSession.SCOPE_FACULTY
    SCOPE_DEPARTMENT = CongregationSession.SCOPE_DEPARTMENT
    SCOPE_CHOICES = CongregationSession.SCOPE_CHOICES

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(
        CongregationTemplate, on_delete=models.CASCADE,
        related_name='session_defs',
    )
    session_number = models.PositiveSmallIntegerField()
    name_pattern = models.CharField(
        max_length=255,
        help_text=(
            "Used to derive the session's name when applied. "
            "Supports placeholders: {year}, {n} (session number)."
        ),
    )
    scope_type = models.CharField(max_length=20, choices=SCOPE_CHOICES)
    # Offset (days) from the congregation's ceremony_month (day 1) to this
    # session's ceremony_start_date. Allow negative — some sessions precede the
    # nominal congregation month start by a few days.
    ceremony_day_offset = models.IntegerField(
        help_text='Days from congregation.ceremony_month (day 1) to ceremony_start_date.',
    )
    # How many days *before* the ceremony_start_date the confirmation deadline
    # should fall. e.g. 7 means "deadline = ceremony_start_date - 7 days, 23:59 UTC".
    confirmation_window_days = models.PositiveSmallIntegerField(
        default=14,
        help_text='Days before ceremony_start_date that the confirmation deadline lands.',
    )
    issuance_instructions = models.TextField(blank=True)

    # Optional bindings — letting the template pre-fill these saves clicks.
    default_faculty = models.ForeignKey(
        Faculty, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+',
    )
    default_department = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+',
    )
    default_certificate_template = models.ForeignKey(
        'templates.CertificateTemplate', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='+',
    )

    class Meta:
        ordering = ['session_number']
        constraints = [
            models.UniqueConstraint(
                fields=['template', 'session_number'],
                name='registry_tmpl_unique_session_number',
            ),
        ]

    def __str__(self):
        return f'{self.template.name} · session {self.session_number}'
