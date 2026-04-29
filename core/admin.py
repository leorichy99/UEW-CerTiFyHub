from django.contrib import admin
from .models import (
    AdminInvitation, AuthorisationReference, UserProfile,
    LoginAttemptTracker, SuperAdminDeactivationRequest,
)


@admin.register(AuthorisationReference)
class AuthorisationReferenceAdmin(admin.ModelAdmin):
    list_display = ('reference_number', 'requester_name', 'requester_staff_id', 'purpose', 'status', 'approval_date', 'logged_by')
    list_filter = ('status', 'purpose')
    search_fields = ('reference_number', 'requester_name', 'requester_staff_id')
    readonly_fields = ('intake_date', 'created_at', 'updated_at')


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'staff_id', 'department', 'is_legacy', 'credential_status', 'first_login_completed')
    list_filter = ('role', 'is_legacy', 'credential_status', 'account_type')
    search_fields = ('user__username', 'user__email', 'staff_id')
    readonly_fields = ('permission_history',)


@admin.register(LoginAttemptTracker)
class LoginAttemptTrackerAdmin(admin.ModelAdmin):
    list_display = ('email_hash', 'attempts', 'locked_until', 'lockout_count_24h', 'last_attempt_at')
    search_fields = ('email_hash',)
    actions = ['unlock_accounts']

    @admin.action(description='Unlock selected accounts')
    def unlock_accounts(self, request, queryset):
        for tracker in queryset:
            tracker.unlock()
        self.message_user(request, f'{queryset.count()} account(s) unlocked.')


@admin.register(SuperAdminDeactivationRequest)
class SuperAdminDeactivationRequestAdmin(admin.ModelAdmin):
    list_display = ('target_account', 'initiated_by', 'status', 'created_at', 'resolved_at')
    list_filter = ('status',)
    readonly_fields = ('confirmation_token_hash', 'created_at', 'resolved_at')


@admin.register(AdminInvitation)
class AdminInvitationAdmin(admin.ModelAdmin):
    list_display = ('email', 'role', 'status', 'invited_by', 'created_at', 'expires_at')
    list_filter = ('status', 'role')
    search_fields = ('email', 'invited_by__username', 'invited_by__email')
    readonly_fields = ('token_hash', 'created_at', 'accepted_at')

    fieldsets = (
        (None, {
            'fields': ('email', 'role', 'status', 'message')
        }),
        ('Security', {
            'fields': ('token_hash',),
            'classes': ('collapse',)
        }),
        ('Dates', {
            'fields': ('created_at', 'expires_at', 'accepted_at')
        }),
        ('Relations', {
            'fields': ('invited_by',)
        }),
    )

    def token_preview(self, obj):
        """Show a masked preview of the stored token hash (not the raw token)."""
        if not obj or not getattr(obj, 'token_hash', None):
            return ''
        h = obj.token_hash
        return f"{h[:8]}...{h[-8:]}"

    token_preview.short_description = 'Token (hash preview)'
