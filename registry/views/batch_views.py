"""Batch, student-record and import-batch admin endpoints."""

import io
import json
import os
import uuid
import zipfile
from datetime import datetime, timedelta

from django.conf import settings
from django.core.files.storage import default_storage
from django.db.models import Q
from django.http import FileResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied

from analytics.utils import log_audit
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
from certificates.models import Certificate
from certificates.serializers import CertificateSerializer
from certificate_system.pagination import FlexiblePageNumberPagination


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
        log_audit(
            request=self.request, user=self.request.user,
            action='Created issuance batch',
            target=batch.name,
            details=f'Batch {batch.name} created with template {batch.certificate_template.name if batch.certificate_template else "—"}.',
            category='admin',
        )
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
        log_audit(
            request=request, user=request.user,
            action='Deleted issuance batch',
            target=batch.name,
            details=f'Batch {batch.name} (status: {batch.status}) deleted.',
            category='admin',
        )
        return super().destroy(request, *args, **kwargs)

    # ── Batch-scoped certificate view ──────────────────────────────────────

    def _get_batch_cert_qs(self, batch):
        """Return the certificate queryset for a batch, applying request filters."""
        qs = (
            Certificate.objects
            .filter(issuance_batch=batch)
            .select_related('issuance_run', 'student_record')
            .order_by('-generated_date')
        )
        params = self.request.query_params

        search = params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(student_name__icontains=search) |
                Q(certificate_number__icontains=search) |
                Q(student_record__index_number__icontains=search)
            )

        issuance_run = params.get('issuance_run', '').strip()
        if issuance_run:
            qs = qs.filter(issuance_run_id=issuance_run)

        class_of_degree = params.get('class_of_degree', '').strip()
        if class_of_degree:
            qs = qs.filter(honors=class_of_degree)

        return qs

    @action(detail=True, methods=['get'], url_path='certificates')
    def certificates(self, request, pk=None):
        """Paginated list of certificates issued for this batch."""
        batch = self.get_object()
        qs = self._get_batch_cert_qs(batch)
        paginator = FlexiblePageNumberPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = CertificateSerializer(
            page, many=True, context={'request': request}
        )
        return paginator.get_paginated_response(serializer.data)

    @action(detail=True, methods=['get'], url_path='certificates/download-zip')
    def download_zip(self, request, pk=None):
        """Export a ZIP of all certificates matching the active batch filter."""
        batch = self.get_object()
        qs = self._get_batch_cert_qs(batch)
        cert_ids = list(qs.values_list('id', flat=True))

        if not cert_ids:
            return Response(
                {'error': 'No certificates match the current filter.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        MAX_ZIP_CERTS = 500
        if len(cert_ids) > MAX_ZIP_CERTS:
            return Response(
                {'error': f'Too many certificates ({len(cert_ids)}). Limit is {MAX_ZIP_CERTS}. '
                          'Apply tighter filters and try again.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Re-fetch with full objects for PDF generation
        certs = list(qs)

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            for cert in certs:
                if not cert.pdf_file or not cert.pdf_file.name:
                    from certificates.views import CertificateViewSet
                    viewset = CertificateViewSet()
                    viewset.generate_pdf_for_certificate(cert)
                    cert.refresh_from_db()

                cert.pdf_file.open('rb')
                pdf_bytes = cert.pdf_file.read()
                cert.pdf_file.close()

                filename = f"{cert.certificate_number or str(cert.id)}.pdf"
                zf.writestr(filename, pdf_bytes)

        buffer.seek(0)
        ts = timezone.now().strftime('%Y%m%d_%H%M%S')
        ref = batch.reference_name or batch.name.replace(' ', '_')
        return FileResponse(
            buffer,
            as_attachment=True,
            filename=f'certificates_{ref}_{ts}.zip',
        )

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
        log_audit(
            request=request, user=request.user,
            action='Published issuance batch',
            target=batch.name,
            details=f'Published {batch.name} with {result.get("total", 0)} record(s).',
            category='admin',
        )
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
        log_audit(
            request=request, user=request.user,
            action='Closed confirmation window',
            target=batch.name,
            details=f'Closed confirmation for {batch.name}; {result.get("flagged", 0)} record(s) flagged.',
            category='admin',
        )
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
        log_audit(
            request=request, user=request.user,
            action='Started certificate issuance',
            target=batch.name,
            details=f'Started issuance for {batch.name}: {result.get("issued", 0)} issued, {result.get("failed", 0)} failed.',
            category='admin',
        )
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
        log_audit(
            request=request, user=request.user,
            action='Completed issuance batch',
            target=batch.name,
            details=f'Batch {batch.name} marked as completed.',
            category='admin',
        )
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
        log_audit(
            request=request, user=request.user,
            action='Extended confirmation deadline',
            target=batch.name,
            details=f'Extended deadline from {previous_deadline} to {log.new_deadline} for {batch.name}.',
            category='admin',
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
        log_audit(
            request=request, user=request.user,
            action='Transitioned batch status',
            target=batch.name,
            details=f'Transitioned {batch.name} to {to_status}. Note: {note or "—"}',
            category='admin',
        )
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
        log_audit(
            request=request, user=request.user,
            action='Bulk resent failed confirmations',
            target=batch.name,
            details=f'Resent {result.get("queued_for_resend", 0)} confirmation(s) for {batch.name}.',
            category='admin',
        )
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
        ).prefetch_related('certificates').order_by('full_name', 'index_number')
        params = self.request.query_params
        for key in ('confirmation_status', 'issuance_status'):
            value = params.get(key)
            if value:
                qs = qs.filter(**{key: value})
        # Dropdown filters — values come from the batch's own distinct list
        # (see the filter_options action), so match exactly.
        for key in ('programme', 'class_of_degree', 'faculty_name', 'department_name'):
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

    @action(detail=False, url_path='filter-options')
    def filter_options(self, request, batch_pk=None):
        """Distinct values present in this batch, for cascading dropdown filters.

        Faculty/department/programme/class are free text imported from
        spreadsheets, so the option lists are derived from the data itself.
        ``faculty_departments`` maps each faculty to the departments observed
        under it, enabling a cascading faculty -> department filter.
        """
        base = StudentRecord.objects.filter(batch=self.get_batch())

        def distinct(field):
            return sorted(
                v for v in base.values_list(field, flat=True).distinct() if v
            )

        pairs = (
            base.exclude(faculty_name='').exclude(department_name='')
            .values_list('faculty_name', 'department_name').distinct()
        )
        fac_to_depts = {}
        for fac, dept in pairs:
            fac_to_depts.setdefault(fac, set()).add(dept)

        return Response({
            'programme': distinct('programme'),
            'class_of_degree': distinct('class_of_degree'),
            'faculty_name': distinct('faculty_name'),
            'department_name': distinct('department_name'),
            'faculty_departments': {k: sorted(v) for k, v in fac_to_depts.items()},
        })

    def perform_create(self, serializer):
        batch = self.get_batch()
        if not BatchLifecycleService.can_edit_records(batch):
            raise PermissionDenied('Records can only be added to a Draft batch.')
        record = serializer.save(batch=batch)
        log_audit(
            request=self.request, user=self.request.user,
            action='Added student record',
            target=f'{record.full_name} ({record.index_number})',
            details=f'Added {record.full_name} to batch {batch.name}.',
            category='admin',
        )

    def perform_update(self, serializer):
        batch = serializer.instance.batch
        if not BatchLifecycleService.can_edit_records(batch):
            raise PermissionDenied('Records can only be edited in a Draft batch.')
        record = serializer.save()
        log_audit(
            request=self.request, user=self.request.user,
            action='Updated student record',
            target=f'{record.full_name} ({record.index_number})',
            details=f'Updated {record.full_name} in batch {batch.name}.',
            category='admin',
        )

    def perform_destroy(self, instance):
        if not BatchLifecycleService.can_edit_records(instance.batch):
            raise PermissionDenied('Records can only be deleted from a Draft batch.')
        log_audit(
            request=self.request, user=self.request.user,
            action='Deleted student record',
            target=f'{instance.full_name} ({instance.index_number})',
            details=f'Deleted {instance.full_name} from batch {instance.batch.name}.',
            category='admin',
        )
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
        log_audit(
            request=request, user=request.user,
            action='Resent confirmation email',
            target=f'{record.full_name} ({record.index_number})',
            details=f'Resent confirmation email for {record.full_name} in batch {batch.name}.',
            category='admin',
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
                original_file_name=upload.name,
                raw_bytes=raw,
            )
        except ImportRejected as e:
            raise ValidationError(str(e))
        log_audit(
            request=request, user=request.user,
            action='Imported student records',
            target=batch.name,
            details=f'Imported {import_batch.record_count} record(s) from {upload.name} into {batch.name}.',
            category='admin',
        )
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

        # Persist original filename so confirm step can store it on ImportBatch
        meta_path = f"temp_imports/{temp_id}.meta"
        default_storage.save(meta_path, io.BytesIO(json.dumps({'original_file_name': upload.name}).encode()))

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

        # Restore original filename if meta file exists
        original_file_name = file_name
        meta_path = f"temp_imports/{temp_file_id}.meta"
        if default_storage.exists(meta_path):
            try:
                meta_raw = default_storage.open(meta_path).read()
                original_file_name = json.loads(meta_raw.decode()).get('original_file_name', file_name)
            except Exception:
                pass

        # Create the ImportBatch record
        import_batch = ImportBatch.objects.create(
            batch=batch,
            uploaded_by=request.user,
            file_name=file_name,
            original_file_name=original_file_name,
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
        """Locate a temp file by its UUID prefix (ignoring .meta sidecars)."""
        prefix = f"temp_imports/{temp_file_id}"
        try:
            for fname in default_storage.listdir('temp_imports')[1]:
                if fname.startswith(temp_file_id) and not fname.endswith('.meta'):
                    return f"temp_imports/{fname}"
        except Exception:
            pass
        return None
