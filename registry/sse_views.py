"""
Batch progress SSE.

Streams `progress` events with the live status + counts for a single
``IssuanceBatch`` so the admin UI can show issuance progress
without polling the REST API.

Authentication mirrors the notifications SSE: ``Authorization: Bearer
<jwt>`` header preferred, falling back to ``?token=`` query parameter so
the native ``EventSource`` (which can't set headers) still works.
"""

import asyncio
import json
import logging
import time

from asgiref.sync import sync_to_async
from channels.layers import get_channel_layer
from django.http import StreamingHttpResponse, Http404
from django.shortcuts import get_object_or_404

from registry.models import IssuanceBatch, StudentRecord
from notifications.sse_views import authenticate_sse_request, _sse_event, _keep_alive

logger = logging.getLogger('registry')

# How long to keep the stream open before closing. SSE clients reconnect
# automatically so this just bounds server-side resource usage.
MAX_DURATION_SECONDS = 60 * 10  # 10 minutes
TICK_INTERVAL_SECONDS = 2
KEEPALIVE_INTERVAL_SECONDS = 30


def _format_event(payload, *, event='progress'):
    return f'event: {event}\ndata: {json.dumps(payload)}\n\n'


def _snapshot(batch_id):
    batch = IssuanceBatch.objects.filter(pk=batch_id).first()
    if not batch:
        return None
    qs = StudentRecord.objects.filter(batch=batch)
    return {
        'batch_id': str(batch.id),
        'status': batch.status,
        'counts': {
            'total': qs.count(),
            'pending': qs.filter(
                confirmation_status=StudentRecord.CONF_PENDING,
            ).count(),
            'confirmed': qs.filter(
                confirmation_status=StudentRecord.CONF_CONFIRMED,
            ).count(),
            'disputed': qs.filter(
                confirmation_status=StudentRecord.CONF_DISPUTED,
            ).count(),
            'flagged': qs.filter(
                confirmation_status=StudentRecord.CONF_FLAGGED,
            ).count(),
            'queued': qs.filter(
                issuance_status=StudentRecord.ISSUE_QUEUED,
            ).count(),
            'issued': qs.filter(
                issuance_status=StudentRecord.ISSUE_ISSUED,
            ).count(),
            'issuance_failed': qs.filter(
                issuance_status=StudentRecord.ISSUE_FAILED,
            ).count(),
        },
    }


def batch_progress_stream(request, batch_id):
    """SSE: emits a `progress` event whenever the batch snapshot changes."""

    user = authenticate_sse_request(request)
    if not user.is_authenticated:
        return StreamingHttpResponse(
            'event: error\ndata: {"message": "Unauthorized"}\n\n',
            content_type='text/event-stream', status=401,
        )

    # 404 fast if the batch doesn't exist so the client doesn't
    # silently retry forever.
    if not IssuanceBatch.objects.filter(pk=batch_id).exists():
        raise Http404('Batch not found')

    def generator():
        started = time.time()
        last_keepalive = started
        last_payload = None
        # Emit an initial snapshot immediately.
        snap = _snapshot(batch_id)
        if snap is not None:
            last_payload = snap
            yield _format_event(snap)

        while time.time() - started < MAX_DURATION_SECONDS:
            time.sleep(TICK_INTERVAL_SECONDS)
            snap = _snapshot(batch_id)
            if snap is None:
                yield 'event: error\ndata: {"message": "Batch removed"}\n\n'
                return
            if snap != last_payload:
                last_payload = snap
                yield _format_event(snap)
                last_keepalive = time.time()
                # Once the batch reaches a terminal state, push one
                # final event and close cleanly.
                if snap['status'] in (
                    IssuanceBatch.STATUS_COMPLETED,
                    IssuanceBatch.STATUS_ARCHIVED,
                ):
                    return
            elif time.time() - last_keepalive > KEEPALIVE_INTERVAL_SECONDS:
                last_keepalive = time.time()
                yield ': keep-alive\n\n'

    response = StreamingHttpResponse(
        generator(), content_type='text/event-stream',
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    response['Connection'] = 'keep-alive'
    return response


# ── Email delivery progress SSE (async, channel-layer backed) ────────────

async def import_progress_stream(request, batch_id, import_batch_id):
    """SSE: emits live import processing progress for an ImportBatch."""
    user = await sync_to_async(authenticate_sse_request)(request)
    if not user.is_authenticated:
        return StreamingHttpResponse(
            'event: error\ndata: {"message": "Unauthorized"}\n\n',
            content_type='text/event-stream', status=401,
        )

    from registry.models import ImportBatch
    if not await sync_to_async(
        ImportBatch.objects.filter(pk=import_batch_id).exists
    )():
        raise Http404('Import batch not found')

    async def event_stream():
        channel_layer = get_channel_layer()
        channel_name = await channel_layer.new_channel()
        group = f'import_progress_{import_batch_id}'
        await channel_layer.group_add(group, channel_name)

        try:
            while True:
                try:
                    message = await asyncio.wait_for(
                        channel_layer.receive(channel_name),
                        timeout=KEEPALIVE_INTERVAL_SECONDS,
                    )
                except asyncio.TimeoutError:
                    yield _keep_alive()
                    continue

                msg_type = message.get('type', '')
                data = message.get('data', {})

                if msg_type == 'import.progress':
                    yield _sse_event(data, event_type='import_progress')
                elif msg_type == 'import.complete':
                    yield _sse_event(data, event_type='import_complete')
                    return
        finally:
            try:
                await channel_layer.group_discard(group, channel_name)
            except Exception:
                pass

    response = StreamingHttpResponse(
        event_stream(), content_type='text/event-stream',
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    response['Connection'] = 'keep-alive'
    return response


async def email_delivery_stream(request, batch_id):
    """SSE: emits live email delivery progress for a batch.

    Uses the Django Channels layer (Redis in production) so events pushed
    by the Celery worker are forwarded to the connected admin browser.
    """
    user = await sync_to_async(authenticate_sse_request)(request)
    if not user.is_authenticated:
        return StreamingHttpResponse(
            'event: error\ndata: {"message": "Unauthorized"}\n\n',
            content_type='text/event-stream', status=401,
        )

    if not await sync_to_async(IssuanceBatch.objects.filter(pk=batch_id).exists)():
        raise Http404('Batch not found')

    async def event_stream():
        channel_layer = get_channel_layer()
        channel_name = await channel_layer.new_channel()
        group = f'email_delivery_batch_{batch_id}'
        await channel_layer.group_add(group, channel_name)

        try:
            # Emit an initial snapshot immediately
            summary = await sync_to_async(
                lambda: __import__('registry.services.delivery_service', fromlist=['EmailDeliveryService']).EmailDeliveryService().get_summary(
                    IssuanceBatch.objects.get(pk=batch_id)
                )
            )()
            yield _sse_event(summary, event_type='delivery_progress')

            while True:
                try:
                    message = await asyncio.wait_for(
                        channel_layer.receive(channel_name),
                        timeout=KEEPALIVE_INTERVAL_SECONDS,
                    )
                except asyncio.TimeoutError:
                    yield _keep_alive()
                    continue

                msg_type = message.get('type', '')
                data = message.get('data', {})

                if msg_type == 'delivery.progress':
                    yield _sse_event(data, event_type='delivery_progress')
                elif msg_type == 'delivery.failure':
                    yield _sse_event(data, event_type='delivery_failure')
                elif msg_type == 'delivery.complete':
                    yield _sse_event(data, event_type='delivery_complete')
                    # Close cleanly once delivery is complete
                    return
        finally:
            try:
                await channel_layer.group_discard(group, channel_name)
            except Exception:
                pass

    response = StreamingHttpResponse(
        event_stream(), content_type='text/event-stream',
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    response['Connection'] = 'keep-alive'
    return response
