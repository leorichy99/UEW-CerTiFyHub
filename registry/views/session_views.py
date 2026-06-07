"""Session, student-record and import-batch admin endpoints."""

from django.utils.dateparse import parse_datetime

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied

from core.permissions import IsActiveAccount, IsSuperAdmin
from registry.models import (
    CongregationSession, StudentRecord, ImportBatch, DeadlineExtensionLog,
)
from registry.serializers import (
    CongregationSessionSerializer, StudentRecordSerializer, ImportBatchSerializer,
    DeadlineExtensionLogSerializer,
)
from registry.services import notifier as registry_notifier
from registry.services import (
    SessionLifecycleService, SessionLifecycleError,
    ImportService, ImportRejected,
    PublicationService, PublicationError,
    IssuanceService, IssuanceError,
)


class CongregationSessionViewSet(viewsets.ModelViewSet):
    """Super-Admin-only CRUD over congregation sessions, plus pipeline actions."""

    queryset = CongregationSession.objects.select_related(
        'congregation', 'faculty', 'department', 'certificate_template', 'created_by',
    ).all().order_by('-created_at')
    serializer_class = CongregationSessionSerializer
    permission_classes = [permissions.IsAuthenticated, IsActiveAccount, IsSuperAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        for key in ('status', 'academic_year'):
            value = params.get(key)
            if value:
                qs = qs.filter(**{key: value})
        for key in ('faculty', 'department', 'congregation'):
            value = params.get(key)
            if value:
                qs = qs.filter(**{f'{key}_id': value})
        search = params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        return qs

    def perform_create(self, serializer):
        service = SessionLifecycleService()
        try:
            session = service.create(
                **serializer.validated_data,
                created_by=self.request.user,
            )
        except SessionLifecycleError as e:
            raise ValidationError(str(e))
        serializer.instance = session

    # ── Quick create ──────────────────────────────────────────────────────

    @action(detail=False, methods=['post'], url_path='quick-create')
    def quick_create(self, request):
        """Create a congregation + session in one step for the simplified batch flow."""
        data = request.data
        name = (data.get('name') or '').strip()
        template_id = data.get('certificate_template')
        raw_deadline = data.get('confirmation_deadline')

        if not name:
            raise ValidationError({'name': 'Required.'})
        if not template_id:
            raise ValidationError({'certificate_template': 'Required.'})
        if not raw_deadline:
            raise ValidationError({'confirmation_deadline': 'Required.'})

        from django.utils.dateparse import parse_datetime
        parsed = parse_datetime(raw_deadline)
        if parsed is None:
            raise ValidationError({'confirmation_deadline': 'Must be an ISO-8601 datetime string.'})

        from datetime import datetime
        deadline_year = parsed.year
        if deadline_year < datetime.now().year:
            raise ValidationError({'confirmation_deadline': 'Deadline cannot be in a past year.'})

        from registry.models import Congregation
        from templates.models import CertificateTemplate

        try:
            template = CertificateTemplate.objects.get(pk=template_id)
        except CertificateTemplate.DoesNotExist:
            raise ValidationError({'certificate_template': 'Template not found.'})

        # Find or create congregation for this year.
        congregation, _ = Congregation.objects.get_or_create(
            year=deadline_year,
            defaults={
                'name': name,
                'created_by': request.user,
            },
        )

        service = SessionLifecycleService()
        try:
            session = service.create(
                congregation=congregation,
                name=name,
                academic_year=str(deadline_year),
                scope_type=CongregationSession.SCOPE_INSTITUTION,
                confirmation_deadline=parsed,
                certificate_template=template,
                created_by=request.user,
            )
        except SessionLifecycleError as e:
            raise ValidationError(str(e))

        return Response(
            CongregationSessionSerializer(session, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        session = self.get_object()
        if session.status != CongregationSession.STATUS_DRAFT:
            raise ValidationError(
                'Only Draft sessions can be edited.'
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        session = self.get_object()
        if session.status != CongregationSession.STATUS_DRAFT:
            raise ValidationError('Only Draft sessions can be deleted.')
        return super().destroy(request, *args, **kwargs)

    # ── Pipeline actions ──────────────────────────────────────────────────

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish a Draft session: generate tokens, dispatch invitations."""
        session = self.get_object()
        try:
            result = PublicationService().publish(session, actor=request.user)
        except PublicationError as e:
            raise ValidationError(str(e))
        except SessionLifecycleError as e:
            raise ValidationError(str(e))
        session.refresh_from_db()
        return Response({
            **self.get_serializer(session).data,
            'publication_summary': result,
        })

    @action(detail=True, methods=['post'], url_path='close-confirmation')
    def close_confirmation(self, request, pk=None):
        """Close the confirmation window; auto-flag still-pending records."""
        session = self.get_object()
        try:
            result = IssuanceService().close_confirmation(session, actor=request.user)
        except IssuanceError as e:
            raise ValidationError(str(e))
        session.refresh_from_db()
        return Response({
            **self.get_serializer(session).data,
            'flagged_records': result['flagged'],
        })

    @action(detail=True, methods=['post'], url_path='start-issuance')
    def start_issuance(self, request, pk=None):
        """Begin certificate issuance for confirmed records."""
        session = self.get_object()
        try:
            result = IssuanceService().start_issuance(session, actor=request.user)
        except IssuanceError as e:
            raise ValidationError(str(e))
        session.refresh_from_db()
        return Response({
            **self.get_serializer(session).data,
            'issued_records': result['issued'],
            'failed_records': result['failed'],
        })

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark the session COMPLETED once all issuance is finished."""
        session = self.get_object()
        try:
            IssuanceService().complete(session, actor=request.user)
        except IssuanceError as e:
            raise ValidationError(str(e))
        session.refresh_from_db()
        return Response(self.get_serializer(session).data)

    @action(detail=True, methods=['post'], url_path='extend-deadline')
    def extend_deadline(self, request, pk=None):
        """Push back the confirmation deadline for a Published/Open session.

        Body: ``{ "new_deadline": "<ISO8601>", "reason": "<optional, <=300 chars>" }``
        """
        session = self.get_object()
        raw_deadline = request.data.get('new_deadline')
        if not raw_deadline:
            raise ValidationError({'new_deadline': 'Required.'})
        parsed = parse_datetime(raw_deadline)
        if parsed is None:
            raise ValidationError({
                'new_deadline': 'Must be an ISO-8601 datetime string.',
            })
        reason = (request.data.get('reason') or '').strip()
        if len(reason) > 300:
            raise ValidationError({'reason': 'Maximum 300 characters.'})

        previous_deadline = session.confirmation_deadline
        try:
            log = SessionLifecycleService().extend_confirmation_deadline(
                session, new_deadline=parsed, actor=request.user, reason=reason,
            )
        except SessionLifecycleError as e:
            raise ValidationError(str(e))

        # Fire notification outside the service so the lifecycle layer stays
        # free of the notifications app's payload shape.
        registry_notifier.deadline_extended(
            session,
            previous_deadline=previous_deadline,
            new_deadline=log.new_deadline,
            actor=request.user,
            reason=reason,
        )

        session.refresh_from_db()
        return Response({
            **self.get_serializer(session).data,
            'extension': DeadlineExtensionLogSerializer(log).data,
        })

    @action(detail=True, methods=['get'], url_path='deadline-extensions')
    def deadline_extensions(self, request, pk=None):
        """Read-only history of all extensions for this session."""
        session = self.get_object()
        qs = (
            DeadlineExtensionLog.objects
            .filter(session=session)
            .select_related('extended_by')
            .order_by('-extended_at')
        )
        return Response(DeadlineExtensionLogSerializer(qs, many=True).data)

    @action(detail=True, methods=['post'])
    def transition(self, request, pk=None):
        """Generic forward transition; later slices wrap this in dedicated endpoints."""
        session = self.get_object()
        to_status = request.data.get('to_status')
        note = request.data.get('note', '')
        if not to_status:
            raise ValidationError({'to_status': 'Required.'})
        service = SessionLifecycleService()
        try:
            service.transition(session, to_status, actor=request.user, note=note)
        except SessionLifecycleError as e:
            raise ValidationError(str(e))
        return Response(self.get_serializer(session).data)


class StudentRecordViewSet(viewsets.ModelViewSet):
    """Records nested under a session. Mutable only while session is Draft."""

    serializer_class = StudentRecordSerializer
    permission_classes = [permissions.IsAuthenticated, IsActiveAccount, IsSuperAdmin]

    def get_session(self):
        session_id = self.kwargs.get('session_pk')
        try:
            return CongregationSession.objects.get(pk=session_id)
        except CongregationSession.DoesNotExist as e:
            raise ValidationError({'session': 'Session does not exist.'}) from e

    def get_queryset(self):
        session = self.get_session()
        qs = StudentRecord.objects.filter(session=session).select_related(
            'faculty', 'department', 'import_batch',
        ).order_by('full_name')
        params = self.request.query_params
        for key in ('confirmation_status', 'issuance_status'):
            value = params.get(key)
            if value:
                qs = qs.filter(**{key: value})
        search = params.get('search')
        if search:
            qs = qs.filter(full_name__icontains=search)
        return qs

    def perform_create(self, serializer):
        session = self.get_session()
        if not SessionLifecycleService.can_edit_records(session):
            raise PermissionDenied('Records can only be added to a Draft session.')
        serializer.save(session=session)

    def perform_update(self, serializer):
        session = serializer.instance.session
        if not SessionLifecycleService.can_edit_records(session):
            raise PermissionDenied('Records can only be edited in a Draft session.')
        serializer.save()

    def perform_destroy(self, instance):
        if not SessionLifecycleService.can_edit_records(instance.session):
            raise PermissionDenied('Records can only be deleted from a Draft session.')
        instance.delete()


class ImportBatchViewSet(viewsets.ReadOnlyModelViewSet):
    """List import batches and upload new files for a session."""

    serializer_class = ImportBatchSerializer
    permission_classes = [permissions.IsAuthenticated, IsActiveAccount, IsSuperAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_session(self):
        session_id = self.kwargs.get('session_pk')
        try:
            return CongregationSession.objects.get(pk=session_id)
        except CongregationSession.DoesNotExist as e:
            raise ValidationError({'session': 'Session does not exist.'}) from e

    def get_queryset(self):
        session = self.get_session()
        return ImportBatch.objects.filter(session=session).order_by('-uploaded_at')

    @action(detail=False, methods=['post'], url_path='upload')
    def upload(self, request, session_pk=None):
        session = self.get_session()
        upload = request.FILES.get('file')
        if not upload:
            raise ValidationError({'file': 'A CSV or XLSX file is required.'})
        raw = upload.read()
        try:
            batch = ImportService().process_upload(
                session=session,
                uploaded_by=request.user,
                file_name=upload.name,
                raw_bytes=raw,
            )
        except ImportRejected as e:
            raise ValidationError(str(e))
        return Response(
            ImportBatchSerializer(batch).data, status=status.HTTP_201_CREATED
        )
