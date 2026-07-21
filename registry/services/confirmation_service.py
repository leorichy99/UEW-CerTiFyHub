"""
Public confirmation service.

Resolves a (token, index_number) pair to a StudentRecord and records
confirmation, dispute, or token-validation-failure events.
"""

from django.db import transaction
from django.utils import timezone

from registry.models import (
    IssuanceBatch, StudentRecord, ConfirmationAuditLog,
    Dispute,
)
from registry.services.token_service import hash_token


class TokenInvalid(Exception):
    """The supplied (token, index) pair did not match any record."""


class TokenExpired(Exception):
    """The token matched a record but is past its expiry timestamp."""


class BatchNotAccepting(Exception):
    """The batch is not in a status that accepts public actions."""


class AlreadyFinalised(Exception):
    """The record has already been confirmed or disputed and cannot be changed."""


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
        if record.confirmation_status == StudentRecord.CONF_CONFIRMED:
            return record  # idempotent — already confirmed
        if record.confirmation_status == StudentRecord.CONF_DISPUTED:
            raise AlreadyFinalised(
                'This record has an active dispute and cannot be confirmed.'
            )
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
    def dispute(self, record, *, note: str = None, disputes: list = None, ip=None, user_agent=''):
        import json

        # Support both old simple note and new structured disputes
        if disputes:
            # New structured dispute format
            if not isinstance(disputes, list) or not disputes:
                raise ValueError('Disputes must be a non-empty list.')
            dispute_data = disputes
        elif note:
            # Old simple note format (backward compatibility)
            if not note or not note.strip():
                raise ValueError('Dispute note is required.')
            dispute_data = [{'type': 'other', 'note': note.strip()}]
        else:
            raise ValueError('Either note or disputes is required.')

        if record.confirmation_status == StudentRecord.CONF_DISPUTED:
            return record  # idempotent — already disputed
        if record.confirmation_status == StudentRecord.CONF_CONFIRMED:
            raise AlreadyFinalised(
                'This record is already confirmed and cannot be disputed.'
            )

        # Check for existing pending dispute
        if record.disputes.filter(is_pending=True).exists():
            raise ValueError('A dispute is already pending for this record.')

        # Create Dispute record
        dispute = Dispute(
            student_record=record,
            dispute_type=Dispute.OTHER,  # Default for legacy format
            dispute_note=note if note else json.dumps(dispute_data),
            created_at=timezone.now(),
            is_pending=True,
        )
        dispute.save()

        record.confirmation_status = StudentRecord.CONF_DISPUTED
        record.save(update_fields=['confirmation_status'])

        # Create excerpt for audit log
        excerpt = ''
        if disputes:
            types = [d.get('type', 'other') for d in disputes]
            excerpt = f'Dispute types: {", ".join(types)}'
        else:
            excerpt = note.strip()[:200] if note else ''

        ConfirmationAuditLog.objects.create(
            batch=record.batch, student_record=record,
            event_type='DISPUTED',
            ip_address=ip, user_agent=user_agent[:512] if user_agent else '',
            metadata={'dispute_data': dispute_data, 'note_excerpt': excerpt},
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
