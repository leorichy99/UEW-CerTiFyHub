"""
Celery tasks for the registry pipeline.

The "happy path" for each is identical to the synchronous version that
already lives in the service layer; the task is a thin wrapper that
delegates to the service so we don't fork business logic between the two.

Tasks fall back to eager execution when ``REDIS_URL`` is unset (settings
forces ``CELERY_TASK_ALWAYS_EAGER = True`` in that case), so the rest of
the test suite continues to work without a running broker.
"""

import logging

from celery import shared_task

from registry.models import StudentRecord, CongregationSession

logger = logging.getLogger(__name__)


@shared_task(name='registry.send_confirmation_invitation',
             autoretry_for=(Exception,), retry_backoff=True,
             max_retries=3, retry_jitter=True)
def send_confirmation_invitation(record_id, raw_token):
    """Dispatch the publication-time invitation email for a single record.

    ``raw_token`` is the plaintext (URL-safe) token; it is never persisted.
    The hash is already on the record.
    """
    from registry.services.publication_service import PublicationService

    record = (
        StudentRecord.objects
        .select_related('session')
        .filter(pk=record_id)
        .first()
    )
    if not record:
        logger.warning('send_confirmation_invitation: record %s not found', record_id)
        return None
    PublicationService()._dispatch_invitation(record.session, record, raw_token)
    return str(record.id)


@shared_task(name='registry.issue_certificate_for_record',
             autoretry_for=(Exception,), retry_backoff=True,
             max_retries=2, retry_jitter=True)
def issue_certificate_for_record(record_id, actor_id):
    """Issue a single certificate. See IssuanceService._issue_one."""
    from django.contrib.auth.models import User
    from registry.services.issuance_service import IssuanceService

    record = (
        StudentRecord.objects
        .select_related('session', 'session__certificate_template')
        .filter(pk=record_id)
        .first()
    )
    if not record:
        logger.warning('issue_certificate_for_record: record %s not found', record_id)
        return None
    actor = User.objects.filter(pk=actor_id).first() if actor_id else None
    IssuanceService()._issue_one(record, actor=actor)
    return str(record.id)


@shared_task(name='registry.auto_close_expired_confirmation_windows')
def auto_close_expired_confirmation_windows():
    """Periodic sweep: close sessions whose confirmation deadline has passed.

    Runs from Celery Beat (see ``CELERY_BEAT_SCHEDULE``). For each session
    in ``PUBLISHED`` or ``CONFIRMATION_OPEN`` whose ``confirmation_deadline``
    is in the past, drives ``IssuanceService.close_confirmation`` which
    flags still-pending records and transitions the session.
    """
    from django.utils import timezone
    from registry.services.issuance_service import IssuanceService, IssuanceError

    today = timezone.localdate()
    candidates = CongregationSession.objects.filter(
        status__in=[
            CongregationSession.STATUS_PUBLISHED,
            CongregationSession.STATUS_CONFIRMATION_OPEN,
        ],
        confirmation_deadline__lt=today,
    )
    closed = 0
    for session in candidates:
        try:
            IssuanceService().close_confirmation(session, actor=None)
            closed += 1
        except IssuanceError as exc:
            logger.warning(
                'auto_close: session %s skipped: %s', session.id, exc,
            )
    return {'closed': closed}


@shared_task(name='registry.complete_session_if_done')
def complete_session_if_done(session_id, actor_id):
    """Auto-complete a session once all issuance jobs have settled."""
    from django.contrib.auth.models import User
    from registry.services.issuance_service import IssuanceService, IssuanceError

    session = CongregationSession.objects.filter(pk=session_id).first()
    if not session:
        return None
    actor = User.objects.filter(pk=actor_id).first() if actor_id else None
    try:
        IssuanceService().complete(session, actor=actor)
        return 'completed'
    except IssuanceError:
        return 'still-outstanding'
