"""
Session lifecycle service.

Owns the rules that govern a CongregationSession's status machine and the
side effects that accompany each transition. Higher-level flows (publish,
close, issue, archive) orchestrate the pipeline by calling into this service.
"""

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from registry.models import CongregationSession, DeadlineExtensionLog
from registry.repositories import CongregationSessionRepository


class SessionLifecycleError(Exception):
    """Raised when a transition is invalid or input is rejected."""


class SessionLifecycleService:
    def __init__(self, repo=None):
        self.repo = repo or CongregationSessionRepository()

    # ── Creation ─────────────────────────────────────────────────────────

    @transaction.atomic
    def create(self, *, congregation, name=None, academic_year=None,
               scope_type, confirmation_deadline, certificate_template,
               created_by, faculty=None, department=None,
               session_number=None,
               confirmation_opens_at=None, issuance_instructions=''):
        if session_number is None:
            # Auto-assign the next ordinal within this congregation.
            existing = CongregationSession.objects.filter(
                congregation=congregation,
            ).values_list('session_number', flat=True)
            session_number = (max(existing) + 1) if existing else 1

        # Auto-populate name from the generated ordinal name if not provided.
        if name is None:
            temp_session = CongregationSession(
                session_number=session_number,
            )
            name = temp_session.generated_name

        # Auto-populate academic_year from congregation if not provided.
        if academic_year is None:
            academic_year = str(congregation.year)

        # Enforce the configurable per-congregation session cap.
        max_sessions = getattr(
            settings, 'REGISTRY_MAX_SESSIONS_PER_CONGREGATION', 2,
        )
        existing_count = CongregationSession.objects.filter(
            congregation=congregation,
        ).count()
        if existing_count >= max_sessions:
            raise SessionLifecycleError(
                f'Congregation already has the maximum of {max_sessions} sessions. '
                f'Raise REGISTRY_MAX_SESSIONS_PER_CONGREGATION to override.'
            )

        session = CongregationSession(
            congregation=congregation,
            session_number=session_number,
            name=name,
            academic_year=academic_year,
            scope_type=scope_type,
            faculty=faculty,
            department=department,
            confirmation_deadline=confirmation_deadline,
            confirmation_deadline_original=confirmation_deadline,
            confirmation_opens_at=confirmation_opens_at,
            certificate_template=certificate_template,
            issuance_instructions=issuance_instructions or '',
            created_by=created_by,
        )
        session.full_clean()
        session.save()
        return session

    # ── Transitions ──────────────────────────────────────────────────────

    @transaction.atomic
    def transition(self, session, to_status, *, actor=None, note=''):
        """Move a session to a new status, enforcing the lifecycle rules."""
        allowed = CongregationSession.ALLOWED_TRANSITIONS.get(session.status, set())
        if to_status not in allowed:
            raise SessionLifecycleError(
                f"Cannot move session from {session.status} to {to_status}"
            )

        from_status = session.status
        session.status = to_status

        now = timezone.now()
        if to_status == CongregationSession.STATUS_PUBLISHED:
            session.published_at = now
        elif to_status == CongregationSession.STATUS_CONFIRMATION_CLOSED:
            session.confirmation_closed_at = now
        elif to_status == CongregationSession.STATUS_ISSUANCE_IN_PROGRESS:
            session.issuance_started_at = now
        elif to_status == CongregationSession.STATUS_COMPLETED:
            session.completed_at = now
        elif to_status == CongregationSession.STATUS_ARCHIVED:
            session.archived_at = now

        session.save()
        self.repo.record_transition(
            session=session, from_status=from_status, to_status=to_status,
            actor=actor, note=note,
        )
        return session

    # ── Deadline extensions ──────────────────────────────────────────────

    EXTENDABLE_STATUSES = {
        CongregationSession.STATUS_PUBLISHED,
        CongregationSession.STATUS_CONFIRMATION_OPEN,
    }

    @transaction.atomic
    def extend_confirmation_deadline(
        self, session, *, new_deadline, actor, reason=''
    ):
        """Push the session's confirmation deadline later in time.

        Rules:
          - Session status must be PUBLISHED or CONFIRMATION_OPEN — extensions
            are meaningless once the window has been closed or after issuance
            has started.
          - ``new_deadline`` must be strictly *after* the current deadline
            (no shortening — that would prejudice graduands who have not yet
            confirmed) and in the future.
          - On the first extension, copy the current ``confirmation_deadline``
            into ``confirmation_deadline_original`` if it's still null (legacy
            data only — new sessions get this populated at creation).
          - Append a ``DeadlineExtensionLog`` row and bump the count/extended_at
            audit fields on the session.
          - Notification side-effects are fired by the caller (the viewset) so
            the service stays free of the notifications dependency.
        """
        if session.status not in self.EXTENDABLE_STATUSES:
            raise SessionLifecycleError(
                f'Cannot extend deadline: session is {session.status}. '
                f'Only PUBLISHED or CONFIRMATION_OPEN sessions are extendable.'
            )
        if new_deadline is None:
            raise SessionLifecycleError('new_deadline is required.')

        now = timezone.now()
        if new_deadline <= now:
            raise SessionLifecycleError(
                'new_deadline must be in the future.'
            )

        previous_deadline = session.confirmation_deadline
        if previous_deadline and new_deadline <= previous_deadline:
            raise SessionLifecycleError(
                'new_deadline must be later than the current deadline.'
            )

        # Lazy-populate the original deadline for legacy sessions created
        # before the original-deadline field existed.
        if session.confirmation_deadline_original is None:
            session.confirmation_deadline_original = previous_deadline

        session.confirmation_deadline = new_deadline
        session.confirmation_deadline_extended_at = now
        session.confirmation_deadline_extended_by = actor
        session.confirmation_deadline_extension_count = (
            (session.confirmation_deadline_extension_count or 0) + 1
        )
        session.save(update_fields=[
            'confirmation_deadline',
            'confirmation_deadline_original',
            'confirmation_deadline_extended_at',
            'confirmation_deadline_extended_by',
            'confirmation_deadline_extension_count',
        ])

        log = DeadlineExtensionLog.objects.create(
            session=session,
            congregation=session.congregation,
            previous_deadline=previous_deadline,
            new_deadline=new_deadline,
            extended_by=actor,
            reason=(reason or '')[:300],
        )
        return log

    # ── Mutability checks ────────────────────────────────────────────────

    @staticmethod
    def is_draft(session):
        return session.status == CongregationSession.STATUS_DRAFT

    @staticmethod
    def can_edit_records(session):
        return session.status == CongregationSession.STATUS_DRAFT
