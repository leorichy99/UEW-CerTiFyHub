"""
IssuanceBatchService — filtered, retry-friendly certificate issuance.

This sits *above* ``IssuanceService._issue_one`` (which still owns the
per-record certificate creation + email). The batch service is responsible
for the orchestration:

  1. Validate inputs and the session state.
  2. Create an ``IssuanceBatch`` row.
  3. If this is the first batch for the session, transition
     CONFIRMATION_CLOSED → ISSUANCE_IN_PROGRESS.
  4. Iterate the filtered records, calling ``_issue_one`` for each.
  5. Update the batch counters + status.
  6. Fire a SUPER_ADMIN notification.

The legacy ``IssuanceService.start_issuance`` is now a thin wrapper that
delegates here with an empty filter dict, preserving backwards compatibility.
"""

from django.db import transaction
from django.utils import timezone

from registry.models import (
    CongregationSession, IssuanceBatch, StudentRecord,
)
from registry.services.issuance_filters import (
    FilterValidationError, validate_filter_criteria, issuable_records_for_batch,
)
from registry.services.issuance_service import IssuanceError, IssuanceService
from registry.services.session_lifecycle_service import SessionLifecycleService


# Statuses in which we'll *accept* a new batch.
#   CONFIRMATION_CLOSED → first batch (will drive the lifecycle transition).
#   ISSUANCE_IN_PROGRESS → follow-up batches (filtered re-runs, retries).
_BATCHABLE_STATUSES = {
    CongregationSession.STATUS_CONFIRMATION_CLOSED,
    CongregationSession.STATUS_ISSUANCE_IN_PROGRESS,
}


class IssuanceBatchService:
    def __init__(self, lifecycle=None, issuance=None):
        self.lifecycle = lifecycle or SessionLifecycleService()
        self.issuance = issuance or IssuanceService(lifecycle=self.lifecycle)

    # ── Public API ──────────────────────────────────────────────────────

    @transaction.atomic
    def create(self, *, session, requested_by, filter_criteria=None, notes=''):
        """Create a QUEUED batch row. Does not start execution."""
        if session.status not in _BATCHABLE_STATUSES:
            raise IssuanceError(
                f'Cannot create an issuance batch from session status '
                f'{session.status}. Allowed: CONFIRMATION_CLOSED or '
                f'ISSUANCE_IN_PROGRESS.'
            )
        if not session.certificate_template_id:
            raise IssuanceError(
                'Session has no certificate template configured.'
            )
        try:
            criteria = validate_filter_criteria(filter_criteria)
        except FilterValidationError as e:
            raise IssuanceError(str(e))

        targeted = issuable_records_for_batch(session, criteria)
        total_targeted = targeted.count()
        if total_targeted == 0:
            raise IssuanceError(
                'No issuable records match the supplied filter. '
                'Check that the records are CONFIRMED and not yet ISSUED.'
            )

        batch = IssuanceBatch.objects.create(
            session=session,
            congregation=session.congregation,
            status=IssuanceBatch.STATUS_QUEUED,
            filter_criteria=criteria,
            notes=(notes or '')[:500],
            total_targeted=total_targeted,
            requested_by=requested_by,
        )
        return batch

    def execute(self, batch, *, actor=None):
        """Run a previously-created batch.

        Returns ``{'succeeded': int, 'failed': int}``. Idempotent for a batch
        that's already COMPLETED/PARTIAL/FAILED — re-running is a no-op.
        """
        # Re-read inside a fresh transaction so we hold the row lock.
        with transaction.atomic():
            locked = IssuanceBatch.objects.select_for_update().get(pk=batch.pk)
            if locked.status in {
                IssuanceBatch.STATUS_COMPLETED,
                IssuanceBatch.STATUS_PARTIAL,
                IssuanceBatch.STATUS_FAILED,
            }:
                return {
                    'succeeded': locked.succeeded_count,
                    'failed': locked.failed_count,
                    'status': locked.status,
                    'already_finished': True,
                }
            session = locked.session
            if session.status not in _BATCHABLE_STATUSES:
                raise IssuanceError(
                    f'Session is in {session.status}; cannot execute batch.'
                )
            # Transition once on the first batch.
            if session.status == CongregationSession.STATUS_CONFIRMATION_CLOSED:
                self.lifecycle.transition(
                    session, CongregationSession.STATUS_ISSUANCE_IN_PROGRESS,
                    actor=actor or locked.requested_by,
                    note=f'Initial issuance batch {locked.id}.',
                )
                session.refresh_from_db()

            locked.status = IssuanceBatch.STATUS_IN_PROGRESS
            locked.started_at = timezone.now()
            locked.save(update_fields=['status', 'started_at'])

        # Snapshot the target set *now* so concurrent confirmations or
        # follow-up batches can't change it mid-run.
        records = list(
            issuable_records_for_batch(batch.session, batch.filter_criteria)
            .select_related('session', 'session__certificate_template')
        )
        # Mark records as queued + stamp the batch reference.
        StudentRecord.objects.filter(
            id__in=[r.id for r in records],
        ).update(
            issuance_status=StudentRecord.ISSUE_QUEUED,
            last_issuance_batch=batch,
        )

        succeeded = 0
        failed = 0
        runner_actor = actor or batch.requested_by
        for record in records:
            # _issue_one swallows exceptions and flips ISSUE_FAILED itself.
            ok = self.issuance._issue_one(record, actor=runner_actor)
            if ok:
                succeeded += 1
            else:
                failed += 1

        # Settle the batch.
        with transaction.atomic():
            locked = IssuanceBatch.objects.select_for_update().get(pk=batch.pk)
            locked.succeeded_count = succeeded
            locked.failed_count = failed
            locked.completed_at = timezone.now()
            if succeeded and not failed:
                locked.status = IssuanceBatch.STATUS_COMPLETED
            elif succeeded and failed:
                locked.status = IssuanceBatch.STATUS_PARTIAL
            else:
                locked.status = IssuanceBatch.STATUS_FAILED
            locked.save(update_fields=[
                'succeeded_count', 'failed_count',
                'completed_at', 'status',
            ])

        # Fire summary notification.
        from registry.services import notifier
        notifier.issuance_finished(
            batch.session, issued=succeeded, failed=failed,
        )

        return {
            'succeeded': succeeded,
            'failed': failed,
            'status': locked.status,
            'already_finished': False,
        }

    # ── Convenience ────────────────────────────────────────────────────

    def create_and_run(self, *, session, requested_by,
                       filter_criteria=None, notes=''):
        """Create + execute in one call. Used by the REST endpoint."""
        batch = self.create(
            session=session, requested_by=requested_by,
            filter_criteria=filter_criteria, notes=notes,
        )
        result = self.execute(batch, actor=requested_by)
        batch.refresh_from_db()
        return batch, result
