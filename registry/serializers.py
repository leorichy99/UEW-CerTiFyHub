from rest_framework import serializers

from .models import (
    Faculty, Department, IssuanceBatch, StudentRecord,
    ImportBatch, EmailDeliveryLog, DeadlineExtensionLog, IssuanceRun,
)


class IssuanceRunSerializer(serializers.ModelSerializer):
    """Read-only view of an IssuanceRun + audit info."""

    requested_by_name = serializers.SerializerMethodField()
    batch_name = serializers.CharField(source='batch.name', read_only=True)

    class Meta:
        model = IssuanceRun
        fields = (
            'id', 'batch', 'batch_name',
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
            'id', 'batch',
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


class IssuanceBatchSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='certificate_template.name', read_only=True, default=None)
    counts = serializers.SerializerMethodField()

    class Meta:
        model = IssuanceBatch
        fields = (
            'id',
            'name', 'year',
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
            'id', 'year', 'status', 'created_by', 'created_at',
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
            'id', 'batch', 'import_batch',
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
            'id', 'batch', 'import_batch',
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
            'id', 'batch', 'uploaded_by', 'uploaded_at', 'file_name',
            'total_rows', 'success_count', 'skipped_count', 'error_count',
            'status', 'error_log', 'email_summary', 'completed_at',
            'mapping_configuration',
        )
        read_only_fields = fields


class EmailDeliveryLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailDeliveryLog
        fields = (
            'id', 'student_record', 'batch', 'email_type', 'recipient',
            'status', 'provider_message_id', 'error_message',
            'sent_at', 'updated_at', 'created_at',
        )
        read_only_fields = fields


class EmailDeliveryFailureSerializer(serializers.Serializer):
    """Read-only flattened view of a failed/bounced delivery."""

    record_id = serializers.UUIDField()
    student_name = serializers.CharField()
    index_number = serializers.CharField()
    institutional_email = serializers.EmailField()
    status = serializers.CharField()
    failure_reason = serializers.CharField()
    last_attempt = serializers.DateTimeField()
    resend_attempts = serializers.IntegerField()
    can_resend = serializers.BooleanField()
