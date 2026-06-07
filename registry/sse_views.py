"""
Session progress SSE.

Streams `progress` events with the live status + counts for a single
``CongregationSession`` so the admin UI can show issuance progress
without polling the REST API.

Authentication mirrors the notifications SSE: ``Authorization: Bearer
<jwt>`` header preferred, falling back to ``?token=`` query parameter so
the native ``EventSource`` (which can't set headers) still works.
"""

import json
import logging
import time

from django.http import StreamingHttpResponse, Http404
from django.shortcuts import get_object_or_404

from registry.models import CongregationSession, StudentRecord
from notifications.sse_views import authenticate_sse_request

logger = logging.getLogger('registry')

# How long to keep the stream open before closing. SSE clients reconnect
# automatically so this just bounds server-side resource usage.
MAX_DURATION_SECONDS = 60 * 10  # 10 minutes
TICK_INTERVAL_SECONDS = 2
KEEPALIVE_INTERVAL_SECONDS = 30


def _format_event(payload, *, event='progress'):
    return f'event: {event}\ndata: {json.dumps(payload)}\n\n'


def _snapshot(session_id):
    session = CongregationSession.objects.filter(pk=session_id).first()
    if not session:
        return None
    qs = StudentRecord.objects.filter(session=session)
    return {
        'session_id': str(session.id),
        'status': session.status,
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


def session_progress_stream(request, session_id):
    """SSE: emits a `progress` event whenever the session snapshot changes."""

    user = authenticate_sse_request(request)
    if not user.is_authenticated:
        return StreamingHttpResponse(
            'event: error\ndata: {"message": "Unauthorized"}\n\n',
            content_type='text/event-stream', status=401,
        )

    # 404 fast if the session doesn't exist so the client doesn't
    # silently retry forever.
    if not CongregationSession.objects.filter(pk=session_id).exists():
        raise Http404('Session not found')

    def generator():
        started = time.time()
        last_keepalive = started
        last_payload = None
        # Emit an initial snapshot immediately.
        snap = _snapshot(session_id)
        if snap is not None:
            last_payload = snap
            yield _format_event(snap)

        while time.time() - started < MAX_DURATION_SECONDS:
            time.sleep(TICK_INTERVAL_SECONDS)
            snap = _snapshot(session_id)
            if snap is None:
                yield 'event: error\ndata: {"message": "Session removed"}\n\n'
                return
            if snap != last_payload:
                last_payload = snap
                yield _format_event(snap)
                last_keepalive = time.time()
                # Once the session reaches a terminal state, push one
                # final event and close cleanly.
                if snap['status'] in (
                    CongregationSession.STATUS_COMPLETED,
                    CongregationSession.STATUS_ARCHIVED,
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
