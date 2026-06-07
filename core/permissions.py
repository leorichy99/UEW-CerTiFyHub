from rest_framework import permissions
from .services.authorization_service import check_rule, check_all_rules


class IsSuperAdmin(permissions.BasePermission):
    """Only allow authenticated Super Admin users with active accounts."""

    def has_permission(self, request, view):
        return check_all_rules(['is_active_account', 'is_super_admin'], request.user)


class IsActiveAccount(permissions.BasePermission):
    """Ensure the user has an active, non-expired account."""

    def has_permission(self, request, view):
        return check_rule('is_active_account', request.user)


class HasPermission(permissions.BasePermission):
    """
    Granular permission check against user.profile.permissions.

    Usage on a view:
        permission_classes = [IsAuthenticated, HasPermission]
        required_permission = 'certificates.issue'

    Or as a factory:
        permission_classes = [IsAuthenticated, HasPermission.of('certificates.issue')]
    """

    required_permission = None

    @classmethod
    def of(cls, perm_key):
        """Factory that returns a permission class bound to a specific key."""
        return type(
            f'HasPermission_{perm_key}',
            (cls,),
            {'required_permission': perm_key},
        )

    def has_permission(self, request, view):
        perm_key = self.required_permission or getattr(view, 'required_permission', None)
        if not perm_key:
            return False

        return check_rule('has_permission', request.user, {'permission_key': perm_key})


# ── Legacy compat aliases ────────────────────────────────────────────────

class IsAdminOrSuperAdmin(permissions.BasePermission):
    """
    Allow users who are Super Admin OR have at least one permission enabled.
    Used during migration period for views that previously required ADMIN role.
    """

    def has_permission(self, request, view):
        return check_rule('is_admin_or_super_admin', request.user)


class IsOwnerOrSuperAdmin(permissions.BasePermission):
    """Allow owners of an object or Super Admins to access it."""

    def has_object_permission(self, request, view, obj):
        if not check_rule('is_active_account', request.user):
            return False
        if check_rule('is_super_admin', request.user):
            return True
        if hasattr(obj, 'user') and obj.user == request.user:
            return True
        if obj == request.user:
            return True
        return False
