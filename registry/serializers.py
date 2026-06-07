from rest_framework import serializers

from .models import (
    Faculty, Department, Congregation, CongregationSession, StudentRecord,
    ImportBatch, EmailDeliveryLog, DeadlineExtensionLog, IssuanceBatch,
    CongregationTemplate, CongregationTemplateSessionDef,
)


class CongregationTemplateSessionDefSerializer(serializers.ModelSerializer):
    class Meta:
        model = CongregationTemplateSessionDef
        fields = (
            'id', 'session_number', 'name_pattern', 'scope_type',
            'ceremony_day_offset', 'confirmation_window_days',
            'issuance_instructions',
            'default_faculty', 'default_department', 'default_certificate_template',
        )
        read_only_fields = ('id',)


class CongregationTemplateSerializer(serializers.ModelSerializer):
    session_defs = CongregationTemplateSessionDefSerializer(many=True, read_only=True)
    sourced_from_congregation_name = serializers.CharField(
        source='sourced_from_congregation.name', read_only=True, default=None,
    )

    class Meta:
        model = CongregationTemplate
        fields = (
            'id', 'name', 'description', 'is_active',
            'sourced_from_congregation', 'sourced_from_congregation_name',
            'created_by', 'created_at', 'updated_at',
            'session_defs',
        )
        read_only_fields = (
            'id', 'sourced_from_congregation', 'sourced_from_congregation_name',
            'created_by', 'created_at', 'updated_at', 'session_defs',
        )


class IssuanceBatchSerializer(serializers.ModelSerializer):
    """Read-only view of an IssuanceBatch + audit info."""

    requested_by_name = serializers.SerializerMethodField()
    session_name = serializers.CharField(source='session.name', read_only=True)

    class Meta:
        model = IssuanceBatch
        fields = (
            'id', 'session', 'session_name', 'congregation',
            'status', 'filter_criteria', 'notes',
            'total_targeted', 'succeeded_count', 'failed_count',
            'requested_by', 'requested_by_name',
            'created_at', 'started_at', 'completed_at',
        )
        read_only_fields = fields

    def get_requested_by_name(self, obj):
        u = obj.requested_by
        if not u:
            return None
        full = (u.get_full_name() or '').strip()
        return full or u.username


class DeadlineExtensionLogSerializer(serializers.ModelSerializer):
    """Read-only audit row for a confirmation-deadline extension."""

    extended_by_name = serializers.SerializerMethodField()

    class Meta:
        model = DeadlineExtensionLog
        fields = (
            'id', 'session', 'congregation',
            'previous_deadline', 'new_deadline',
            'extended_by', 'extended_by_name',
            'extended_at', 'reason',
        )
        read_only_fields = fields

    def get_extended_by_name(self, obj):
        if not obj.extended_by:
            return None
        u = obj.extended_by
        full = (u.get_full_name() or '').strip()
        return full or u.username


class CongregationSerializer(serializers.ModelSerializer):
    """Read/write serializer for the Congregation umbrella entity.

    `status` and `counts` are computed by ``CongregationService`` and injected
    by the view; this serializer carries the schema but does not compute them.
    """

    status = serializers.SerializerMethodField()
    session_count = serializers.IntegerField(read_only=True)
    counts = serializers.JSONField(read_only=True)
    sourced_from_congregation_name = serializers.CharField(
        source='sourced_from_congregation.name', read_only=True, default=None,
    )

    class Meta:
        model = Congregation
        fields = (
            'id', 'name', 'year', 'description',
            'sourced_from_congregation', 'sourced_from_congregation_name',
            'created_by', 'created_at', 'updated_at',
            'status', 'session_count', 'counts',
        )
        read_only_fields = (
            'id', 'sourced_from_congregation', 'sourced_from_congregation_name',
            'created_by', 'created_at', 'updated_at',
            'status', 'session_count', 'counts',
        )

    def get_status(self, obj):
        # The view annotates `_derived_status` to avoid recomputing per row;
        # fall back to a fresh call if it's missing (e.g. raw object access).
        cached = getattr(obj, '_derived_status', None)
        if cached is not None:
            return cached
        from registry.services import CongregationService
        return CongregationService().get_status(obj)


class FacultySerializer(serializers.ModelSerializer):
    class Meta:
        model = Faculty
        fields = ('id', 'name', 'code', 'is_active', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


class DepartmentSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.name', read_only=True)
    faculty_code = serializers.CharField(source='faculty.code', read_only=True)

    class Meta:
        model = Department
        fields = (
            'id', 'faculty', 'faculty_name', 'faculty_code',
            'name', 'code', 'is_active', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class CongregationSessionSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.name', read_only=True, default=None)
    department_name = serializers.CharField(source='department.name', read_only=True, default=None)
    template_name = serializers.CharField(source='certificate_template.name', read_only=True, default=None)
    congregation_name = serializers.CharField(
        source='congregation.name', read_only=True, default=None,
    )
    congregation_year = serializers.IntegerField(
        source='congregation.year', read_only=True, default=None,
    )
    generated_name = serializers.CharField(read_only=True)
    # Optional — auto-assigned by SessionLifecycleService when omitted/null.
    session_number = serializers.IntegerField(
        required=False, allow_null=True, min_value=1,
    )
    counts = serializers.SerializerMethodField()

    class Meta:
        model = CongregationSession
        fields = (
            'id', 'congregation', 'congregation_name', 'congregation_year',
            'session_number', 'generated_name',
            'name', 'slug', 'academic_year',
            'scope_type', 'faculty', 'faculty_name',
            'department', 'department_name',
            'status', 'confirmation_deadline', 'confirmation_opens_at',
            'confirmation_deadline_original',
            'confirmation_deadline_extended_at',
            'confirmation_deadline_extended_by',
            'confirmation_deadline_extension_count',
            'certificate_template', 'template_name',
            'issuance_instructions',
            'created_by', 'created_at',
            'published_at', 'confirmation_closed_at',
            'issuance_started_at', 'completed_at', 'archived_at',
            'counts',
        )
        read_only_fields = (
            'id', 'slug', 'status', 'created_by', 'created_at',
            'congregation_name', 'congregation_year', 'generated_name',
            'name', 'academic_year',
            'confirmation_deadline_original',
            'confirmation_deadline_extended_at',
            'confirmation_deadline_extended_by',
            'confirmation_deadline_extension_count',
            'published_at', 'confirmation_closed_at',
            'issuance_started_at', 'completed_at', 'archived_at',
            'counts',
        )

    def get_counts(self, obj):
        return obj.counts()


class StudentRecordSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.name', read_only=True, default=None)
    department_name = serializers.CharField(source='department.name', read_only=True, default=None)

    class Meta:
        model = StudentRecord
        fields = (
            'id', 'session', 'import_batch',
            'index_number', 'full_name', 'gender', 'institutional_email',
            'programme', 'class_of_degree',
            'date_of_admission', 'date_of_completion',
            'faculty', 'faculty_name', 'department', 'department_name',
            'extra_fields',
            'confirmation_status', 'confirmation_email_status',
            'confirmation_email_sent_at', 'confirmed_at',
            'dispute_note', 'dispute_submitted_at',
            'dispute_resolved_at', 'dispute_resolution_note',
            'issuance_status', 'issued_at', 'issuance_error',
            'created_at', 'updated_at',
        )
        read_only_fields = (
            'id', 'session', 'import_batch',
            'confirmation_status', 'confirmation_email_status',
            'confirmation_email_sent_at', 'confirmed_at',
            'dispute_note', 'dispute_submitted_at',
            'dispute_resolved_at', 'dispute_resolution_note',
            'issuance_status', 'issued_at', 'issuance_error',
            'created_at', 'updated_at',
        )


class ImportBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImportBatch
        fields = (
            'id', 'session', 'uploaded_by', 'uploaded_at', 'file_name',
            'total_rows', 'success_count', 'skipped_count', 'error_count',
            'status', 'error_log', 'email_summary', 'completed_at',
        )
        read_only_fields = fields


class EmailDeliveryLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailDeliveryLog
        fields = (
            'id', 'student_record', 'session', 'email_type', 'recipient',
            'status', 'provider_message_id', 'error_message',
            'sent_at', 'updated_at', 'created_at',
        )
        read_only_fields = fields
