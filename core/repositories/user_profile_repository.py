"""
Repository for UserProfile model.

Encapsulates data access logic for user profiles, providing a clean interface
for account lifecycle operations.
"""

from django.contrib.auth.models import User
from django.db.models import Q
from core.models import UserProfile


class UserProfileRepository:
    """
    Repository for UserProfile data access operations.
    """
    
    def get_by_user_id(self, user_id):
        """Get a profile by user ID."""
        try:
            return UserProfile.objects.get(user_id=user_id)
        except UserProfile.DoesNotExist:
            return None
    
    def get_by_staff_id(self, staff_id):
        """Get a profile by staff ID."""
        try:
            return UserProfile.objects.get(staff_id=staff_id)
        except UserProfile.DoesNotExist:
            return None
    
    def get_by_role(self, role):
        """Get all profiles with a specific role."""
        return UserProfile.objects.filter(role=role)
    
    def get_active_profiles(self):
        """Get all active, non-locked profiles."""
        return UserProfile.objects.filter(
            user__is_active=True,
            access_duration='permanent'
        ) | UserProfile.objects.filter(
            user__is_active=True,
            access_duration='time_limited',
            access_end_date__gte=None  # Not expired
        )
    
    def get_time_limited_profiles(self):
        """Get all time-limited profiles."""
        return UserProfile.objects.filter(access_duration='time_limited')
    
    def get_expiring_profiles(self, days=30):
        """Get profiles expiring within the specified number of days."""
        from django.utils import timezone
        from datetime import timedelta
        
        cutoff_date = timezone.now().date() + timedelta(days=days)
        return UserProfile.objects.filter(
            access_duration='time_limited',
            access_end_date__lte=cutoff_date,
            access_end_date__gte=timezone.now().date()
        )
    
    def create_profile(self, user, **kwargs):
        """Create a new user profile."""
        return UserProfile.objects.create(user=user, **kwargs)
    
    def update_profile(self, profile, **kwargs):
        """Update an existing profile."""
        for key, value in kwargs.items():
            setattr(profile, key, value)
        profile.save()
        return profile
    
    def update_permissions(self, profile, new_permissions, updated_by=None):
        """Update profile permissions and track history."""
        from core.permission_constants import build_default_permissions
        
        # Record current state in history
        history_entry = {
            'timestamp': profile.updated_at.isoformat(),
            'previous_permissions': profile.permissions.copy(),
            'updated_by': updated_by.username if updated_by else None,
        }
        profile.permission_history.append(history_entry)
        
        # Update permissions
        profile.permissions = new_permissions
        profile.save()
        return profile
    
    def deactivate_profile(self, profile, reason=None):
        """Deactivate a user profile by deactivating the associated user."""
        profile.user.is_active = False
        profile.user.save()
        return profile
    
    def reactivate_profile(self, profile):
        """Reactivate a user profile by reactivating the associated user."""
        profile.user.is_active = True
        profile.user.save()
        return profile
    
    def mark_first_login_completed(self, profile):
        """Mark that the user has completed their first login."""
        profile.first_login_completed = True
        profile.credential_status = 'completed'
        profile.save()
        return profile
    
    def set_credential_token(self, profile, token_hash, expires_at):
        """Set the credential token for first-time login."""
        profile.credential_token_hash = token_hash
        profile.credential_expires_at = expires_at
        profile.credential_status = 'delivered'
        profile.save()
        return profile
    
    def clear_credential_token(self, profile):
        """Clear the credential token after successful login."""
        profile.credential_token_hash = ''
        profile.credential_expires_at = None
        profile.save()
        return profile
