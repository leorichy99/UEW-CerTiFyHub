"""
Account Lifecycle Service.

Provides business logic for account provisioning, deactivation,
and other lifecycle operations using the repository pattern.
"""

import uuid
import hashlib
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth.models import User
from core.models import UserProfile
from core.repositories import (
    UserProfileRepository,
    AuthorisationReferenceRepository,
)
from core.permission_constants import build_default_permissions


class AccountLifecycleService:
    """
    Service for managing account lifecycle operations.
    
    Handles account provisioning, deactivation, credential management,
    and other lifecycle operations using repositories for data access.
    """
    
    def __init__(self):
        self.user_profile_repo = UserProfileRepository()
        self.auth_ref_repo = AuthorisationReferenceRepository()
    
    def provision_account(self, email, username, first_name, last_name,
                         role, staff_id, department, account_type,
                         access_duration, access_end_date,
                         reference_number=None, logged_by=None):
        """
        Provision a new account with the given details.

        Args:
            email: User email
            username: Username
            first_name: User first name
            last_name: User last name
            role: User role (SUPER_ADMIN, ADMIN, STUDENT, EMPLOYER)
            staff_id: Institutional staff ID
            department: Department name
            account_type: Account type (STAFF, EXTERNAL_COLLABORATOR)
            access_duration: Access duration (permanent, time_limited)
            access_end_date: End date for time-limited access
            reference_number: Optional authorisation reference number
            logged_by: User who is logging the account creation

        Returns:
            Created UserProfile instance
        """
        auth_ref = None
        if reference_number:
            auth_ref = self.auth_ref_repo.get_by_reference_number(reference_number)
            if not auth_ref or auth_ref.status != 'pending':
                raise ValueError("Invalid or used authorisation reference")

        # Create user account
        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            is_active=False,  # Inactive until credential is set
        )

        # Create user profile
        profile = self.user_profile_repo.create_profile(
            user=user,
            role=role,
            staff_id=staff_id,
            department=department,
            account_type=account_type,
            access_duration=access_duration,
            access_end_date=access_end_date,
            letter_reference=auth_ref,
            is_legacy=False,
        )

        # Mark reference as used if provided
        if auth_ref:
            self.auth_ref_repo.mark_as_used(auth_ref, user)

        # Generate and set credential token
        credential_token = self._generate_credential_token()
        token_hash = self._hash_token(credential_token)
        expires_at = timezone.now() + timedelta(hours=24)
        self.user_profile_repo.set_credential_token(profile, token_hash, expires_at)

        return profile, credential_token
    
    def generate_credential_for_existing_account(self, user_id):
        """
        Generate a new credential token for an existing account.
        
        Args:
            user_id: User ID
        
        Returns:
            Tuple of (profile, credential_token)
        """
        profile = self.user_profile_repo.get_by_user_id(user_id)
        if not profile:
            raise ValueError("Profile not found")
        
        # Generate new token
        credential_token = self._generate_credential_token()
        token_hash = self._hash_token(credential_token)
        expires_at = timezone.now() + timedelta(hours=24)
        
        self.user_profile_repo.set_credential_token(profile, token_hash, expires_at)
        
        return profile, credential_token
    
    def complete_first_login(self, user_id, password):
        """
        Complete the first login flow by setting the password.
        
        Args:
            user_id: User ID
            password: New password
        
        Returns:
            Updated UserProfile instance
        """
        profile = self.user_profile_repo.get_by_user_id(user_id)
        if not profile:
            raise ValueError("Profile not found")
        
        # Validate credential token
        if not profile.credential_token_hash or profile.credential_status != 'delivered':
            raise ValueError("No valid credential token")
        
        if profile.credential_expires_at and profile.credential_expires_at < timezone.now():
            raise ValueError("Credential token expired")
        
        # Set password
        user = profile.user
        user.set_password(password)
        user.is_active = True
        user.save()
        
        # Mark first login as completed
        self.user_profile_repo.mark_first_login_completed(profile)
        self.user_profile_repo.clear_credential_token(profile)
        
        return profile
    
    def deactivate_account(self, user_id, reason, deactivated_by):
        """
        Deactivate an account.
        
        Args:
            user_id: User ID to deactivate
            reason: Reason for deactivation
            deactivated_by: User who is performing the deactivation
        
        Returns:
            Deactivated UserProfile instance
        """
        profile = self.user_profile_repo.get_by_user_id(user_id)
        if not profile:
            raise ValueError("Profile not found")
        
        # Deactivate the profile
        self.user_profile_repo.deactivate_profile(profile)
        
        return profile
    
    def reactivate_account(self, user_id, reactivated_by):
        """
        Reactivate a deactivated account.
        
        Args:
            user_id: User ID to reactivate
            reactivated_by: User who is performing the reactivation
        
        Returns:
            Reactivated UserProfile instance
        """
        profile = self.user_profile_repo.get_by_user_id(user_id)
        if not profile:
            raise ValueError("Profile not found")
        
        # Reactivate the profile
        self.user_profile_repo.reactivate_profile(profile)
        
        return profile
    
    def update_account_permissions(self, user_id, new_permissions, updated_by):
        """
        Update account permissions.
        
        Args:
            user_id: User ID to update
            new_permissions: New permissions dictionary
            updated_by: User who is performing the update
        
        Returns:
            Updated UserProfile instance
        """
        profile = self.user_profile_repo.get_by_user_id(user_id)
        if not profile:
            raise ValueError("Profile not found")
        
        # Update permissions with history tracking
        self.user_profile_repo.update_permissions(profile, new_permissions, updated_by)
        
        return profile
    
    def get_expiring_accounts(self, days=30):
        """
        Get accounts expiring within the specified number of days.
        
        Args:
            days: Number of days to look ahead
        
        Returns:
            QuerySet of UserProfile instances
        """
        return self.user_profile_repo.get_expiring_profiles(days)
    
    def get_time_limited_accounts(self):
        """
        Get all time-limited accounts.
        
        Returns:
            QuerySet of UserProfile instances
        """
        return self.user_profile_repo.get_time_limited_profiles()
    
    def _generate_credential_token(self):
        """Generate a secure credential token."""
        return uuid.uuid4().hex[:8].upper()
    
    def _hash_token(self, token):
        """Hash a token for secure storage."""
        return hashlib.sha256(token.encode('utf-8')).hexdigest()
