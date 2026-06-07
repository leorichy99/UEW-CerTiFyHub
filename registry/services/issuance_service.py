"""
Certificate issuance engine.

Walks confirmed StudentRecords and produces real Certificate rows.

State flow (all enforced by SessionLifecycleService):

    PUBLISHED ── close_confirmation() ──▶ CONFIRMATION_CLOSED
        └── still-PENDING records auto-flag to FLAGGED.
    CONFIRMATION_CLOSED ── start_issuance() ──▶ ISSUANCE_IN_PROGRESS
        └── each CONFIRMED record produces a Certificate (sync).
    ISSUANCE_IN_PROGRESS ── complete() ──▶ COMPLETED
        └── only when every CONFIRMED record is ISSUED or FAILED.

Slice 5 runs all of this synchronously. Slice 6 moves the per-record
loop into a Celery task without changing the public service contract.
"""

import re

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from registry.models import (
    CongregationSession, StudentRecord, EmailDeliveryLog,
)
from registry.services.session_lifecycle_service import SessionLifecycleService
from certificates.models import Certificate


# Loose mapping from free-text "class of degree" to Certificate.honors choices.
_HONORS_PATTERNS = [
    (re.compile(r'first', re.I), 'FIRST'),
    (re.compile(r'second.*upper|upper', re.I), 'SECOND_UPPER'),
    (re.compile(r'second.*lower|lower', re.I), 'SECOND_LOWER'),
    (re.compile(r'third', re.I), 'THIRD'),
    (re.compile(r'pass', re.I), 'PASS'),
]


def _map_honors(class_of_degree: str) -> str:
    for pattern, value in _HONORS_PATTERNS:
        if pattern.search(class_of_degree or ''):
            return value
    return 'PASS'


# Loose mapping from programme to a Certificate.degree_type code.
_DEGREE_PATTERNS = [
    (re.compile(r'\bM\.?Phil\b', re.I), 'MPHIL'),
    (re.compile(r'\bMBA\b', re.I), 'MBA'),
    (re.compile(r'\bM\.?Ed\b|Master of Education', re.I), 'MED'),
    (re.compile(r'\bM\.?Sc\b|Master of Science', re.I), 'MSC'),
    (re.compile(r'\bMA\b|Master of Arts', re.I), 'MA'),
    (re.compile(r'\bPhD|Doctor', re.I), 'PHD'),
    (re.compile(r'\bBBA\b|Business Administration', re.I), 'BBA'),
    (re.compile(r'\bB\.?Ed\b|Bachelor of Education', re.I), 'BED'),
    (re.compile(r'\bBA\b|Bachelor of Arts', re.I), 'BA'),
    (re.compile(r'\bBSc\b|Bachelor of Science', re.I), 'BSC'),
]


def _map_degree_type(programme: str) -> str:
    for pattern, value in _DEGREE_PATTERNS:
        if pattern.search(programme or ''):
            return value
    return 'BSC'


class IssuanceError(Exception):
    pass


class IssuanceService:
    def __init__(self, lifecycle=None):
        self.lifecycle = lifecycle or SessionLifecycleService()

    # ── Stage 1: close confirmation ──────────────────────────────────────

    @transaction.atomic
    def close_confirmation(self, session, *, actor):
        """Transition to CONFIRMATION_CLOSED and flag any still-pending records."""
        if session.status not in {
            CongregationSession.STATUS_PUBLISHED,
            CongregationSession.STATUS_CONFIRMATION_OPEN,
        }:
            raise IssuanceError(
                'Confirmation can only be closed from PUBLISHED or '
                'CONFIRMATION_OPEN.'
            )
        flagged = (
            StudentRecord.objects
            .filter(session=session, confirmation_status=StudentRecord.CONF_PENDING)
            .update(confirmation_status=StudentRecord.CONF_FLAGGED)
        )
        self.lifecycle.transition(
            session, CongregationSession.STATUS_CONFIRMATION_CLOSED,
            actor=actor,
            note=f'{flagged} record(s) auto-flagged for non-response.',
        )
        from registry.services import notifier
        notifier.confirmation_closed(session, flagged=flagged)
        return {'flagged': flagged}

    # ── Stage 2: start issuance ──────────────────────────────────────────

    def start_issuance(self, session, *, actor):
        """Backwards-compatible: issue everything confirmed in one unfiltered batch.

        Since Slice 3 this delegates to ``IssuanceBatchService``. The legacy
        return shape (``queued``/``issued``/``failed``) is preserved so the
        old REST endpoint and tests keep working unchanged.
        """
        # Imported lazily to avoid a circular import — batch service imports us.
        from registry.services.issuance_batch_service import IssuanceBatchService

        batch, result = IssuanceBatchService(lifecycle=self.lifecycle, issuance=self).create_and_run(
            session=session,
            requested_by=actor,
            filter_criteria={},
            notes='Legacy start_issuance call (unfiltered).',
        )
        return {
            'queued': batch.total_targeted,
            'issued': result['succeeded'],
            'failed': result['failed'],
            'batch_id': str(batch.id),
        }

    # ── Stage 3: complete ────────────────────────────────────────────────

    @transaction.atomic
    def complete(self, session, *, actor):
        if session.status != CongregationSession.STATUS_ISSUANCE_IN_PROGRESS:
            raise IssuanceError(
                'A session can only be completed from ISSUANCE_IN_PROGRESS.'
            )
        outstanding = StudentRecord.objects.filter(
            session=session,
            confirmation_status=StudentRecord.CONF_CONFIRMED,
            issuance_status__in=[
                StudentRecord.ISSUE_NOT_ISSUED, StudentRecord.ISSUE_QUEUED,
            ],
        ).count()
        if outstanding:
            raise IssuanceError(
                f'{outstanding} confirmed record(s) still pending issuance.'
            )
        self.lifecycle.transition(
            session, CongregationSession.STATUS_COMPLETED, actor=actor,
        )
        return session

    # ── Per-record issuance ──────────────────────────────────────────────

    @transaction.atomic
    def _issue_one(self, record, *, actor):
        try:
            cert = Certificate.objects.create(
                student_record=record,
                template=record.session.certificate_template,
                student_name=record.full_name,
                degree_type=_map_degree_type(record.programme),
                honors=_map_honors(record.class_of_degree),
                program=record.programme,
                date_awarded=timezone.now().date(),
                created_by=actor,
            )
            record.issuance_status = StudentRecord.ISSUE_ISSUED
            record.issued_at = timezone.now()
            record.issuance_error = ''
            record.save(update_fields=[
                'issuance_status', 'issued_at', 'issuance_error',
            ])
            self._email_issuance(record, cert)
            return True
        except Exception as e:  # noqa: BLE001
            StudentRecord.objects.filter(pk=record.pk).update(
                issuance_status=StudentRecord.ISSUE_FAILED,
                issuance_error=str(e)[:1000],
            )
            return False

    def _email_issuance(self, record, cert):
        body = (
            f"Dear {record.full_name},\n\n"
            f"Your certificate from {record.session.name} has been issued. "
            f"Certificate number: {cert.certificate_number}.\n\n"
            f"You will be able to download it from your account or via the "
            f"verification portal.\n\n— UEW CerTiFyHub"
        )
        log = EmailDeliveryLog.objects.create(
            student_record=record, session=record.session,
            email_type=EmailDeliveryLog.TYPE_ISSUANCE,
            recipient=record.institutional_email,
            status=EmailDeliveryLog.STATUS_QUEUED,
        )
        try:
            send_mail(
                subject=f"Your certificate has been issued — {record.session.name}",
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[record.institutional_email],
                fail_silently=False,
            )
            log.status = EmailDeliveryLog.STATUS_SENT
            log.sent_at = timezone.now()
            log.save(update_fields=['status', 'sent_at'])
        except Exception as e:  # noqa: BLE001
            log.status = EmailDeliveryLog.STATUS_FAILED
            log.error_message = str(e)[:1000]
            log.save(update_fields=['status', 'error_message'])
