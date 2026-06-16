"""
Email delivery aggregation, failure listing, and resend service.
"""

from django.db.models import Count, OuterRef, Subquery, Case, When, Value, IntegerField, Q
from django.utils import timezone

from registry.models import (
    IssuanceBatch, StudentRecord, EmailDeliveryLog, ConfirmationAuditLog,
)
from registry.services.token_service import generate_token, hash_token, default_expiry


class DeliveryError(Exception):
    pass


class MaxResendError(Exception):
    pass


class EmailDeliveryService:
    def get_summary(self, batch):
        """
        Aggregate delivery status counts for a batch.
        Counts reflect the *latest* CONFIRMATION log per student record.
        """
        latest_log = (
            EmailDeliveryLog.objects
            .filter(student_record=OuterRef('pk'), email_type=EmailDeliveryLog.TYPE_CONFIRMATION)
            .order_by('-created_at')
            .values('status')[:1]
        )

        records = StudentRecord.objects.filter(batch=batch).annotate(
            latest_status=Subquery(latest_log)
        )

        # Raw counts per latest status
        qs = records.values('latest_status').annotate(count=Count('id'))
        counts_map = {row['latest_status']: row['count'] for row in qs}

        total = records.count()
        queued = counts_map.get(EmailDeliveryLog.STATUS_QUEUED, 0)
        sent = counts_map.get(EmailDeliveryLog.STATUS_SENT, 0)
        delivered = counts_map.get(EmailDeliveryLog.STATUS_DELIVERED, 0)
        failed = counts_map.get(EmailDeliveryLog.STATUS_FAILED, 0)
        bounced = counts_map.get(EmailDeliveryLog.STATUS_BOUNCED, 0)
        terminal = sent + delivered + failed + bounced

        return {
            'total': total,
            'queued': queued,
            'sent': sent,
            'delivered': delivered,
            'failed': failed,
            'bounced': bounced,
            'terminal_count': terminal,
            'completion_percentage': round((terminal / total) * 100) if total else 0,
        }

    def list_failures(self, batch, status_filter=None):
        """
        Records whose latest CONFIRMATION log is FAILED or BOUNCED.
        Returns list of dicts with record info + latest log + resend metadata.
        """
        latest_log = (
            EmailDeliveryLog.objects
            .filter(student_record=OuterRef('pk'), email_type=EmailDeliveryLog.TYPE_CONFIRMATION)
            .order_by('-created_at')
            .values('status')[:1]
        )

        qs = (
            StudentRecord.objects
            .filter(batch=batch)
            .annotate(latest_status=Subquery(latest_log))
            .filter(
                Q(latest_status=EmailDeliveryLog.STATUS_FAILED)
                | Q(latest_status=EmailDeliveryLog.STATUS_BOUNCED)
            )
            .select_related('batch')
            .order_by('-updated_at')
        )

        if status_filter in (EmailDeliveryLog.STATUS_FAILED, EmailDeliveryLog.STATUS_BOUNCED):
            qs = qs.filter(latest_status=status_filter)

        # Pre-compute resend counts for all records in this batch to avoid N+1
        log_counts = (
            EmailDeliveryLog.objects
            .filter(batch=batch, email_type=EmailDeliveryLog.TYPE_CONFIRMATION)
            .values('student_record')
            .annotate(attempts=Count('id'))
        )
        attempts_map = {row['student_record']: row['attempts'] for row in log_counts}

        results = []
        for record in qs:
            attempts = attempts_map.get(record.id, 0)
            # Fetch the latest log for reason + timestamp
            latest = (
                EmailDeliveryLog.objects
                .filter(student_record=record, email_type=EmailDeliveryLog.TYPE_CONFIRMATION)
                .order_by('-created_at')
                .first()
            )
            results.append({
                'record_id': str(record.id),
                'student_name': record.full_name,
                'index_number': record.index_number,
                'institutional_email': record.institutional_email,
                'status': record.latest_status,
                'failure_reason': (latest.error_message or '')[:500] if latest else '',
                'last_attempt': latest.created_at.isoformat() if latest else None,
                'resend_attempts': attempts,
                'can_resend': attempts < 3,
            })
        return results

    def resend_one(self, batch, record, actor):
        """
        Resend a confirmation email to a single student record.
        """
        if batch.status not in {
            IssuanceBatch.STATUS_PUBLISHED,
            IssuanceBatch.STATUS_CONFIRMATION_OPEN,
        }:
            raise DeliveryError(
                'Resend is only available while confirmation is open.'
            )

        if record.confirmation_status not in {
            StudentRecord.CONF_PENDING,
            StudentRecord.CONF_FLAGGED,
        }:
            raise DeliveryError(
                'This record has already been actioned (confirmed or disputed).'
            )

        attempt_count = EmailDeliveryLog.objects.filter(
            student_record=record,
            email_type=EmailDeliveryLog.TYPE_CONFIRMATION,
        ).count()
        if attempt_count >= 3:
            raise MaxResendError(
                'Maximum resend attempts reached for this student. '
                'Contact the registry to correct the email address manually.'
            )

        # Generate fresh token
        raw_token = generate_token()
        record.confirmation_token_hash = hash_token(raw_token)
        record.confirmation_token_expires_at = default_expiry(batch.confirmation_deadline)
        record.save(update_fields=[
            'confirmation_token_hash', 'confirmation_token_expires_at',
        ])

        # Dispatch (reuses the existing invitation logic)
        from registry.services.publication_service import PublicationService
        PublicationService()._dispatch_invitation(batch, record, raw_token)

        ConfirmationAuditLog.objects.create(
            batch=batch, student_record=record,
            event_type='RESEND_REQUESTED',
            metadata={'by': getattr(actor, 'id', None)},
        )
        return True

    def resend_failed(self, batch, actor):
        """
        Bulk resend to all eligible failed/bounced records.
        """
        failures = self.list_failures(batch)
        queued = 0
        skipped_max = 0
        skipped_confirmed = 0

        for item in failures:
            record = StudentRecord.objects.filter(pk=item['record_id']).first()
            if not record:
                continue
            if not item['can_resend']:
                skipped_max += 1
                continue
            try:
                self.resend_one(batch, record, actor)
                queued += 1
            except DeliveryError:
                skipped_confirmed += 1

        return {
            'queued_for_resend': queued,
            'skipped_max_attempts': skipped_max,
            'skipped_already_confirmed': skipped_confirmed,
        }
