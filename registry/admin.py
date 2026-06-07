from django.contrib import admin

from .models import (
    Faculty, Department, Congregation, CongregationSession, StudentRecord,
    ImportBatch, ConfirmationAuditLog, EmailDeliveryLog,
    SessionStatusTransition, DeadlineExtensionLog, IssuanceBatch,
    CongregationTemplate, CongregationTemplateSessionDef,
)


class CongregationTemplateSessionDefInline(admin.TabularInline):
    model = CongregationTemplateSessionDef
    extra = 0


@admin.register(CongregationTemplate)
class CongregationTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'created_by', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name',)
    inlines = [CongregationTemplateSessionDefInline]
    readonly_fields = ('id', 'created_at', 'updated_at', 'sourced_from_congregation')


@admin.register(IssuanceBatch)
class IssuanceBatchAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'session', 'status', 'total_targeted',
        'succeeded_count', 'failed_count', 'requested_by', 'created_at',
    )
    list_filter = ('status', 'congregation')
    readonly_fields = tuple(f.name for f in IssuanceBatch._meta.fields)


@admin.register(DeadlineExtensionLog)
class DeadlineExtensionLogAdmin(admin.ModelAdmin):
    list_display = (
        'extended_at', 'session', 'previous_deadline', 'new_deadline',
        'extended_by',
    )
    list_filter = ('congregation',)
    readonly_fields = tuple(f.name for f in DeadlineExtensionLog._meta.fields)


@admin.register(Congregation)
class CongregationAdmin(admin.ModelAdmin):
    list_display = ('name', 'year', 'created_at')
    search_fields = ('name',)
    list_filter = ('year',)
    readonly_fields = ('id', 'created_at', 'updated_at', 'sourced_from_congregation')


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


@admin.register(CongregationSession)
class CongregationSessionAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'congregation', 'session_number', 'academic_year',
        'scope_type', 'status',
    )
    list_filter = ('status', 'scope_type', 'academic_year', 'congregation')
    search_fields = ('name', 'slug', 'academic_year')
    readonly_fields = ('id', 'slug', 'created_at', 'published_at')


@admin.register(StudentRecord)
class StudentRecordAdmin(admin.ModelAdmin):
    list_display = (
        'index_number', 'full_name', 'session',
        'confirmation_status', 'issuance_status',
    )
    list_filter = ('confirmation_status', 'issuance_status', 'session')
    search_fields = ('index_number', 'full_name', 'institutional_email')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(ImportBatch)
class ImportBatchAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'status', 'total_rows', 'success_count', 'error_count', 'uploaded_at')
    list_filter = ('status',)


@admin.register(ConfirmationAuditLog)
class ConfirmationAuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'event_type', 'session', 'student_record', 'ip_address')
    list_filter = ('event_type', 'session')
    readonly_fields = tuple(f.name for f in ConfirmationAuditLog._meta.fields)


@admin.register(EmailDeliveryLog)
class EmailDeliveryLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'email_type', 'status', 'recipient', 'session')
    list_filter = ('email_type', 'status', 'session')


@admin.register(SessionStatusTransition)
class SessionStatusTransitionAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'session', 'from_status', 'to_status', 'actor')
    list_filter = ('to_status',)
