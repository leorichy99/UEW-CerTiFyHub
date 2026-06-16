"""
Batch publication service.

Publishing a Draft batch:
  - Validates that the batch has at least one StudentRecord.
  - Transitions the batch to PUBLISHED (or CONFIRMATION_OPEN if
    `confirmation_opens_at` is in the past or null).
  - Generates a single-use confirmation token per record (raw token returned
    only inline, hash persisted).
  - Queues a confirmation email per record (writes EmailDeliveryLog rows).
"""

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from celery import chord

from registry.models import (
    IssuanceBatch, StudentRecord, EmailDeliveryLog,
    ConfirmationAuditLog,
)
from registry.services.batch_lifecycle_service import (
    BatchLifecycleService, BatchLifecycleError,
)
from registry.services.token_service import (
    generate_token, hash_token, default_expiry,
)


class PublicationError(Exception):
    pass


class PublicationService:
    def __init__(self, lifecycle=None):
        self.lifecycle = lifecycle or BatchLifecycleService()

    @transaction.atomic
    def publish(self, batch, *, actor):
        if batch.status != IssuanceBatch.STATUS_DRAFT:
            raise PublicationError('Only Draft batches can be published.')

        record_qs = StudentRecord.objects.select_for_update().filter(batch=batch)
        total = record_qs.count()
        if total == 0:
            raise PublicationError(
                'Cannot publish a batch with no student records.'
            )

        self.lifecycle.transition(
            batch, IssuanceBatch.STATUS_PUBLISHED, actor=actor,
            note=f'Published with {total} record(s).',
        )

        from registry.tasks import send_confirmation_invitation, on_batch_emails_complete

        queued = []
        for record in record_qs:
            raw_token = generate_token()
            record.confirmation_token_hash = hash_token(raw_token)
            record.confirmation_token_expires_at = default_expiry(
                batch.confirmation_deadline
            )
            record.save(update_fields=[
                'confirmation_token_hash', 'confirmation_token_expires_at',
            ])
            ConfirmationAuditLog.objects.create(
                batch=batch, student_record=record,
                event_type='TOKEN_GENERATED',
            )
            queued.append((str(record.id), raw_token))

        # Fire all tasks as a chord so the callback runs once everything settles.
        # In eager mode (dev without Redis) this still runs inline, but the
        # callback reads real DB counts rather than the pre-send zeroes.
        task_group = [
            send_confirmation_invitation.s(record_id, raw_token)
            for record_id, raw_token in queued
        ]
        callback = on_batch_emails_complete.s(str(batch.id), str(actor.id) if actor else None)
        chord(task_group, callback).apply_async()

        result = {'total': total, 'sent': 0, 'failed': 0, 'queued': len(queued)}
        from registry.services import notifier
        notifier.batch_published(batch, sent=0, failed=0, total=total)
        return result

    # ── Email dispatch ───────────────────────────────────────────────────

    def _dispatch_invitation(self, batch, record, raw_token):
        from registry.services.email_renderer import render_email

        confirm_url = self._build_confirmation_url(batch, record, raw_token)
        subject = f"Confirm your details for {batch.name}"
        subject, html_body, plain_body = render_email(
            'emails/confirmation_invitation.html',
            {
                'subject': subject,
                'student_name': record.full_name,
                'batch_name': batch.name,
                'confirmation_deadline': batch.confirmation_deadline.strftime('%Y-%m-%d %H:%M'),
                'confirmation_link': confirm_url,
            },
        )

        log = EmailDeliveryLog.objects.create(
            student_record=record, batch=batch,
            email_type=EmailDeliveryLog.TYPE_CONFIRMATION,
            recipient=record.institutional_email,
            status=EmailDeliveryLog.STATUS_QUEUED,
        )

        from registry.services.delivery_events import (
            publish_delivery_progress, publish_delivery_failure,
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
            record.confirmation_email_status = StudentRecord.DELIVERY_SENT
            record.confirmation_email_sent_at = timezone.now()
            record.save(update_fields=[
                'confirmation_email_status', 'confirmation_email_sent_at',
            ])
            ConfirmationAuditLog.objects.create(
                batch=batch, student_record=record,
                event_type='EMAIL_SENT',
            )
            publish_delivery_progress(str(batch.id))
            return True
        except Exception as e:  # noqa: BLE001 — broad on purpose
            log.status = EmailDeliveryLog.STATUS_FAILED
            log.error_message = str(e)[:1000]
            log.save(update_fields=['status', 'error_message'])
            record.confirmation_email_status = StudentRecord.DELIVERY_FAILED
            record.save(update_fields=['confirmation_email_status'])
            ConfirmationAuditLog.objects.create(
                batch=batch, student_record=record,
                event_type='EMAIL_FAILED',
                metadata={'error': str(e)[:500]},
            )
            publish_delivery_progress(str(batch.id))
            publish_delivery_failure(record, log)
            return False

    @staticmethod
    def _build_confirmation_url(batch, record, raw_token):
        base = getattr(settings, 'FRONTEND_BASE_URL', '').rstrip('/')
        if not base:
            base = 'http://localhost:5173'
        return f"{base}/confirm/{raw_token}?ix={record.index_number}"
