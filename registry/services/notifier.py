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
RELATED_TYPE = 'issuance_batch'


def _safe_notify(**kwargs):
    """Notifications must never break the registry pipeline."""
    try:
        from notifications.services import notify
        notify(**kwargs)
    except Exception:  # pragma: no cover - defensive
        logger.exception('registry notifier: notify() failed (kwargs=%s)', kwargs)


def batch_published(batch, *, sent, failed, total):
    _safe_notify(
        role_target=ROLE_SUPER_ADMIN,
        title=f'Batch published: {batch.name}',
        message=(
            f'{total} record(s) published, {sent} email(s) sent, '
            f'{failed} failed.'
        ),
        notification_type='system',
        related_object_id=batch.id,
        related_object_type=RELATED_TYPE,
        priority='info',
        metadata={'event': 'batch_published', 'total': total,
                  'sent': sent, 'failed': failed},
    )


def confirmation_closed(batch, *, flagged):
    _safe_notify(
        role_target=ROLE_SUPER_ADMIN,
        title=f'Confirmation closed: {batch.name}',
        message=(
            f'{flagged} record(s) auto-flagged for review.'
            if flagged else 'All records confirmed in time.'
        ),
        notification_type='system',
        related_object_id=batch.id,
        related_object_type=RELATED_TYPE,
        priority='warning' if flagged else 'info',
        metadata={'event': 'confirmation_closed', 'flagged': flagged},
    )


def issuance_finished(batch, *, issued, failed):
    _safe_notify(
        role_target=ROLE_SUPER_ADMIN,
        title=f'Issuance complete: {batch.name}',
        message=(
            f'{issued} certificate(s) issued, {failed} failed.'
        ),
        notification_type='bulk_issuance_complete',
        related_object_id=batch.id,
        related_object_type=RELATED_TYPE,
        priority='critical' if failed else 'success',
        metadata={'event': 'issuance_finished', 'issued': issued, 'failed': failed},
    )


def deadline_extended(batch, *, previous_deadline, new_deadline, actor, reason=''):
    _safe_notify(
        role_target=ROLE_SUPER_ADMIN,
        title=f'Deadline extended: {batch.name}',
        message=(
            f'Confirmation deadline moved from '
            f'{previous_deadline:%Y-%m-%d %H:%M} to '
            f'{new_deadline:%Y-%m-%d %H:%M}.'
        ),
        notification_type='system',
        related_object_id=batch.id,
        related_object_type=RELATED_TYPE,
        priority='warning',
        metadata={
            'event': 'batch.deadline_extended',
            'previous_deadline': previous_deadline.isoformat() if previous_deadline else None,
            'new_deadline': new_deadline.isoformat() if new_deadline else None,
            'actor_id': getattr(actor, 'id', None),
            'reason': (reason or '')[:300],
        },
    )


def dispute_raised(batch, record):
    _safe_notify(
        role_target=ROLE_SUPER_ADMIN,
        title=f'New dispute: {batch.name}',
        message=(
            f'{record.full_name} ({record.index_number}) flagged their '
            f'record for review.'
        ),
        notification_type='system',
        related_object_id=batch.id,
        related_object_type=RELATED_TYPE,
        priority='warning',
        metadata={'event': 'dispute_raised', 'record_id': str(record.id)},
    )


def delivery_failures_detected(batch, *, sent, failed, bounced):
    total_failed = failed + bounced
    _safe_notify(
        role_target=ROLE_SUPER_ADMIN,
        title=f'{batch.name} — {total_failed} confirmation emails failed to deliver',
        message=(
            f'{sent} sent successfully, {failed} failed, {bounced} bounced. '
            f'Review the failed deliveries on the batch Overview tab and resend where needed.'
        ),
        notification_type='system',
        related_object_id=batch.id,
        related_object_type=RELATED_TYPE,
        priority='critical',
        metadata={'event': 'delivery_failures_detected', 'sent': sent,
                  'failed': failed, 'bounced': bounced},
    )


def resend_complete(batch, *, sent, still_failing, hit_cap, actor):
    _safe_notify(
        recipient=actor,
        title=f'{batch.name} — Resend complete: {sent} sent, {still_failing} still failing',
        message=(
            f'{sent} resend(s) succeeded. '
            f'{still_failing} record(s) still failing.'
            + (f' {hit_cap} record(s) reached the maximum resend limit.' if hit_cap else '')
            + ' Review email addresses before further attempts.'
        ),
        notification_type='system',
        related_object_id=batch.id,
        related_object_type=RELATED_TYPE,
        priority='warning' if still_failing else 'info',
        metadata={'event': 'resend_complete', 'sent': sent,
                  'still_failing': still_failing, 'hit_cap': hit_cap},
    )
