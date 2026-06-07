"""Issuance-batch admin endpoints (Slice 3)."""

from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from core.permissions import IsActiveAccount, IsSuperAdmin
from registry.models import CongregationSession, IssuanceBatch
from registry.serializers import IssuanceBatchSerializer
from registry.services import IssuanceBatchService, IssuanceError


class IssuanceBatchViewSet(viewsets.ReadOnlyModelViewSet):
    """List + retrieve issuance batches; POST to create-and-run a new one.

    Nested under ``/sessions/{session_pk}/issuance-batches/`` so the API
    mirrors how admins think about the data (session → batches → records).
    """

    serializer_class = IssuanceBatchSerializer
    permission_classes = [permissions.IsAuthenticated, IsActiveAccount, IsSuperAdmin]

    def _get_session(self):
        session_id = self.kwargs.get('session_pk')
        try:
            return CongregationSession.objects.get(pk=session_id)
        except CongregationSession.DoesNotExist as e:
            raise ValidationError({'session': 'Session does not exist.'}) from e

    def get_queryset(self):
        session = self._get_session()
        return (
            IssuanceBatch.objects
            .filter(session=session)
            .select_related('requested_by', 'session', 'congregation')
            .order_by('-created_at')
        )

    def create(self, request, session_pk=None):
        """Create + execute a new batch synchronously.

        Body: ``{ "filter_criteria": {...}, "notes": "..." }``
        """
        session = self._get_session()
        try:
            batch, result = IssuanceBatchService().create_and_run(
                session=session,
                requested_by=request.user,
                filter_criteria=request.data.get('filter_criteria') or {},
                notes=(request.data.get('notes') or '').strip(),
            )
        except IssuanceError as e:
            raise ValidationError(str(e))
        return Response(
            {
                **self.get_serializer(batch).data,
                'execution': result,
            },
            status=status.HTTP_201_CREATED,
        )
