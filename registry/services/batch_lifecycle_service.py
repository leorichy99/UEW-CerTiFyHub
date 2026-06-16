"""
Batch lifecycle service.

Owns the rules that govern an IssuanceBatch's status machine and the side
effects that accompany each transition. Higher-level flows (publish, close,
issue, archive) orchestrate the pipeline by calling into this service.
"""

from django.db import transaction
from django.utils import timezone

from registry.models import IssuanceBatch, DeadlineExtensionLog
from registry.repositories import IssuanceBatchRepository


class BatchLifecycleError(Exception):
    """Raised when a transition is invalid or input is rejected."""


class BatchLifecycleService:
    def __init__(self, repo=None):
        self.repo = repo or IssuanceBatchRepository()

    # ── Creation ─────────────────────────────────────────────────────────

    @transaction.atomic
    def create(self, *, name, confirmation_deadline, certificate_template,
               created_by, year=None,
               confirmation_opens_at=None, issuance_instructions=''):
        if not name or not name.strip():
            raise BatchLifecycleError('name is required.')

        if year is None and confirmation_deadline is not None:
            year = confirmation_deadline.year

        batch = IssuanceBatch(
            name=name.strip(),
            year=year,
            confirmation_deadline=confirmation_deadline,
            confirmation_deadline_original=confirmation_deadline,
            confirmation_opens_at=confirmation_opens_at,
            certificate_template=certificate_template,
            issuance_instructions=issuance_instructions or '',
            created_by=created_by,
        )
        batch.full_clean()
        batch.save()
        return batch

    # ── Transitions ──────────────────────────────────────────────────────

    @transaction.atomic
    def transition(self, batch, to_status, *, actor=None, note=''):
        """Move a batch to a new status, enforcing the lifecycle rules."""
        allowed = IssuanceBatch.ALLOWED_TRANSITIONS.get(batch.status, set())
        if to_status not in allowed:
            raise BatchLifecycleError(
                f"Cannot move batch from {batch.status} to {to_status}"
            )

        from_status = batch.status
        batch.status = to_status

        now = timezone.now()
        if to_status == IssuanceBatch.STATUS_PUBLISHED:
            batch.published_at = now
        elif to_status == IssuanceBatch.STATUS_CONFIRMATION_CLOSED:
            batch.confirmation_closed_at = now
        elif to_status == IssuanceBatch.STATUS_ISSUANCE_IN_PROGRESS:
            batch.issuance_started_at = now
        elif to_status == IssuanceBatch.STATUS_COMPLETED:
            batch.completed_at = now
        elif to_status == IssuanceBatch.STATUS_ARCHIVED:
            batch.archived_at = now

        batch.save()
        self.repo.record_transition(
            batch=batch, from_status=from_status, to_status=to_status,
            actor=actor, note=note,
        )
        return batch

    # ── Deadline extensions ──────────────────────────────────────────────

    EXTENDABLE_STATUSES = {
        IssuanceBatch.STATUS_PUBLISHED,
        IssuanceBatch.STATUS_CONFIRMATION_OPEN,
    }

    @transaction.atomic
    def extend_confirmation_deadline(
        self, batch, *, new_deadline, actor, reason=''
    ):
        """Push the batch's confirmation deadline later in time.

        Rules:
          - Batch status must be PUBLISHED or CONFIRMATION_OPEN.
          - ``new_deadline`` must be strictly *after* the current deadline
            (no shortening) and in the future.
          - Append a ``DeadlineExtensionLog`` row and bump the audit fields.
          - Notification side-effects are fired by the caller (the viewset).
        """
        if batch.status not in self.EXTENDABLE_STATUSES:
            raise BatchLifecycleError(
                f'Cannot extend deadline: batch is {batch.status}. '
                f'Only PUBLISHED or CONFIRMATION_OPEN batches are extendable.'
            )
        if new_deadline is None:
            raise BatchLifecycleError('new_deadline is required.')

        now = timezone.now()
        if new_deadline <= now:
            raise BatchLifecycleError('new_deadline must be in the future.')

        previous_deadline = batch.confirmation_deadline
        if previous_deadline and new_deadline <= previous_deadline:
            raise BatchLifecycleError(
                'new_deadline must be later than the current deadline.'
            )

        if batch.confirmation_deadline_original is None:
            batch.confirmation_deadline_original = previous_deadline

        batch.confirmation_deadline = new_deadline
        batch.confirmation_deadline_extended_at = now
        batch.confirmation_deadline_extended_by = actor
        batch.confirmation_deadline_extension_count = (
            (batch.confirmation_deadline_extension_count or 0) + 1
        )
        batch.save(update_fields=[
            'confirmation_deadline',
            'confirmation_deadline_original',
            'confirmation_deadline_extended_at',
            'confirmation_deadline_extended_by',
            'confirmation_deadline_extension_count',
        ])

        log = DeadlineExtensionLog.objects.create(
            batch=batch,
            previous_deadline=previous_deadline,
            new_deadline=new_deadline,
            extended_by=actor,
            reason=(reason or '')[:300],
        )
        return log

    # ── Mutability checks ────────────────────────────────────────────────

    @staticmethod
    def is_draft(batch):
        return batch.status == IssuanceBatch.STATUS_DRAFT

    @staticmethod
    def can_edit_records(batch):
        return batch.status == IssuanceBatch.STATUS_DRAFT
