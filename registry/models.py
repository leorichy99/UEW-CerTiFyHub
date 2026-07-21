"""
Registry models: faculties, departments, issuance batches, student records,
import batches, confirmation audit log, email delivery log.

An ``IssuanceBatch`` is the primary organisational unit and the aggregate root
for the registry pipeline. It is self-contained: it owns its own student
records, its own confirmation deadline and status, and produces its own
certificates. There is no parent container and no ceiling on how many batches
may be created. Student records belong to exactly one batch. Public student
confirmation is scoped to a batch via a single-use token sent to the student's
institutional email.
"""

import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


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
#  Issuance batch (self-contained pipeline container)
# ─────────────────────────────────────────────────────────────────────────────

class IssuanceBatch(models.Model):
    """
    A self-contained container for a set of student records moving through the
    confirmation and certificate-generation pipeline.

    A batch holds its own student records, its own confirmation deadline, its
    own status, and produces its own certificates. Batches are grouped by
    ``year`` for archival and reporting. There is no parent container required
    to create one, and no limit on how many may exist.
    """

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
    name = models.CharField(max_length=255)
    reference_name = models.CharField(
        max_length=32, unique=True, blank=True,
        help_text='Human-friendly reference, auto-generated as BATCH-{year}-{NNNN}.',
    )
    year = models.PositiveIntegerField(
        blank=True,
        help_text='Calendar year this batch belongs to, for archival/reporting grouping. Auto-populated from confirmation_deadline if omitted.',
    )

    status = models.CharField(
        max_length=30, choices=STATUS_CHOICES, default=STATUS_DRAFT
    )
    confirmation_deadline = models.DateTimeField()
    confirmation_opens_at = models.DateTimeField(
        null=True, blank=True,
        help_text='Optional delayed open. If null, confirmation opens at publish.',
    )

    # Deadline extension audit fields.
    confirmation_deadline_original = models.DateTimeField(
        null=True, blank=True,
        help_text='Original confirmation deadline at creation. Never updated after first extension.',
    )
    confirmation_deadline_extended_at = models.DateTimeField(null=True, blank=True)
    confirmation_deadline_extended_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='extended_batch_deadlines',
    )
    confirmation_deadline_extension_count = models.PositiveSmallIntegerField(default=0)

    certificate_template = models.ForeignKey(
        'templates.CertificateTemplate', on_delete=models.PROTECT,
        related_name='issuance_batches',
    )

    issuance_instructions = models.TextField(
        blank=True,
        help_text='Per-batch message included in the issuance notification email.',
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name='created_batches',
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
            models.Index(fields=['year']),
        ]

    def __str__(self):
        return f"{self.name} [{self.get_status_display()}]"

    def clean(self):
        if self.confirmation_deadline and self.confirmation_deadline <= timezone.now():
            # Only enforce on creation/draft. Updates may keep a past deadline.
            if not self.pk:
                raise ValidationError({'confirmation_deadline': 'Deadline must be in the future.'})

    def save(self, *args, **kwargs):
        if not self.year and self.confirmation_deadline:
            self.year = self.confirmation_deadline.year
        if not self.reference_name and self.year:
            self.reference_name = self._generate_reference_name(self.year)
        super().save(*args, **kwargs)

    @staticmethod
    def _generate_reference_name(year):
        """Return the next BATCH-{year}-{NNNN} reference for the given year."""
        prefix = f'BATCH-{year}-'
        last = (
            IssuanceBatch.objects
            .filter(reference_name__startswith=prefix)
            .order_by('-reference_name')
            .values_list('reference_name', flat=True)
            .first()
        )
        next_seq = 1
        if last:
            try:
                next_seq = int(last.rsplit('-', 1)[1]) + 1
            except (ValueError, IndexError):
                next_seq = 1
        return f'{prefix}{next_seq:04d}'

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
    batch = models.ForeignKey(
        IssuanceBatch, on_delete=models.CASCADE,
        related_name='import_batches',
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name='import_batches',
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    file_name = models.CharField(max_length=512)
    original_file_name = models.CharField(max_length=512, blank=True, default="")

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

    # Email delivery summary populated after publication of the parent batch.
    email_summary = models.JSONField(
        default=dict, blank=True,
        help_text='{sent, failed, pending} counts captured post-publish.',
    )

    completed_at = models.DateTimeField(null=True, blank=True)

    mapping_configuration = models.JSONField(
        null=True, blank=True,
        help_text='Column-to-field mapping used for this import.',
    )

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"Import {self.id} ({self.batch_id}) - {self.status}"


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
    batch = models.ForeignKey(
        IssuanceBatch, on_delete=models.CASCADE,
        related_name='student_records',
    )
    import_batch = models.ForeignKey(
        ImportBatch, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='student_records',
    )
    last_issuance_run = models.ForeignKey(
        'IssuanceRun', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='records',
        help_text='Most recent issuance run this record was included in.',
    )

    index_number = models.CharField(max_length=50)
    first_name = models.CharField(max_length=100, blank=True)
    middle_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    name_order = models.JSONField(default=list, blank=True)
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
    # Free-text faculty / department captured directly from the uploaded file.
    # These do not require pre-created Faculty/Department reference entities and
    # are what issuance-run filtering matches against.
    faculty_name = models.CharField(max_length=200, blank=True, db_index=True)
    department_name = models.CharField(max_length=200, blank=True, db_index=True)
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
        unique_together = [('batch', 'index_number')]
        indexes = [
            models.Index(fields=['batch', 'confirmation_status']),
            models.Index(fields=['batch', 'issuance_status']),
        ]

    @property
    def full_name(self):
        """Assemble full_name from components in the stored order."""
        components = {
            'first_name': self.first_name or '',
            'middle_name': self.middle_name or '',
            'last_name': self.last_name or '',
        }
        if self.name_order:
            parts = [components[k] for k in self.name_order if components.get(k)]
        else:
            parts = [components['first_name'], components['middle_name'], components['last_name']]
        return ' '.join(filter(None, parts))

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.index_number} - {self.full_name}"


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
    batch = models.ForeignKey(
        IssuanceBatch, on_delete=models.CASCADE,
        related_name='audit_events',
    )
    event_type = models.CharField(max_length=40, choices=EVENT_CHOICES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['batch', 'event_type']),
            models.Index(fields=['student_record', 'timestamp']),
        ]


class DisputeAttachment(models.Model):
    """
    Stores uploaded files (ID proof, etc.) submitted with student disputes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    record = models.ForeignKey(
        StudentRecord, on_delete=models.CASCADE,
        related_name='dispute_attachments',
    )
    file = models.FileField(upload_to='dispute_proofs/')
    file_type = models.CharField(max_length=50)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.record.index_number} - {self.file.name}"


class Dispute(models.Model):
    """
    Represents a student dispute against their record data.
    Disputes are typed (name, programme, class of degree, other) and
    store the student's claimed values for resolution by registry staff.
    """
    NAME_INCORRECT = 'name_incorrect'
    PROGRAMME_INCORRECT = 'programme_incorrect'
    CLASS_OF_DEGREE_INCORRECT = 'class_of_degree_incorrect'
    OTHER = 'other'

    DISPUTE_TYPE_CHOICES = [
        (NAME_INCORRECT, 'Name is incorrect'),
        (PROGRAMME_INCORRECT, 'Programme is incorrect'),
        (CLASS_OF_DEGREE_INCORRECT, 'Class of degree is incorrect'),
        (OTHER, 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student_record = models.ForeignKey(
        StudentRecord, on_delete=models.CASCADE,
        related_name='disputes',
    )
    dispute_type = models.CharField(
        max_length=30, choices=DISPUTE_TYPE_CHOICES,
        help_text='Type of dispute being raised'
    )

    # Claimed values for name disputes
    claimed_first_name = models.CharField(max_length=100, null=True, blank=True)
    claimed_middle_name = models.CharField(max_length=100, null=True, blank=True)
    claimed_last_name = models.CharField(max_length=100, null=True, blank=True)

    # Claimed value for programme/class of degree disputes
    claimed_value = models.CharField(max_length=500, null=True, blank=True)

    # Free text note (required for OTHER, optional for structured types)
    dispute_note = models.TextField(blank=True)

    # Supporting document (required for name disputes)
    supporting_document = models.FileField(
        upload_to='dispute_documents/',
        null=True, blank=True,
        help_text='ID proof document for name disputes'
    )
    supporting_document_filename = models.CharField(
        max_length=255, null=True, blank=True,
        help_text='Original filename for display'
    )

    # Status tracking
    is_pending = models.BooleanField(default=True, help_text='True until resolved')
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='resolved_disputes',
    )
    resolution_note = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['student_record', 'is_pending']),
            models.Index(fields=['dispute_type', 'is_pending']),
        ]

    def __str__(self):
        return f"{self.student_record.index_number} - {self.get_dispute_type_display()}"


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
    batch = models.ForeignKey(
        IssuanceBatch, on_delete=models.CASCADE, related_name='email_logs',
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
            models.Index(fields=['batch', 'email_type', 'status']),
            models.Index(fields=['student_record', 'email_type']),
        ]


# ─────────────────────────────────────────────────────────────────────────────
#  Status transition log
# ─────────────────────────────────────────────────────────────────────────────

class BatchStatusTransition(models.Model):
    """Records each batch status transition for audit."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch = models.ForeignKey(
        IssuanceBatch, on_delete=models.CASCADE, related_name='transitions',
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
#  Issuance runs (filtered certificate-generation runs within a batch)
# ─────────────────────────────────────────────────────────────────────────────

class IssuanceRun(models.Model):
    """A filtered run of certificate issuance within one batch.

    Each run captures the filter that was applied, the totals, and the actor —
    so admins can run multiple runs (e.g. by faculty, or to retry failures)
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
    batch = models.ForeignKey(
        IssuanceBatch, on_delete=models.CASCADE,
        related_name='issuance_runs',
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
        related_name='issuance_runs_requested',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['batch', '-created_at']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f'Run {self.id} ({self.status})'


# ─────────────────────────────────────────────────────────────────────────────
#  Deadline extension log
# ─────────────────────────────────────────────────────────────────────────────

class DeadlineExtensionLog(models.Model):
    """One row per confirmation-deadline extension. Append-only audit trail."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch = models.ForeignKey(
        IssuanceBatch, on_delete=models.CASCADE,
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
            models.Index(fields=['batch', '-extended_at']),
        ]

    def __str__(self):
        return (
            f'Extension on {self.batch_id}: '
            f'{self.previous_deadline:%Y-%m-%d} → {self.new_deadline:%Y-%m-%d}'
        )
