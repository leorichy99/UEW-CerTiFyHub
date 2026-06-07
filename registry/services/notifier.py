"""
Thin wrapper around ``notifications.services.notify`` that knows how to
broadcast registry-pipeline events to the SUPER_ADMIN role.

Kept here (rather than inline) so the service layer doesn't grow direct
dependencies on the notifications app's payload shape, and so unit tests
can patch a single seam.
"""

import logging

logger = logging.getLogger('registry')

ROLE_SUPER_ADMIN = 'SUPER_ADMIN'
RELATED_TYPE = 'congregation_session'


def _safe_notify(**kwargs):
    """Notifications must never break the registry pipeline."""
    try:
        from notifications.services import notify
        notify(**kwargs)
    except Exception:  # pragma: no cover - defensive
        logger.exception('registry notifier: notify() failed (kwargs=%s)', kwargs)


def session_published(session, *, sent, failed, total):
    _safe_notify(
        role_target=ROLE_SUPER_ADMIN,
        title=f'Session published: {session.name}',
        message=(
            f'{total} record(s) published, {sent} email(s) sent, '
            f'{failed} failed.'
        ),
        notification_type='system',
        related_object_id=session.id,
        related_object_type=RELATED_TYPE,
        priority='info',
        metadata={'event': 'session_published', 'total': total,
                  'sent': sent, 'failed': failed},
    )


def confirmation_closed(session, *, flagged):
    _safe_notify(
        role_target=ROLE_SUPER_ADMIN,
        title=f'Confirmation closed: {session.name}',
        message=(
            f'{flagged} record(s) auto-flagged for review.'
            if flagged else 'All records confirmed in time.'
        ),
        notification_type='system',
        related_object_id=session.id,
        related_object_type=RELATED_TYPE,
        priority='warning' if flagged else 'info',
        metadata={'event': 'confirmation_closed', 'flagged': flagged},
    )


def issuance_finished(session, *, issued, failed):
    _safe_notify(
        role_target=ROLE_SUPER_ADMIN,
        title=f'Issuance complete: {session.name}',
        message=(
            f'{issued} certificate(s) issued, {failed} failed.'
        ),
        notification_type='bulk_issuance_complete',
        related_object_id=session.id,
        related_object_type=RELATED_TYPE,
        priority='critical' if failed else 'success',
        metadata={'event': 'issuance_finished', 'issued': issued, 'failed': failed},
    )


def deadline_extended(session, *, previous_deadline, new_deadline, actor, reason=''):
    _safe_notify(
        role_target=ROLE_SUPER_ADMIN,
        title=f'Deadline extended: {session.name}',
        message=(
            f'Confirmation deadline moved from '
            f'{previous_deadline:%Y-%m-%d %H:%M} to '
            f'{new_deadline:%Y-%m-%d %H:%M}.'
        ),
        notification_type='system',
        related_object_id=session.id,
        related_object_type=RELATED_TYPE,
        priority='warning',
        metadata={
            'event': 'session.deadline_extended',
            'previous_deadline': previous_deadline.isoformat() if previous_deadline else None,
            'new_deadline': new_deadline.isoformat() if new_deadline else None,
            'actor_id': getattr(actor, 'id', None),
            'reason': (reason or '')[:300],
        },
    )


def dispute_raised(session, record):
    _safe_notify(
        role_target=ROLE_SUPER_ADMIN,
        title=f'New dispute: {session.name}',
        message=(
            f'{record.full_name} ({record.index_number}) flagged their '
            f'record for review.'
        ),
        notification_type='system',
        related_object_id=session.id,
        related_object_type=RELATED_TYPE,
        priority='warning',
        metadata={'event': 'dispute_raised', 'record_id': str(record.id)},
    )
