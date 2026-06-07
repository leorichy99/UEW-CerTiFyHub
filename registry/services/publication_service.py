"""
Session publication service.

Publishing a Draft session:
  - Validates that the session has at least one StudentRecord.
  - Transitions the session to PUBLISHED (or CONFIRMATION_OPEN if
    `confirmation_opens_at` is in the past or null).
  - Generates a single-use confirmation token per record (raw token returned
    only inline, hash persisted).
  - Queues a confirmation email per record (writes EmailDeliveryLog rows).

In Slice 3 email "sending" is synchronous and best-effort via Django's
`send_mail`. Slice 6 will move dispatch to Celery.
"""

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from registry.models import (
    CongregationSession, StudentRecord, EmailDeliveryLog,
    ConfirmationAuditLog,
)
from registry.services.session_lifecycle_service import (
    SessionLifecycleService, SessionLifecycleError,
)
from registry.services.token_service import (
    generate_token, hash_token, default_expiry,
)


class PublicationError(Exception):
    pass


class PublicationService:
    def __init__(self, lifecycle=None):
        self.lifecycle = lifecycle or SessionLifecycleService()

    @transaction.atomic
    def publish(self, session, *, actor):
        if session.status != CongregationSession.STATUS_DRAFT:
            raise PublicationError('Only Draft sessions can be published.')

        record_qs = StudentRecord.objects.select_for_update().filter(session=session)
        total = record_qs.count()
        if total == 0:
            raise PublicationError(
                'Cannot publish a session with no student records.'
            )

        self.lifecycle.transition(
            session, CongregationSession.STATUS_PUBLISHED, actor=actor,
            note=f'Published with {total} record(s).',
        )

        from registry.tasks import send_confirmation_invitation

        queued = []
        for record in record_qs:
            raw_token = generate_token()
            record.confirmation_token_hash = hash_token(raw_token)
            record.confirmation_token_expires_at = default_expiry(
                session.confirmation_deadline
            )
            record.save(update_fields=[
                'confirmation_token_hash', 'confirmation_token_expires_at',
            ])
            ConfirmationAuditLog.objects.create(
                session=session, student_record=record,
                event_type='TOKEN_GENERATED',
            )
            queued.append((record.id, raw_token))

        # Hand each record off to the Celery worker. In dev (no Redis)
        # CELERY_TASK_ALWAYS_EAGER runs them inline, preserving the old
        # synchronous semantics for tests.
        for record_id, raw_token in queued:
            send_confirmation_invitation.delay(str(record_id), raw_token)

        # Re-read counts now that the eager-mode tasks have run.
        record_qs_after = StudentRecord.objects.filter(session=session)
        sent = record_qs_after.filter(
            confirmation_email_status=StudentRecord.DELIVERY_SENT
        ).count()
        failed = record_qs_after.filter(
            confirmation_email_status=StudentRecord.DELIVERY_FAILED
        ).count()
        result = {'total': total, 'sent': sent, 'failed': failed, 'queued': len(queued)}
        from registry.services import notifier
        notifier.session_published(session, sent=sent, failed=failed, total=total)
        return result

    # ── Email dispatch ───────────────────────────────────────────────────

    def _dispatch_invitation(self, session, record, raw_token):
        confirm_url = self._build_confirmation_url(session, record, raw_token)
        subject = f"Confirm your details for {session.name}"
        body = (
            f"Dear {record.full_name},\n\n"
            f"Please confirm your details for the upcoming congregation "
            f"({session.name}) by visiting the link below. The link is "
            f"unique to you and expires on "
            f"{session.confirmation_deadline:%Y-%m-%d}.\n\n"
            f"{confirm_url}\n\n"
            f"If anything is incorrect, you can raise a dispute on the same "
            f"page.\n\n"
            f"— UEW CerTiFyHub"
        )

        log = EmailDeliveryLog.objects.create(
            student_record=record, session=session,
            email_type=EmailDeliveryLog.TYPE_CONFIRMATION,
            recipient=record.institutional_email,
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
            record.confirmation_email_status = StudentRecord.DELIVERY_SENT
            record.confirmation_email_sent_at = timezone.now()
            record.save(update_fields=[
                'confirmation_email_status', 'confirmation_email_sent_at',
            ])
            ConfirmationAuditLog.objects.create(
                session=session, student_record=record,
                event_type='EMAIL_SENT',
            )
            return True
        except Exception as e:  # noqa: BLE001 — broad on purpose
            log.status = EmailDeliveryLog.STATUS_FAILED
            log.error_message = str(e)[:1000]
            log.save(update_fields=['status', 'error_message'])
            record.confirmation_email_status = StudentRecord.DELIVERY_FAILED
            record.save(update_fields=['confirmation_email_status'])
            ConfirmationAuditLog.objects.create(
                session=session, student_record=record,
                event_type='EMAIL_FAILED',
                metadata={'error': str(e)[:500]},
            )
            return False

    @staticmethod
    def _build_confirmation_url(session, record, raw_token):
        base = getattr(settings, 'FRONTEND_BASE_URL', '').rstrip('/')
        if not base:
            base = 'http://localhost:5173'
        return f"{base}/confirm/{raw_token}?ix={record.index_number}"
