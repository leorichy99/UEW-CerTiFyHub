"""Congregation admin endpoints.

Read-mostly endpoints for the umbrella entity. Sessions remain owned by the
existing ``CongregationSessionViewSet``.
"""

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from core.permissions import IsActiveAccount, IsSuperAdmin
from registry.models import Congregation, CongregationSession
from registry.serializers import (
    CongregationSerializer, CongregationSessionSerializer,
)
from registry.services import CongregationService, CongregationError


class CongregationViewSet(viewsets.ModelViewSet):
    """CRUD for Congregations.

    `update`/`destroy` are intentionally locked down to safer alternatives:
      - rename/description edits via PATCH (only when no sessions are Published)
      - destruction blocked — use ``archive`` instead.
    """

    queryset = Congregation.objects.select_related(
        'created_by', 'sourced_from_congregation',
    ).all()
    serializer_class = CongregationSerializer
    permission_classes = [permissions.IsAuthenticated, IsActiveAccount, IsSuperAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        year = params.get('year')
        if year:
            qs = qs.filter(year=year)
        search = params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        return qs.order_by('-year')

    # ── List / retrieve enrichment ──────────────────────────────────────

    def _enrich(self, congregation):
        """Attach derived status, session count, and aggregate counts."""
        service = CongregationService()
        congregation._derived_status = service.get_status(congregation)
        congregation.session_count = CongregationSession.objects.filter(
            congregation=congregation,
        ).count()
        congregation.counts = service.get_aggregate_counts(congregation)
        return congregation

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        congregations = [self._enrich(c) for c in queryset]

        # Optional `status` filter operates post-derivation (supports CSV).
        status_filter = request.query_params.get('status')
        if status_filter:
            allowed = {s.strip() for s in status_filter.split(',')}
            congregations = [
                c for c in congregations if c._derived_status in allowed
            ]

        page = self.paginate_queryset(congregations)
        target = page if page is not None else congregations
        serializer = self.get_serializer(target, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        congregation = self._enrich(self.get_object())
        data = self.get_serializer(congregation).data
        sessions_qs = (
            CongregationSession.objects
            .filter(congregation=congregation)
            .select_related('faculty', 'department', 'certificate_template', 'created_by')
            .order_by('session_number')
        )
        data['sessions'] = CongregationSessionSerializer(sessions_qs, many=True).data
        return Response(data)

    # ── Create ──────────────────────────────────────────────────────────

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            congregation = CongregationService().create(
                name=serializer.validated_data.get('name'),
                year=serializer.validated_data.get('year'),
                description=serializer.validated_data.get('description', ''),
                created_by=request.user,
            )
        except CongregationError as e:
            raise ValidationError(str(e))
        out = self.get_serializer(self._enrich(congregation))
        return Response(out.data, status=status.HTTP_201_CREATED)

    # ── Update — allow only safe edits ──────────────────────────────────

    def update(self, request, *args, **kwargs):
        # Full PUT is intentionally not supported; route to PATCH for clarity.
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)

    def perform_update(self, serializer):
        # Year cannot change once set. Reject the field if present.
        if 'year' in serializer.validated_data:
            raise ValidationError({'year': 'Year cannot be changed after creation.'})
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            'Congregations cannot be deleted. Archive completed sessions instead.'
        )

    # ── Actions ─────────────────────────────────────────────────────────

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        congregation = self.get_object()
        try:
            result = CongregationService().archive(
                congregation, actor=request.user,
            )
        except CongregationError as e:
            raise ValidationError(str(e))
        return Response({
            **self.get_serializer(self._enrich(congregation)).data,
            'archive_summary': result,
        })
