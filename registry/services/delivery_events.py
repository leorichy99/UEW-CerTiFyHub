"""
Event publisher for email delivery progress.

Uses Django Channels' channel layer (Redis in production, InMemory in dev)
to broadcast per-batch delivery events to SSE consumers.
"""

import json
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from registry.services.delivery_service import EmailDeliveryService

logger = logging.getLogger('registry')


def _group_name(batch_id):
    return f'email_delivery_batch_{batch_id}'


def _safe_publish(payload, batch_id, event_type):
    """Push an event to the per-batch channel group. Failures are swallowed."""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            _group_name(batch_id),
            {
                'type': f'delivery.{event_type}',
                'data': payload,
            },
        )
    except Exception:
        logger.exception('delivery_events: failed to publish %s for batch %s', event_type, batch_id)


def publish_delivery_progress(batch_id):
    """Emit a full summary snapshot after every status change."""
    try:
        from registry.models import IssuanceBatch
        batch = IssuanceBatch.objects.filter(pk=batch_id).first()
        if not batch:
            return
        summary = EmailDeliveryService().get_summary(batch)
        _safe_publish(summary, batch_id, 'progress')
    except Exception:
        logger.exception('delivery_events: progress publish failed for batch %s', batch_id)


def publish_delivery_failure(record, log):
    """Emit a per-record failure event so the admin sees it immediately."""
    try:
        payload = {
            'record_id': str(record.id),
            'student_name': record.full_name,
            'index_number': record.index_number,
            'email': record.institutional_email,
            'status': log.status,
            'failure_reason': (log.error_message or '')[:500],
            'timestamp': log.sent_at.isoformat() if log.sent_at else log.created_at.isoformat(),
        }
        _safe_publish(payload, str(record.batch_id), 'failure')
    except Exception:
        logger.exception('delivery_events: failure publish failed for record %s', record.id)


def publish_delivery_complete(batch_id):
    """Emit once when all emails have reached a terminal state."""
    try:
        from registry.models import IssuanceBatch
        batch = IssuanceBatch.objects.filter(pk=batch_id).first()
        if not batch:
            return
        summary = EmailDeliveryService().get_summary(batch)
        # delivery_complete only needs the final breakdown
        _safe_publish(summary, batch_id, 'complete')
    except Exception:
        logger.exception('delivery_events: complete publish failed for batch %s', batch_id)
