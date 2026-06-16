"""
Event publisher for import progress.

Uses Django Channels' channel layer (Redis in production, InMemory in dev)
to broadcast per-import progress events to SSE consumers.
"""

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger('registry')


def _group_name(import_batch_id):
    return f'import_progress_{import_batch_id}'


def _safe_publish(payload, import_batch_id, event_type):
    """Push an event to the per-import channel group. Failures are swallowed."""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            _group_name(import_batch_id),
            {
                'type': f'import.{event_type}',
                'data': payload,
            },
        )
    except Exception:
        logger.exception('import_events: failed to publish %s for import %s', event_type, import_batch_id)


def publish_import_progress(import_batch_id, stats):
    """Emit progress stats during import processing."""
    _safe_publish(stats, import_batch_id, 'progress')


def publish_import_complete(import_batch_id, summary):
    """Emit completion event when import finishes."""
    _safe_publish(summary, import_batch_id, 'complete')
