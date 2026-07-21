"""Dispute resolution endpoints (admin-only)."""

from django.http import FileResponse, Http404
from rest_framework import status, permissions
from rest_framework.exceptions import ValidationError, NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsActiveAccount, IsSuperAdmin
from registry.models import IssuanceBatch, StudentRecord, Dispute
from registry.serializers import StudentRecordSerializer
from registry.services import DisputeService, DisputeResolutionError


class BatchDisputesView(APIView):
    """List records in DISPUTED status for a batch."""

    permission_classes = [permissions.IsAuthenticated, IsActiveAccount, IsSuperAdmin]

    def get(self, request, batch_pk):
        try:
            batch = IssuanceBatch.objects.get(pk=batch_pk)
        except IssuanceBatch.DoesNotExist:
            raise NotFound('Batch not found.')
        qs = DisputeService().list_disputes(batch)
        data = StudentRecordSerializer(qs, many=True).data
        return Response(data)


class ResolveDisputeView(APIView):
    """Resolve a single dispute by correcting or rejecting it."""

    permission_classes = [permissions.IsAuthenticated, IsActiveAccount, IsSuperAdmin]

    def post(self, request, batch_pk, record_pk):
        try:
            record = (
                StudentRecord.objects
                .select_related('batch')
                .get(pk=record_pk, batch_id=batch_pk)
            )
        except StudentRecord.DoesNotExist:
            raise NotFound('Record not found in this batch.')

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


class DisputeDocumentView(APIView):
    """Serve supporting document for a dispute (admin-only)."""

    permission_classes = [permissions.IsAuthenticated, IsActiveAccount, IsSuperAdmin]

    def get(self, request, dispute_pk):
        try:
            dispute = Dispute.objects.get(pk=dispute_pk)
        except Dispute.DoesNotExist:
            raise NotFound('Dispute not found.')

        if not dispute.supporting_document:
            raise NotFound('No document attached to this dispute.')

        # Serve file with Content-Disposition: attachment
        response = FileResponse(
            dispute.supporting_document.open('rb'),
            content_type='application/octet-stream'
        )
        filename = dispute.supporting_document_filename or 'document'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class DisputeDetailView(APIView):
    """Get detailed information about a specific dispute (admin-only)."""

    permission_classes = [permissions.IsAuthenticated, IsActiveAccount, IsSuperAdmin]

    def get(self, request, dispute_pk):
        try:
            dispute = Dispute.objects.select_related('student_record').get(pk=dispute_pk)
        except Dispute.DoesNotExist:
            raise NotFound('Dispute not found.')

        record = dispute.student_record

        return Response({
            'id': str(dispute.id),
            'dispute_type': dispute.dispute_type,
            'dispute_type_display': dispute.get_dispute_type_display(),
            'claimed_first_name': dispute.claimed_first_name,
            'claimed_middle_name': dispute.claimed_middle_name,
            'claimed_last_name': dispute.claimed_last_name,
            'claimed_value': dispute.claimed_value,
            'dispute_note': dispute.dispute_note,
            'has_supporting_document': bool(dispute.supporting_document),
            'supporting_document_filename': dispute.supporting_document_filename,
            'is_pending': dispute.is_pending,
            'created_at': dispute.created_at.isoformat() if dispute.created_at else None,
            'resolved_at': dispute.resolved_at.isoformat() if dispute.resolved_at else None,
            'resolved_by': dispute.resolved_by.email if dispute.resolved_by else None,
            'resolution_note': dispute.resolution_note,
            # Current record values for comparison
            'record': {
                'id': str(record.id),
                'index_number': record.index_number,
                'first_name': record.first_name,
                'middle_name': record.middle_name,
                'last_name': record.last_name,
                'programme': record.programme,
                'class_of_degree': record.class_of_degree,
                'confirmation_status': record.confirmation_status,
            },
        })
