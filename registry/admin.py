from django.contrib import admin

from .models import (
    Faculty, Department, IssuanceBatch, StudentRecord,
    ImportBatch, ConfirmationAuditLog, EmailDeliveryLog,
    BatchStatusTransition, DeadlineExtensionLog, IssuanceRun,
)


@admin.register(IssuanceRun)
class IssuanceRunAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'batch', 'status', 'total_targeted',
        'succeeded_count', 'failed_count', 'requested_by', 'created_at',
    )
    list_filter = ('status',)
    readonly_fields = tuple(f.name for f in IssuanceRun._meta.fields)


@admin.register(DeadlineExtensionLog)
class DeadlineExtensionLogAdmin(admin.ModelAdmin):
    list_display = (
        'extended_at', 'batch', 'previous_deadline', 'new_deadline',
        'extended_by',
    )
    readonly_fields = tuple(f.name for f in DeadlineExtensionLog._meta.fields)


@admin.register(Faculty)
class FacultyAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'code')


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'faculty', 'is_active')
    list_filter = ('faculty', 'is_active')
    search_fields = ('name', 'code')


@admin.register(IssuanceBatch)
class IssuanceBatchAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'year', 'status',
    )
    list_filter = ('status', 'year')
    search_fields = ('name',)
    readonly_fields = ('id', 'created_at', 'published_at')


@admin.register(StudentRecord)
class StudentRecordAdmin(admin.ModelAdmin):
    list_display = (
        'index_number', 'full_name', 'batch',
        'confirmation_status', 'issuance_status',
    )
    list_filter = ('confirmation_status', 'issuance_status', 'batch')
    search_fields = ('index_number', 'full_name', 'institutional_email')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(ImportBatch)
class ImportBatchAdmin(admin.ModelAdmin):
    list_display = ('id', 'batch', 'status', 'total_rows', 'success_count', 'error_count', 'uploaded_at')
    list_filter = ('status',)


@admin.register(ConfirmationAuditLog)
class ConfirmationAuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'event_type', 'batch', 'student_record', 'ip_address')
    list_filter = ('event_type', 'batch')
    readonly_fields = tuple(f.name for f in ConfirmationAuditLog._meta.fields)


@admin.register(EmailDeliveryLog)
class EmailDeliveryLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'email_type', 'status', 'recipient', 'batch')
    list_filter = ('email_type', 'status', 'batch')


@admin.register(BatchStatusTransition)
class BatchStatusTransitionAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'batch', 'from_status', 'to_status', 'actor')
    list_filter = ('to_status',)
