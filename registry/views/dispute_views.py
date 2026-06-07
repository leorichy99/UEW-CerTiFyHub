"""Dispute resolution endpoints (admin-only)."""

from rest_framework import status, permissions
from rest_framework.exceptions import ValidationError, NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsActiveAccount, IsSuperAdmin
from registry.models import CongregationSession, StudentRecord
from registry.serializers import StudentRecordSerializer
from registry.services import DisputeService, DisputeResolutionError


class SessionDisputesView(APIView):
    """List records in DISPUTED status for a session."""

    permission_classes = [permissions.IsAuthenticated, IsActiveAccount, IsSuperAdmin]

    def get(self, request, session_pk):
        try:
            session = CongregationSession.objects.get(pk=session_pk)
        except CongregationSession.DoesNotExist:
            raise NotFound('Session not found.')
        qs = DisputeService().list_disputes(session)
        data = StudentRecordSerializer(qs, many=True).data
        return Response(data)


class ResolveDisputeView(APIView):
    """Resolve a single dispute by correcting or rejecting it."""

    permission_classes = [permissions.IsAuthenticated, IsActiveAccount, IsSuperAdmin]

    def post(self, request, session_pk, record_pk):
        try:
            record = (
                StudentRecord.objects
                .select_related('session')
                .get(pk=record_pk, session_id=session_pk)
            )
        except StudentRecord.DoesNotExist:
            raise NotFound('Record not found in this session.')

        mode = request.data.get('mode')
        note = request.data.get('resolution_note', '')
        corrections = request.data.get('corrections') or {}
        service = DisputeService()

        try:
            if mode == 'correct':
                if not isinstance(corrections, dict) or not corrections:
                    raise ValidationError({
                        'corrections': 'Provide at least one corrected field.',
                    })
                service.correct(
                    record, actor=request.user,
                    corrections=corrections, resolution_note=note,
                )
            elif mode == 'reject':
                service.reject(
                    record, actor=request.user, resolution_note=note,
                )
            else:
                raise ValidationError({'mode': "Must be 'correct' or 'reject'."})
        except DisputeResolutionError as e:
            raise ValidationError(str(e))

        record.refresh_from_db()
        return Response(StudentRecordSerializer(record).data)
