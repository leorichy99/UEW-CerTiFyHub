"""Batch, student-record and import-batch admin endpoints."""

import io
import json
import os
import uuid
from datetime import datetime, timedelta

from django.conf import settings
from django.core.files.storage import default_storage
from django.db.models import Q
from django.utils.dateparse import parse_datetime

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied

from core.permissions import IsActiveAccount, IsSuperAdmin
from registry.models import (
    IssuanceBatch, StudentRecord, ImportBatch, DeadlineExtensionLog,
)
from registry.serializers import (
    IssuanceBatchSerializer, StudentRecordSerializer, ImportBatchSerializer,
    DeadlineExtensionLogSerializer, EmailDeliveryFailureSerializer,
)
from registry.services import notifier as registry_notifier
from registry.services import (
    BatchLifecycleService, BatchLifecycleError,
    ImportService, ImportRejected,
    PublicationService, PublicationError,
    IssuanceService, IssuanceError,
)
from registry.services.delivery_service import (
    EmailDeliveryService, DeliveryError, MaxResendError,
)


class IssuanceBatchViewSet(viewsets.ModelViewSet):
    """Super-Admin-only CRUD over issuance batches, plus pipeline actions."""

    queryset = IssuanceBatch.objects.select_related(
        'certificate_template', 'created_by',
    ).all().order_by('-created_at')
    serializer_class = IssuanceBatchSerializer
    permission_classes = [permissions.IsAuthenticated, IsActiveAccount, IsSuperAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        for key in ('status', 'year'):
            value = params.get(key)
            if value:
                qs = qs.filter(**{key: value})
        search = params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        return qs

    def perform_create(self, serializer):
        service = BatchLifecycleService()
        try:
            batch = service.create(
                **serializer.validated_data,
                created_by=self.request.user,
            )
        except BatchLifecycleError as e:
            raise ValidationError(str(e))
        serializer.instance = batch

    def update(self, request, *args, **kwargs):
        batch = self.get_object()
        if batch.status != IssuanceBatch.STATUS_DRAFT:
            raise ValidationError('Only Draft batches can be edited.')
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        batch = self.get_object()
        if batch.status != IssuanceBatch.STATUS_DRAFT:
            raise ValidationError('Only Draft batches can be deleted.')
        return super().destroy(request, *args, **kwargs)

    # ── Pipeline actions ──────────────────────────────────────────────────

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish a Draft batch: generate tokens, dispatch invitations."""
        batch = self.get_object()
        try:
            result = PublicationService().publish(batch, actor=request.user)
        except PublicationError as e:
            raise ValidationError(str(e))
        except BatchLifecycleError as e:
            raise ValidationError(str(e))
        batch.refresh_from_db()
        return Response({
            **self.get_serializer(batch).data,
            'publication_summary': result,
        })

    @action(detail=True, methods=['post'], url_path='close-confirmation')
    def close_confirmation(self, request, pk=None):
        """Close the confirmation window; auto-flag still-pending records."""
        batch = self.get_object()
        try:
            result = IssuanceService().close_confirmation(batch, actor=request.user)
        except IssuanceError as e:
            raise ValidationError(str(e))
        batch.refresh_from_db()
        return Response({
            **self.get_serializer(batch).data,
            'flagged_records': result['flagged'],
        })

    @action(detail=True, methods=['post'], url_path='start-issuance')
    def start_issuance(self, request, pk=None):
        """Begin certificate issuance for confirmed records."""
        batch = self.get_object()
        try:
            result = IssuanceService().start_issuance(batch, actor=request.user)
        except IssuanceError as e:
            raise ValidationError(str(e))
        batch.refresh_from_db()
        return Response({
            **self.get_serializer(batch).data,
            'issued_records': result['issued'],
            'failed_records': result['failed'],
        })

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark the batch COMPLETED once all issuance is finished."""
        batch = self.get_object()
        try:
            IssuanceService().complete(batch, actor=request.user)
        except IssuanceError as e:
            raise ValidationError(str(e))
        batch.refresh_from_db()
        return Response(self.get_serializer(batch).data)

    @action(detail=True, methods=['post'], url_path='extend-deadline')
    def extend_deadline(self, request, pk=None):
        """Push back the confirmation deadline for a Published/Open batch.

        Body: ``{ "new_deadline": "<ISO8601>", "reason": "<optional, <=300 chars>" }``
        """
        batch = self.get_object()
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

        previous_deadline = batch.confirmation_deadline
        try:
            log = BatchLifecycleService().extend_confirmation_deadline(
                batch, new_deadline=parsed, actor=request.user, reason=reason,
            )
        except BatchLifecycleError as e:
            raise ValidationError(str(e))

        registry_notifier.deadline_extended(
            batch,
            previous_deadline=previous_deadline,
            new_deadline=log.new_deadline,
            actor=request.user,
            reason=reason,
        )

        batch.refresh_from_db()
        return Response({
            **self.get_serializer(batch).data,
            'extension': DeadlineExtensionLogSerializer(log).data,
        })

    @action(detail=True, methods=['get'], url_path='deadline-extensions')
    def deadline_extensions(self, request, pk=None):
        """Read-only history of all extensions for this batch."""
        batch = self.get_object()
        qs = (
            DeadlineExtensionLog.objects
            .filter(batch=batch)
            .select_related('extended_by')
            .order_by('-extended_at')
        )
        return Response(DeadlineExtensionLogSerializer(qs, many=True).data)

    @action(detail=True, methods=['post'])
    def transition(self, request, pk=None):
        """Generic forward transition; later slices wrap this in dedicated endpoints."""
        batch = self.get_object()
        to_status = request.data.get('to_status')
        note = request.data.get('note', '')
        if not to_status:
            raise ValidationError({'to_status': 'Required.'})
        service = BatchLifecycleService()
        try:
            service.transition(batch, to_status, actor=request.user, note=note)
        except BatchLifecycleError as e:
            raise ValidationError(str(e))
        return Response(self.get_serializer(batch).data)

    # ── Email delivery visibility ─────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='email-delivery-summary')
    def email_delivery_summary(self, request, pk=None):
        """Aggregate counts of confirmation email delivery statuses."""
        batch = self.get_object()
        summary = EmailDeliveryService().get_summary(batch)
        return Response(summary)

    @action(detail=True, methods=['get'], url_path='email-delivery-failures')
    def email_delivery_failures(self, request, pk=None):
        """Paginated list of records whose latest confirmation email failed or bounced."""
        batch = self.get_object()
        status_filter = request.query_params.get('status')
        if status_filter and status_filter not in {
            EmailDeliveryLog.STATUS_FAILED, EmailDeliveryLog.STATUS_BOUNCED,
        }:
            raise ValidationError({'status': 'Must be FAILED or BOUNCED.'})
        failures = EmailDeliveryService().list_failures(batch, status_filter=status_filter)
        # Simple in-memory pagination for this admin tool
        page_size = int(request.query_params.get('page_size', 50))
        page = int(request.query_params.get('page', 1))
        start = (page - 1) * page_size
        end = start + page_size
        return Response({
            'count': len(failures),
            'page': page,
            'page_size': page_size,
            'results': failures[start:end],
        })

    @action(detail=True, methods=['post'], url_path='resend-failed-confirmations')
    def resend_failed_confirmations(self, request, pk=None):
        """Bulk resend confirmation emails to all eligible failed/bounced records."""
        batch = self.get_object()
        try:
            result = EmailDeliveryService().resend_failed(batch, actor=request.user)
        except DeliveryError as e:
            raise ValidationError(str(e))
        # Notify the triggering admin
        registry_notifier.resend_complete(
            batch,
            sent=result['queued_for_resend'],
            still_failing=result['skipped_already_confirmed'] + result['skipped_max_attempts'],
            hit_cap=result['skipped_max_attempts'],
            actor=request.user,
        )
        return Response(result)


class StudentRecordViewSet(viewsets.ModelViewSet):
    """Records nested under a batch. Mutable only while batch is Draft."""

    serializer_class = StudentRecordSerializer
    permission_classes = [permissions.IsAuthenticated, IsActiveAccount, IsSuperAdmin]

    def get_batch(self):
        batch_id = self.kwargs.get('batch_pk')
        try:
            return IssuanceBatch.objects.get(pk=batch_id)
        except IssuanceBatch.DoesNotExist as e:
            raise ValidationError({'batch': 'Batch does not exist.'}) from e

    def get_queryset(self):
        batch = self.get_batch()
        qs = StudentRecord.objects.filter(batch=batch).select_related(
            'faculty', 'department', 'import_batch',
        ).order_by('full_name', 'index_number')
        params = self.request.query_params
        for key in ('confirmation_status', 'issuance_status'):
            value = params.get(key)
            if value:
                qs = qs.filter(**{key: value})
        # Email status filter — filter by latest CONFIRMATION log status
        email_status = params.get('email_status')
        if email_status:
            from django.db.models import OuterRef, Subquery
            from registry.models import EmailDeliveryLog
            latest_log = (
                EmailDeliveryLog.objects
                .filter(student_record=OuterRef('pk'), email_type=EmailDeliveryLog.TYPE_CONFIRMATION)
                .order_by('-created_at')
                .values('status')[:1]
            )
            qs = qs.annotate(latest_email_status=Subquery(latest_log))
            qs = qs.filter(latest_email_status=email_status)
        search = params.get('search')
        if search:
            qs = qs.filter(
                Q(full_name__icontains=search)
                | Q(index_number__icontains=search)
                | Q(programme__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        batch = self.get_batch()
        if not BatchLifecycleService.can_edit_records(batch):
            raise PermissionDenied('Records can only be added to a Draft batch.')
        serializer.save(batch=batch)

    def perform_update(self, serializer):
        batch = serializer.instance.batch
        if not BatchLifecycleService.can_edit_records(batch):
            raise PermissionDenied('Records can only be edited in a Draft batch.')
        serializer.save()

    def perform_destroy(self, instance):
        if not BatchLifecycleService.can_edit_records(instance.batch):
            raise PermissionDenied('Records can only be deleted from a Draft batch.')
        instance.delete()

    @action(detail=True, methods=['post'], url_path='resend-confirmation')
    def resend_confirmation(self, request, batch_pk=None, pk=None):
        """Resend the confirmation email for a single student record."""
        batch = self.get_batch()
        try:
            record = self.get_object()
        except StudentRecord.DoesNotExist:
            raise ValidationError({'record': 'Record not found.'})
        try:
            EmailDeliveryService().resend_one(batch, record, actor=request.user)
        except DeliveryError as e:
            raise ValidationError(str(e))
        except MaxResendError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        return Response({'status': 'resent'})


class ImportBatchViewSet(viewsets.ReadOnlyModelViewSet):
    """List import batches and upload new files for a batch."""

    serializer_class = ImportBatchSerializer
    permission_classes = [permissions.IsAuthenticated, IsActiveAccount, IsSuperAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_batch(self):
        batch_id = self.kwargs.get('batch_pk')
        try:
            return IssuanceBatch.objects.get(pk=batch_id)
        except IssuanceBatch.DoesNotExist as e:
            raise ValidationError({'batch': 'Batch does not exist.'}) from e

    def get_queryset(self):
        batch = self.get_batch()
        return ImportBatch.objects.filter(batch=batch).order_by('-uploaded_at')

    @action(detail=False, methods=['post'], url_path='upload')
    def upload(self, request, batch_pk=None):
        batch = self.get_batch()
        upload = request.FILES.get('file')
        if not upload:
            raise ValidationError({'file': 'A CSV or XLSX file is required.'})
        raw = upload.read()
        try:
            import_batch = ImportService().process_upload(
                batch=batch,
                uploaded_by=request.user,
                file_name=upload.name,
                raw_bytes=raw,
            )
        except ImportRejected as e:
            raise ValidationError(str(e))
        return Response(
            ImportBatchSerializer(import_batch).data, status=status.HTTP_201_CREATED
        )

    # ── 4-step wizard endpoints ──────────────────────────────────────────

    @action(detail=False, methods=['post'], url_path='upload-file')
    def upload_file(self, request, batch_pk=None):
        """Step 1: Accept file, store temporarily, return column headers."""
        batch = self.get_batch()
        if not BatchLifecycleService().can_edit_records(batch):
            raise ValidationError(
                'Student records can only be imported into a Draft batch.'
            )

        upload = request.FILES.get('file')
        if not upload:
            raise ValidationError({'file': 'A CSV or XLSX file is required.'})

        raw = upload.read()
        try:
            rows = list(ImportService()._parse_rows_raw(upload.name, raw))
        except Exception as e:
            raise ValidationError(f"This file could not be read. {e}")

        if not rows:
            raise ValidationError('File is empty or unreadable.')

        columns = list(rows[0].keys())
        temp_id = str(uuid.uuid4())
        ext = os.path.splitext(upload.name)[1] or '.csv'
        temp_path = f"temp_imports/{temp_id}{ext}"
        default_storage.save(temp_path, io.BytesIO(raw))

        return Response({
            'temp_file_id': temp_id,
            'columns': columns,
            'row_count_estimate': len(rows),
            'expires_at': (datetime.utcnow() + timedelta(hours=2)).isoformat() + 'Z',
        })

    @action(detail=False, methods=['post'], url_path='preview')
    def preview(self, request, batch_pk=None):
        """Step 3: Parse up to 50 rows with mapping, return preview + issues."""
        batch = self.get_batch()
        temp_file_id = request.data.get('temp_file_id')
        mapping = request.data.get('mapping')

        if not temp_file_id or not isinstance(mapping, dict):
            raise ValidationError({'detail': 'temp_file_id and mapping are required.'})

        temp_path = self._find_temp_file(temp_file_id)
        if not temp_path or not default_storage.exists(temp_path):
            raise ValidationError({'detail': 'Temporary file not found or expired.'})

        raw = default_storage.open(temp_path).read()
        file_name = os.path.basename(temp_path)

        try:
            result = ImportService().preview(
                file_name=file_name,
                raw_bytes=raw,
                mapping=mapping,
                batch=batch,
                max_rows=50,
            )
        except ImportRejected as e:
            raise ValidationError(str(e))

        return Response(result)

    @action(detail=False, methods=['post'], url_path='confirm')
    def confirm(self, request, batch_pk=None):
        """Step 4: Create ImportBatch and enqueue Celery task for async processing."""
        batch = self.get_batch()
        temp_file_id = request.data.get('temp_file_id')
        mapping = request.data.get('mapping')
        skip_invalid = bool(request.data.get('skip_invalid_rows', False))

        if not temp_file_id or not isinstance(mapping, dict):
            raise ValidationError({'detail': 'temp_file_id and mapping are required.'})

        temp_path = self._find_temp_file(temp_file_id)
        if not temp_path or not default_storage.exists(temp_path):
            raise ValidationError({'detail': 'Temporary file not found or expired.'})

        raw = default_storage.open(temp_path).read()
        file_name = os.path.basename(temp_path)

        # Create the ImportBatch record
        import_batch = ImportBatch.objects.create(
            batch=batch,
            uploaded_by=request.user,
            file_name=file_name,
            total_rows=0,
            status=ImportBatch.STATUS_PROCESSING,
            mapping_configuration=mapping,
        )

        # Enqueue the Celery task
        from registry.tasks import process_import_batch
        process_import_batch.delay(
            import_batch_id=str(import_batch.id),
            temp_file_id=temp_file_id,
            mapping=mapping,
            skip_invalid=skip_invalid,
        )

        return Response({
            'import_batch_id': str(import_batch.id),
            'status': ImportBatch.STATUS_PROCESSING,
        }, status=status.HTTP_202_ACCEPTED)

    def _find_temp_file(self, temp_file_id):
        """Locate a temp file by its UUID prefix."""
        prefix = f"temp_imports/{temp_file_id}"
        # Simple check: look for files starting with the UUID
        try:
            for fname in default_storage.listdir('temp_imports')[1]:
                if fname.startswith(temp_file_id):
                    return f"temp_imports/{fname}"
        except Exception:
            pass
        return None
