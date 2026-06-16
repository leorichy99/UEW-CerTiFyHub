"""
Public confirmation service.

Resolves a (token, index_number) pair to a StudentRecord and records
confirmation, dispute, or token-validation-failure events.
"""

from django.db import transaction
from django.utils import timezone

from registry.models import (
    IssuanceBatch, StudentRecord, ConfirmationAuditLog,
)
from registry.services.token_service import hash_token


class TokenInvalid(Exception):
    """The supplied (token, index) pair did not match any record."""


class TokenExpired(Exception):
    """The token matched a record but is past its expiry timestamp."""


class BatchNotAccepting(Exception):
    """The batch is not in a status that accepts public actions."""


ACTIVE_STATUSES = {
    IssuanceBatch.STATUS_PUBLISHED,
    IssuanceBatch.STATUS_CONFIRMATION_OPEN,
}


class ConfirmationService:

    def resolve(self, raw_token: str, index_number: str, *,
                ip=None, user_agent=''):
        """Look up the record matching the (token, index) pair."""
        digest = hash_token(raw_token)
        record = (
            StudentRecord.objects
            .select_related('batch', 'faculty', 'department')
            .filter(
                confirmation_token_hash=digest,
                index_number=index_number,
            )
            .first()
        )
        if not record:
            self._log_validation_failure(
                batch=None, index_number=index_number, ip=ip,
                user_agent=user_agent, reason='no_match',
            )
            raise TokenInvalid('Confirmation link is invalid.')

        if record.batch.status not in ACTIVE_STATUSES:
            raise BatchNotAccepting(
                'This confirmation page is no longer accepting submissions.'
            )

        if record.confirmation_token_expires_at and \
                record.confirmation_token_expires_at < timezone.now():
            ConfirmationAuditLog.objects.create(
                batch=record.batch, student_record=record,
                event_type='TOKEN_EXPIRED',
                ip_address=ip, user_agent=user_agent[:512] if user_agent else '',
            )
            raise TokenExpired('Your confirmation link has expired.')

        ConfirmationAuditLog.objects.create(
            batch=record.batch, student_record=record,
            event_type='PAGE_VIEWED',
            ip_address=ip, user_agent=user_agent[:512] if user_agent else '',
        )
        return record

    @transaction.atomic
    def confirm(self, record, *, ip=None, user_agent=''):
        record.confirmation_status = StudentRecord.CONF_CONFIRMED
        record.confirmed_at = timezone.now()
        record.confirmation_ip = ip
        record.save(update_fields=[
            'confirmation_status', 'confirmed_at', 'confirmation_ip',
        ])
        ConfirmationAuditLog.objects.create(
            batch=record.batch, student_record=record,
            event_type='CONFIRMED',
            ip_address=ip, user_agent=user_agent[:512] if user_agent else '',
        )
        return record

    @transaction.atomic
    def dispute(self, record, *, note: str, ip=None, user_agent=''):
        if not note or not note.strip():
            raise ValueError('Dispute note is required.')
        record.confirmation_status = StudentRecord.CONF_DISPUTED
        record.dispute_note = note.strip()[:2000]
        record.dispute_submitted_at = timezone.now()
        record.save(update_fields=[
            'confirmation_status', 'dispute_note', 'dispute_submitted_at',
        ])
        ConfirmationAuditLog.objects.create(
            batch=record.batch, student_record=record,
            event_type='DISPUTED',
            ip_address=ip, user_agent=user_agent[:512] if user_agent else '',
            metadata={'note_excerpt': note.strip()[:200]},
        )
        from registry.services import notifier
        notifier.dispute_raised(record.batch, record)
        return record

    def _log_validation_failure(self, *, batch, index_number, ip,
                                user_agent, reason):
        if batch:
            ConfirmationAuditLog.objects.create(
                batch=batch, student_record=None,
                event_type='VALIDATION_FAILED',
                ip_address=ip, user_agent=user_agent[:512] if user_agent else '',
                metadata={'index_number': index_number, 'reason': reason},
            )
