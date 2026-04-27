from rest_framework import permissions


def _is_super_admin(user):
    """Check if a user is a Super Admin."""
    if not user or not user.is_authenticated:
        return False
    if getattr(user, 'is_superuser', False):
        return True
    profile = getattr(user, 'profile', None)
    return profile and profile.role == 'SUPER_ADMIN'


def _is_active_account(user):
    """Check if user account is active and not expired."""
    if not user or not user.is_authenticated or not user.is_active:
        return False
    profile = getattr(user, 'profile', None)
    if profile and profile.is_access_expired():
        return False
    return True


class IsSuperAdmin(permissions.BasePermission):
    """Only allow authenticated Super Admin users with active accounts."""

    def has_permission(self, request, view):
        return _is_active_account(request.user) and _is_super_admin(request.user)


class IsActiveAccount(permissions.BasePermission):
    """Ensure the user has an active, non-expired account."""

    def has_permission(self, request, view):
        return _is_active_account(request.user)


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
        if not _is_active_account(request.user):
            return False

        # Super Admin bypasses all permission checks
        if _is_super_admin(request.user):
            return True

        perm_key = self.required_permission or getattr(view, 'required_permission', None)
        if not perm_key:
            return False

        profile = getattr(request.user, 'profile', None)
        if not profile:
            return False

        return profile.has_permission(perm_key)


# ── Legacy compat aliases ────────────────────────────────────────────────

class IsAdminOrSuperAdmin(permissions.BasePermission):
    """
    Allow users who are Super Admin OR have at least one permission enabled.
    Used during migration period for views that previously required ADMIN role.
    """

    def has_permission(self, request, view):
        if not _is_active_account(request.user):
            return False
        if _is_super_admin(request.user):
            return True
        profile = getattr(request.user, 'profile', None)
        if not profile:
            return False
        # Legacy admins or anyone with at least one permission
        if profile.role in ['ADMIN', 'SUPER_ADMIN']:
            return True
        # New provisioned accounts: check if they have any permission
        return any(profile.permissions.get(k, False) for k in profile.permissions)


class IsOwnerOrSuperAdmin(permissions.BasePermission):
    """Allow owners of an object or Super Admins to access it."""

    def has_object_permission(self, request, view, obj):
        if not _is_active_account(request.user):
            return False
        if _is_super_admin(request.user):
            return True
        if hasattr(obj, 'user') and obj.user == request.user:
            return True
        if obj == request.user:
            return True
        return False
