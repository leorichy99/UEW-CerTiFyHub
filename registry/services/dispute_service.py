"""
Dispute resolution service.

A disputed record can be resolved one of two ways:

  * **Correct** — admin edits the record's fields. The record is moved back
    to PENDING, a fresh confirmation token is generated, and a
    "record-corrected" invitation email is dispatched. The student must
    re-confirm.

  * **Reject** — admin keeps the record as-is. The record is moved to
    CONFIRMED with the resolution note. A "dispute rejected" notification
    email is sent.

Both paths record the resolving admin, timestamp, and an audit event.
"""

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from registry.models import (
    CongregationSession, StudentRecord, EmailDeliveryLog, ConfirmationAuditLog,
)
from registry.services.token_service import (
    generate_token, hash_token, default_expiry,
)


CORRECTABLE_FIELDS = {
    'index_number', 'full_name', 'gender', 'institutional_email',
    'programme', 'class_of_degree', 'date_of_admission',
    'date_of_completion', 'extra_fields',
}


class DisputeResolutionError(Exception):
    pass


class DisputeService:
    def list_disputes(self, session):
        return (
            StudentRecord.objects
            .filter(session=session, confirmation_status=StudentRecord.CONF_DISPUTED)
            .select_related('faculty', 'department')
            .order_by('dispute_submitted_at')
        )

    @transaction.atomic
    def correct(self, record, *, actor, corrections: dict, resolution_note: str = ''):
        self._guard(record)
        self._apply_corrections(record, corrections)

        raw_token = generate_token()
        record.confirmation_token_hash = hash_token(raw_token)
        record.confirmation_token_expires_at = default_expiry(
            record.session.confirmation_deadline,
        )
        record.confirmation_status = StudentRecord.CONF_PENDING
        record.confirmation_email_status = StudentRecord.DELIVERY_PENDING
        record.dispute_resolved_at = timezone.now()
        record.dispute_resolved_by = actor
        record.dispute_resolution_note = (resolution_note or '').strip()[:2000]
        record.save()

        self._email_correction(record, raw_token)
        ConfirmationAuditLog.objects.create(
            session=record.session, student_record=record,
            event_type='TOKEN_GENERATED',
            metadata={'reason': 'dispute_corrected', 'by': actor.id if actor else None},
        )
        return record

    @transaction.atomic
    def reject(self, record, *, actor, resolution_note: str):
        if not resolution_note or not resolution_note.strip():
            raise DisputeResolutionError(
                'A resolution note is required when rejecting a dispute.'
            )
        self._guard(record)

        record.confirmation_status = StudentRecord.CONF_CONFIRMED
        record.confirmed_at = timezone.now()
        record.dispute_resolved_at = timezone.now()
        record.dispute_resolved_by = actor
        record.dispute_resolution_note = resolution_note.strip()[:2000]
        record.save(update_fields=[
            'confirmation_status', 'confirmed_at',
            'dispute_resolved_at', 'dispute_resolved_by',
            'dispute_resolution_note',
        ])

        self._email_rejection(record)
        ConfirmationAuditLog.objects.create(
            session=record.session, student_record=record,
            event_type='CONFIRMED',
            metadata={'reason': 'dispute_rejected', 'by': actor.id if actor else None},
        )
        return record

    # ── Internals ────────────────────────────────────────────────────────

    def _guard(self, record):
        if record.confirmation_status != StudentRecord.CONF_DISPUTED:
            raise DisputeResolutionError(
                'Only records in DISPUTED status can be resolved.'
            )
        if record.session.status not in {
            CongregationSession.STATUS_PUBLISHED,
            CongregationSession.STATUS_CONFIRMATION_OPEN,
            CongregationSession.STATUS_CONFIRMATION_CLOSED,
        }:
            raise DisputeResolutionError(
                'Disputes can only be resolved while the session is in a '
                'confirmation phase.'
            )

    def _apply_corrections(self, record, corrections: dict):
        unknown = [k for k in corrections if k not in CORRECTABLE_FIELDS]
        if unknown:
            raise DisputeResolutionError(
                f"Fields not allowed to be corrected: {', '.join(unknown)}"
            )
        for k, v in corrections.items():
            setattr(record, k, v)

    def _email_correction(self, record, raw_token):
        url = self._confirmation_url(record, raw_token)
        body = (
            f"Dear {record.full_name},\n\n"
            f"Your record for {record.session.name} has been updated based on "
            f"your dispute. Please review and re-confirm your details using "
            f"the link below:\n\n{url}\n\n— UEW CerTiFyHub"
        )
        self._send(record, EmailDeliveryLog.TYPE_RECORD_CORRECTED,
                   subject='Your record has been updated — please re-confirm',
                   body=body)

    def _email_rejection(self, record):
        body = (
            f"Dear {record.full_name},\n\n"
            f"Following review by the registrar's office, your record for "
            f"{record.session.name} will stand as previously shown.\n\n"
            f"Resolution note from the registrar:\n"
            f"  {record.dispute_resolution_note}\n\n"
            f"If you believe this is in error, please contact your faculty "
            f"office directly.\n\n— UEW CerTiFyHub"
        )
        self._send(record, EmailDeliveryLog.TYPE_DISPUTE_REJECTED,
                   subject='Update on your record dispute',
                   body=body)

    def _send(self, record, email_type, *, subject, body):
        log = EmailDeliveryLog.objects.create(
            student_record=record, session=record.session,
            email_type=email_type, recipient=record.institutional_email,
            status=EmailDeliveryLog.STATUS_QUEUED,
        )
        try:
            send_mail(
                subject=subject, message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[record.institutional_email],
                fail_silently=False,
            )
            log.status = EmailDeliveryLog.STATUS_SENT
            log.sent_at = timezone.now()
            log.save(update_fields=['status', 'sent_at'])
            return True
        except Exception as e:  # noqa: BLE001
            log.status = EmailDeliveryLog.STATUS_FAILED
            log.error_message = str(e)[:1000]
            log.save(update_fields=['status', 'error_message'])
            return False

    @staticmethod
    def _confirmation_url(record, raw_token):
        base = getattr(settings, 'FRONTEND_BASE_URL', '').rstrip('/') \
               or 'http://localhost:5173'
        return f"{base}/confirm/{raw_token}?ix={record.index_number}"
