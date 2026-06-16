"""Issuance-run admin endpoints."""

from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from core.permissions import IsActiveAccount, IsSuperAdmin
from registry.models import IssuanceBatch, IssuanceRun
from registry.serializers import IssuanceRunSerializer
from registry.services import IssuanceRunService, IssuanceError


class IssuanceRunViewSet(viewsets.ReadOnlyModelViewSet):
    """List + retrieve issuance runs; POST to create-and-run a new one.

    Nested under ``/batches/{batch_pk}/issuance-runs/`` so the API
    mirrors how admins think about the data (batch → runs → records).
    """

    serializer_class = IssuanceRunSerializer
    permission_classes = [permissions.IsAuthenticated, IsActiveAccount, IsSuperAdmin]

    def _get_batch(self):
        batch_id = self.kwargs.get('batch_pk')
        try:
            return IssuanceBatch.objects.get(pk=batch_id)
        except IssuanceBatch.DoesNotExist as e:
            raise ValidationError({'batch': 'Batch does not exist.'}) from e

    def get_queryset(self):
        batch = self._get_batch()
        return (
            IssuanceRun.objects
            .filter(batch=batch)
            .select_related('requested_by', 'batch')
            .order_by('-created_at')
        )

    def create(self, request, batch_pk=None):
        """Create + execute a new run synchronously.

        Body: ``{ "filter_criteria": {...}, "notes": "..." }``
        """
        batch = self._get_batch()
        try:
            run, result = IssuanceRunService().create_and_run(
                batch=batch,
                requested_by=request.user,
                filter_criteria=request.data.get('filter_criteria') or {},
                notes=(request.data.get('notes') or '').strip(),
            )
        except IssuanceError as e:
            raise ValidationError(str(e))
        return Response(
            {
                **self.get_serializer(run).data,
                'execution': result,
            },
            status=status.HTTP_201_CREATED,
        )
