"""
Congregation service — manages the umbrella event that owns one or more sessions.

The Congregation itself has no stored status: its status is derived from the
state of its child sessions. Sessions are still created through the existing
``SessionLifecycleService`` — the only thing this service adds is the
congregation-level orchestration (create, archive, derive status, template
creation hooks for later slices).
"""

from collections import Counter

from django.db import transaction
from django.utils import timezone

from registry.models import Congregation, CongregationSession
from registry.repositories import CongregationRepository
from registry.services.session_lifecycle_service import (
    SessionLifecycleService, SessionLifecycleError,
)


# ── Derived-status constants ────────────────────────────────────────────────
# These values mirror the session status strings for UI consistency, plus a
# special DRAFT/IN_PROGRESS/COMPLETED/ARCHIVED rollup.

CONGREGATION_STATUS_DRAFT = 'DRAFT'
CONGREGATION_STATUS_IN_PROGRESS = 'IN_PROGRESS'
CONGREGATION_STATUS_COMPLETED = 'COMPLETED'
CONGREGATION_STATUS_ARCHIVED = 'ARCHIVED'


class CongregationError(Exception):
    """Raised when a congregation-level operation is rejected."""


def derive_congregation_status(session_statuses):
    """Pure function: compute the derived status from a list of session statuses.

    Rules (per spec):
      - No sessions at all -> DRAFT.
      - All sessions DRAFT -> DRAFT.
      - All sessions ARCHIVED -> ARCHIVED.
      - All sessions COMPLETED (or COMPLETED + ARCHIVED) -> COMPLETED.
      - At least one session PUBLISHED/CONFIRMATION_*/ISSUANCE_IN_PROGRESS
        and none yet COMPLETED -> IN_PROGRESS.
      - Mixed states default to the most advanced non-ARCHIVED status present.
    """
    statuses = list(session_statuses)
    if not statuses:
        return CONGREGATION_STATUS_DRAFT

    counts = Counter(statuses)
    total = len(statuses)

    if counts.get(CongregationSession.STATUS_DRAFT, 0) == total:
        return CONGREGATION_STATUS_DRAFT
    if counts.get(CongregationSession.STATUS_ARCHIVED, 0) == total:
        return CONGREGATION_STATUS_ARCHIVED

    completed_or_archived = (
        counts.get(CongregationSession.STATUS_COMPLETED, 0)
        + counts.get(CongregationSession.STATUS_ARCHIVED, 0)
    )
    if completed_or_archived == total:
        return CONGREGATION_STATUS_COMPLETED

    # Anything in flight between DRAFT and COMPLETED -> IN_PROGRESS.
    in_progress_statuses = {
        CongregationSession.STATUS_PUBLISHED,
        CongregationSession.STATUS_CONFIRMATION_OPEN,
        CongregationSession.STATUS_CONFIRMATION_CLOSED,
        CongregationSession.STATUS_ISSUANCE_IN_PROGRESS,
        CongregationSession.STATUS_COMPLETED,
    }
    if any(s in in_progress_statuses for s in statuses):
        return CONGREGATION_STATUS_IN_PROGRESS

    return CONGREGATION_STATUS_DRAFT


class CongregationService:
    """Operations on the Congregation aggregate."""

    def __init__(self, repo=None, lifecycle=None):
        self.repo = repo or CongregationRepository()
        self.lifecycle = lifecycle or SessionLifecycleService()

    # ── Creation ────────────────────────────────────────────────────────

    @transaction.atomic
    def create(self, *, name, year, created_by, description=''):
        if not name or not name.strip():
            raise CongregationError('name is required.')
        if not isinstance(year, int) or year <= 0:
            raise CongregationError('year must be a positive integer.')
        if self.repo.get_by_year(year):
            raise CongregationError(
                f'A congregation already exists for year {year}.'
            )
        congregation = Congregation.objects.create(
            name=name.strip(),
            year=year,
            description=(description or '').strip()[:500],
            created_by=created_by,
        )
        return congregation

    # ── Derived status ──────────────────────────────────────────────────

    def get_status(self, congregation):
        """Compute the derived status without writing anything."""
        statuses = list(
            CongregationSession.objects
            .filter(congregation=congregation)
            .values_list('status', flat=True)
        )
        return derive_congregation_status(statuses)

    # ── Aggregate counts ─────────────────────────────────────────────────

    def get_aggregate_counts(self, congregation):
        """Sum student-record counts across all sessions in the congregation."""
        from registry.models import StudentRecord
        records = StudentRecord.objects.filter(congregation=congregation)
        return {
            'total': records.count(),
            'pending': records.filter(
                confirmation_status=StudentRecord.CONF_PENDING).count(),
            'confirmed': records.filter(
                confirmation_status=StudentRecord.CONF_CONFIRMED).count(),
            'flagged': records.filter(
                confirmation_status=StudentRecord.CONF_FLAGGED).count(),
            'disputed': records.filter(
                confirmation_status=StudentRecord.CONF_DISPUTED).count(),
            'issued': records.filter(
                issuance_status=StudentRecord.ISSUE_ISSUED).count(),
            'issuance_failed': records.filter(
                issuance_status=StudentRecord.ISSUE_FAILED).count(),
        }

    # ── Archival ─────────────────────────────────────────────────────────

    @transaction.atomic
    def archive(self, congregation, *, actor):
        """Archive a congregation by archiving each of its Completed sessions.

        Refuses to archive while any session is in a non-terminal state.
        Already-archived sessions are skipped.
        """
        sessions = list(
            CongregationSession.objects
            .select_for_update()
            .filter(congregation=congregation)
        )
        if not sessions:
            raise CongregationError(
                'Cannot archive a congregation with no sessions.'
            )

        unfinished = [
            s for s in sessions
            if s.status not in {
                CongregationSession.STATUS_COMPLETED,
                CongregationSession.STATUS_ARCHIVED,
            }
        ]
        if unfinished:
            names = ', '.join(s.name for s in unfinished)
            raise CongregationError(
                f'Cannot archive: the following session(s) are not Completed: {names}.'
            )

        archived = 0
        for session in sessions:
            if session.status == CongregationSession.STATUS_COMPLETED:
                self.lifecycle.transition(
                    session, CongregationSession.STATUS_ARCHIVED,
                    actor=actor, note='Archived via congregation archive.',
                )
                archived += 1

        congregation.updated_at = timezone.now()
        congregation.save(update_fields=['updated_at'])
        return {'archived_sessions': archived, 'total_sessions': len(sessions)}
