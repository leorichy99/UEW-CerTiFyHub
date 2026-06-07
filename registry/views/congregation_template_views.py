"""Congregation template admin endpoints (Slice 4)."""

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from core.permissions import IsActiveAccount, IsSuperAdmin
from registry.models import Congregation, CongregationTemplate
from registry.serializers import (
    CongregationTemplateSerializer, CongregationSessionSerializer,
)
from registry.services import (
    CongregationTemplateService, CongregationTemplateError,
)


class CongregationTemplateViewSet(viewsets.ModelViewSet):
    """CRUD for reusable congregation schedules.

    Custom actions:
      - ``POST .../{id}/apply/``   — instantiate into a target congregation.
      - ``POST .../from-congregation/`` — snapshot an existing congregation.
    """

    queryset = (
        CongregationTemplate.objects
        .select_related('created_by', 'sourced_from_congregation')
        .prefetch_related('session_defs')
        .all()
    )
    serializer_class = CongregationTemplateSerializer
    permission_classes = [permissions.IsAuthenticated, IsActiveAccount, IsSuperAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        active = params.get('is_active')
        if active is not None:
            if active.lower() in {'1', 'true', 'yes'}:
                qs = qs.filter(is_active=True)
            elif active.lower() in {'0', 'false', 'no'}:
                qs = qs.filter(is_active=False)
        search = params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        return qs.order_by('-created_at')

    # ── Create / update — route through the service for invariants ──────

    def create(self, request, *args, **kwargs):
        session_defs = request.data.get('session_defs') or []
        try:
            template = CongregationTemplateService().create(
                name=request.data.get('name'),
                description=request.data.get('description', ''),
                created_by=request.user,
                session_defs=session_defs,
            )
        except CongregationTemplateError as e:
            raise ValidationError(str(e))
        return Response(
            self.get_serializer(template).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        # PATCH-only — full PUT semantics are awkward when session_defs
        # is a nested write.
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)

    def perform_update(self, serializer):
        instance = serializer.instance
        data = serializer.validated_data
        try:
            CongregationTemplateService().update(
                instance,
                name=data.get('name'),
                description=data.get('description'),
                is_active=data.get('is_active'),
                session_defs=self.request.data.get('session_defs'),
            )
        except CongregationTemplateError as e:
            raise ValidationError(str(e))

    # ── Custom actions ─────────────────────────────────────────────────

    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        """Instantiate this template into a target congregation.

        Body: ``{ "congregation": "<uuid>", "overrides": {...} }``
        """
        template = self.get_object()
        target_id = request.data.get('congregation')
        if not target_id:
            raise ValidationError({'congregation': 'Required.'})
        target = Congregation.objects.filter(pk=target_id).first()
        if not target:
            raise ValidationError({'congregation': 'Not found.'})

        try:
            sessions = CongregationTemplateService().apply_to_congregation(
                template, target,
                actor=request.user,
                overrides=request.data.get('overrides') or {},
            )
        except CongregationTemplateError as e:
            raise ValidationError(str(e))
        return Response({
            'template': self.get_serializer(template).data,
            'sessions': CongregationSessionSerializer(sessions, many=True).data,
        })

    @action(detail=False, methods=['post'], url_path='from-congregation')
    def from_congregation(self, request):
        """Snapshot an existing congregation's sessions into a new template."""
        congregation_id = request.data.get('congregation')
        name = request.data.get('name')
        description = request.data.get('description', '')
        if not congregation_id:
            raise ValidationError({'congregation': 'Required.'})
        if not name:
            raise ValidationError({'name': 'Required.'})
        congregation = Congregation.objects.filter(pk=congregation_id).first()
        if not congregation:
            raise ValidationError({'congregation': 'Not found.'})

        try:
            template = CongregationTemplateService().snapshot_from_congregation(
                congregation, name=name, description=description,
                created_by=request.user,
            )
        except CongregationTemplateError as e:
            raise ValidationError(str(e))
        return Response(
            self.get_serializer(template).data,
            status=status.HTTP_201_CREATED,
        )
