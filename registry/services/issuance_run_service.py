"""
IssuanceRunService — filtered, retry-friendly certificate issuance.

Sits *above* ``IssuanceService._issue_one`` (which still owns the
per-record certificate creation + email). The run service is responsible
for the orchestration:

  1. Validate inputs and the batch state.
  2. Create an ``IssuanceRun`` row.
  3. If this is the first run for the batch, transition
     CONFIRMATION_CLOSED → ISSUANCE_IN_PROGRESS.
  4. Iterate the filtered records, calling ``_issue_one`` for each.
  5. Update the run counters + status.
  6. Fire a SUPER_ADMIN notification.

The legacy ``IssuanceService.start_issuance`` is now a thin wrapper that
delegates here with an empty filter dict.
"""

from django.db import transaction
from django.utils import timezone

from registry.models import (
    IssuanceBatch, IssuanceRun, StudentRecord,
)
from registry.services.issuance_filters import (
    FilterValidationError, validate_filter_criteria, issuable_records_for_batch,
)
from registry.services.issuance_service import IssuanceError, IssuanceService
from registry.services.batch_lifecycle_service import BatchLifecycleService


# Statuses in which we'll *accept* a new run.
_RUNNABLE_STATUSES = {
    IssuanceBatch.STATUS_CONFIRMATION_CLOSED,
    IssuanceBatch.STATUS_ISSUANCE_IN_PROGRESS,
}


class IssuanceRunService:
    def __init__(self, lifecycle=None, issuance=None):
        self.lifecycle = lifecycle or BatchLifecycleService()
        self.issuance = issuance or IssuanceService(lifecycle=self.lifecycle)

    # ── Public API ──────────────────────────────────────────────────────

    @transaction.atomic
    def create(self, *, batch, requested_by, filter_criteria=None, notes=''):
        """Create a QUEUED run row. Does not start execution."""
        if batch.status not in _RUNNABLE_STATUSES:
            raise IssuanceError(
                f'Cannot create an issuance run from batch status '
                f'{batch.status}. Allowed: CONFIRMATION_CLOSED or '
                f'ISSUANCE_IN_PROGRESS.'
            )
        if not batch.certificate_template_id:
            raise IssuanceError(
                'Batch has no certificate template configured.'
            )
        try:
            criteria = validate_filter_criteria(filter_criteria)
        except FilterValidationError as e:
            raise IssuanceError(str(e))

        targeted = issuable_records_for_batch(batch, criteria)
        total_targeted = targeted.count()
        if total_targeted == 0:
            raise IssuanceError(
                'No issuable records match the supplied filter. '
                'Check that the records are CONFIRMED and not yet ISSUED.'
            )

        run = IssuanceRun.objects.create(
            batch=batch,
            status=IssuanceRun.STATUS_QUEUED,
            filter_criteria=criteria,
            notes=(notes or '')[:500],
            total_targeted=total_targeted,
            requested_by=requested_by,
        )
        return run

    def execute(self, run, *, actor=None):
        """Run a previously-created run.

        Returns ``{'succeeded': int, 'failed': int}``. Idempotent for a run
        that's already COMPLETED/PARTIAL/FAILED — re-running is a no-op.
        """
        # Re-read inside a fresh transaction so we hold the row lock.
        with transaction.atomic():
            locked = IssuanceRun.objects.select_for_update().get(pk=run.pk)
            if locked.status in {
                IssuanceRun.STATUS_COMPLETED,
                IssuanceRun.STATUS_PARTIAL,
                IssuanceRun.STATUS_FAILED,
            }:
                return {
                    'succeeded': locked.succeeded_count,
                    'failed': locked.failed_count,
                    'status': locked.status,
                    'already_finished': True,
                }
            batch = locked.batch
            if batch.status not in _RUNNABLE_STATUSES:
                raise IssuanceError(
                    f'Batch is in {batch.status}; cannot execute run.'
                )
            # Transition once on the first run.
            if batch.status == IssuanceBatch.STATUS_CONFIRMATION_CLOSED:
                self.lifecycle.transition(
                    batch, IssuanceBatch.STATUS_ISSUANCE_IN_PROGRESS,
                    actor=actor or locked.requested_by,
                    note=f'Initial issuance run {locked.id}.',
                )
                batch.refresh_from_db()

            locked.status = IssuanceRun.STATUS_IN_PROGRESS
            locked.started_at = timezone.now()
            locked.save(update_fields=['status', 'started_at'])

        # Snapshot the target set *now* so concurrent confirmations or
        # follow-up runs can't change it mid-run.
        records = list(
            issuable_records_for_batch(batch, locked.filter_criteria)
            .select_related('batch', 'batch__certificate_template')
        )
        # Mark records as queued + stamp the run reference.
        StudentRecord.objects.filter(
            id__in=[r.id for r in records],
        ).update(
            issuance_status=StudentRecord.ISSUE_QUEUED,
            last_issuance_run=locked,
        )

        succeeded = 0
        failed = 0
        runner_actor = actor or run.requested_by
        for record in records:
            # _issue_one swallows exceptions and flips ISSUE_FAILED itself.
            ok = self.issuance._issue_one(record, actor=runner_actor)
            if ok:
                succeeded += 1
            else:
                failed += 1

        # Settle the run.
        with transaction.atomic():
            locked = IssuanceRun.objects.select_for_update().get(pk=run.pk)
            locked.succeeded_count = succeeded
            locked.failed_count = failed
            locked.completed_at = timezone.now()
            if succeeded and not failed:
                locked.status = IssuanceRun.STATUS_COMPLETED
            elif succeeded and failed:
                locked.status = IssuanceRun.STATUS_PARTIAL
            else:
                locked.status = IssuanceRun.STATUS_FAILED
            locked.save(update_fields=[
                'succeeded_count', 'failed_count',
                'completed_at', 'status',
            ])

        # Fire summary notification.
        from registry.services import notifier
        notifier.issuance_finished(
            batch, issued=succeeded, failed=failed,
        )

        return {
            'succeeded': succeeded,
            'failed': failed,
            'status': locked.status,
            'already_finished': False,
        }

    # ── Convenience ────────────────────────────────────────────────────

    def create_and_run(self, *, batch, requested_by,
                       filter_criteria=None, notes=''):
        """Create + execute in one call. Used by the REST endpoint."""
        run = self.create(
            batch=batch, requested_by=requested_by,
            filter_criteria=filter_criteria, notes=notes,
        )
        result = self.execute(run, actor=requested_by)
        run.refresh_from_db()
        return run, result
