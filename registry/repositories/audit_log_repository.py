"""Repositories for ConfirmationAuditLog and EmailDeliveryLog."""

from registry.models import ConfirmationAuditLog, EmailDeliveryLog


class ConfirmationAuditLogRepository:
    def log(self, *, session, event_type, student_record=None,
            ip_address=None, user_agent='', metadata=None):
        return ConfirmationAuditLog.objects.create(
            session=session,
            event_type=event_type,
            student_record=student_record,
            ip_address=ip_address,
            user_agent=user_agent or '',
            metadata=metadata or {},
        )

    def for_session(self, session_id):
        return ConfirmationAuditLog.objects.filter(session_id=session_id)

    def for_record(self, record_id):
        return ConfirmationAuditLog.objects.filter(student_record_id=record_id)


class EmailDeliveryLogRepository:
    def log_queued(self, *, student_record, session, email_type, recipient):
        return EmailDeliveryLog.objects.create(
            student_record=student_record, session=session,
            email_type=email_type, recipient=recipient,
            status=EmailDeliveryLog.STATUS_QUEUED,
        )

    def mark_sent(self, log_id, *, provider_message_id=''):
        from django.utils import timezone
        EmailDeliveryLog.objects.filter(pk=log_id).update(
            status=EmailDeliveryLog.STATUS_SENT,
            provider_message_id=provider_message_id,
            sent_at=timezone.now(),
        )

    def mark_failed(self, log_id, *, error_message=''):
        EmailDeliveryLog.objects.filter(pk=log_id).update(
            status=EmailDeliveryLog.STATUS_FAILED,
            error_message=error_message or '',
        )

    def for_session(self, session_id):
        return EmailDeliveryLog.objects.filter(session_id=session_id)
