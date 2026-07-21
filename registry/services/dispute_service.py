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
    IssuanceBatch, StudentRecord, EmailDeliveryLog, ConfirmationAuditLog,
    Dispute,
)
from registry.services.token_service import (
    generate_token, hash_token, default_expiry,
)


CORRECTABLE_FIELDS = {
    'index_number', 'first_name', 'middle_name', 'last_name', 'gender',
    'institutional_email', 'programme', 'class_of_degree', 'date_of_admission',
    'date_of_completion', 'extra_fields',
}


class DisputeResolutionError(Exception):
    pass


class DisputeService:
    def list_disputes(self, batch):
        return (
            StudentRecord.objects
            .filter(batch=batch, confirmation_status=StudentRecord.CONF_DISPUTED)
            .select_related('faculty', 'department')
            .prefetch_related('disputes')
            .order_by('-disputes__created_at')
        )

    @transaction.atomic
    def correct(self, record, *, actor, corrections: dict, resolution_note: str = ''):
        self._guard(record)
        self._apply_corrections(record, corrections)

        # Get pending dispute and mark it as resolved
        dispute = record.disputes.filter(is_pending=True).first()
        if dispute:
            dispute.is_pending = False
            dispute.resolved_at = timezone.now()
            dispute.resolved_by = actor
            dispute.resolution_note = (resolution_note or '').strip()[:2000]
            dispute.save()

        raw_token = generate_token()
        record.confirmation_token_hash = hash_token(raw_token)
        record.confirmation_token_expires_at = default_expiry(
            record.batch.confirmation_deadline,
        )
        record.confirmation_status = StudentRecord.CONF_PENDING
        record.confirmation_email_status = StudentRecord.DELIVERY_PENDING
        record.save()

        self._email_correction(record, raw_token)
        ConfirmationAuditLog.objects.create(
            batch=record.batch, student_record=record,
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

        # Get pending dispute and mark it as resolved
        dispute = record.disputes.filter(is_pending=True).first()
        if dispute:
            dispute.is_pending = False
            dispute.resolved_at = timezone.now()
            dispute.resolved_by = actor
            dispute.resolution_note = resolution_note.strip()[:2000]
            dispute.save()

        record.confirmation_status = StudentRecord.CONF_CONFIRMED
        record.confirmed_at = timezone.now()
        record.save(update_fields=[
            'confirmation_status', 'confirmed_at',
        ])

        self._email_rejection(record)
        ConfirmationAuditLog.objects.create(
            batch=record.batch, student_record=record,
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
        if record.batch.status not in {
            IssuanceBatch.STATUS_PUBLISHED,
            IssuanceBatch.STATUS_CONFIRMATION_OPEN,
            IssuanceBatch.STATUS_CONFIRMATION_CLOSED,
        }:
            raise DisputeResolutionError(
                'Disputes can only be resolved while the batch is in a '
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
        from registry.services.email_renderer import render_email

        url = self._confirmation_url(record, raw_token)
        subject = 'Your record has been updated — please re-confirm'
        subject, html_body, plain_body = render_email(
            'emails/record_corrected.html',
            {
                'subject': subject,
                'student_name': record.full_name,
                'batch_name': record.batch.name,
                'confirmation_link': url,
            },
        )
        self._send_html(record, EmailDeliveryLog.TYPE_RECORD_CORRECTED,
                        subject=subject, html_body=html_body, plain_body=plain_body)

    def _email_rejection(self, record):
        from registry.services.email_renderer import render_email

        subject = 'Update on your record dispute'
        subject, html_body, plain_body = render_email(
            'emails/dispute_rejected.html',
            {
                'subject': subject,
                'student_name': record.full_name,
                'batch_name': record.batch.name,
                'resolution_note': record.dispute_resolution_note,
            },
        )
        self._send_html(record, EmailDeliveryLog.TYPE_DISPUTE_REJECTED,
                        subject=subject, html_body=html_body, plain_body=plain_body)

    def _send(self, record, email_type, *, subject, body):
        log = EmailDeliveryLog.objects.create(
            student_record=record, batch=record.batch,
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

    def _send_html(self, record, email_type, *, subject, html_body, plain_body):
        log = EmailDeliveryLog.objects.create(
            student_record=record, batch=record.batch,
            email_type=email_type, recipient=record.institutional_email,
            status=EmailDeliveryLog.STATUS_QUEUED,
        )
        try:
            send_mail(
                subject=subject, message=plain_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[record.institutional_email],
                html_message=html_body,
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
