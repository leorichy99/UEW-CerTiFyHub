"""
Two-Person Deactivation Service.

Implements the two-person authorization pattern for deactivating
super admin accounts, requiring confirmation from a second super admin.
"""

import hashlib
from datetime import timedelta
from django.utils import timezone
from core.repositories import DeactivationRequestRepository
from core.services.account_lifecycle_service import AccountLifecycleService


class TwoPersonDeactivationService:
    """
    Service for two-person deauthorization of super admin accounts.
    
    Implements a workflow where one super admin initiates deactivation
    and another confirms it, providing an audit trail and preventing
    unilateral account deactivation.
    """
    
    def __init__(self):
        self.deactivation_repo = DeactivationRequestRepository()
        self.lifecycle_service = AccountLifecycleService()
    
    def initiate_deactivation(self, target_user_id, initiated_by, reason):
        """
        Initiate a deactivation request for a super admin account.
        
        Args:
            target_user_id: User ID of the account to deactivate
            initiated_by: User who is initiating the deactivation
            reason: Reason for deactivation
        
        Returns:
            Tuple of (deactivation_request, confirmation_token)
        """
        from django.contrib.auth.models import User
        
        # Get target user
        try:
            target_user = User.objects.get(id=target_user_id)
        except User.DoesNotExist:
            raise ValueError("Target account not found")
        
        # Check if there's already an active request
        existing = self.deactivation_repo.get_active_request_for_target(target_user)
        if existing:
            raise ValueError("Active deactivation request already exists for this account")
        
        # Generate confirmation token
        confirmation_token = self._generate_confirmation_token()
        token_hash = self._hash_token(confirmation_token)
        expires_at = timezone.now() + timedelta(hours=24)
        
        # Create deactivation request
        request = self.deactivation_repo.create_request(
            target_account=target_user,
            initiated_by=initiated_by,
            reason=reason,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        
        return request, confirmation_token
    
    def confirm_deactivation(self, request_id, confirmed_by, confirmation_token):
        """
        Confirm a deactivation request.
        
        Args:
            request_id: Deactivation request ID
            confirmed_by: User who is confirming the deactivation
            confirmation_token: Confirmation token from initiation
        
        Returns:
            Deactivated UserProfile instance
        """
        # Get the request
        request = self.deactivation_repo.get_by_id(request_id)
        if not request:
            raise ValueError("Deactivation request not found")
        
        # Validate request status
        if request.status != 'pending':
            raise ValueError(f"Request is {request.status}, cannot confirm")
        
        # Validate expiration
        if request.is_expired():
            self.deactivation_repo.mark_expired(request)
            raise ValueError("Request has expired")
        
        # Validate confirmation token
        token_hash = self._hash_token(confirmation_token)
        if token_hash != request.confirmation_token_hash:
            raise ValueError("Invalid confirmation token")
        
        # Ensure confirmer is different from initiator
        if confirmed_by.id == request.initiated_by.id:
            raise ValueError("Cannot confirm your own deactivation request")
        
        # Confirm the request
        self.deactivation_repo.confirm_request(request, confirmed_by)
        
        # Deactivate the account
        profile = self.lifecycle_service.deactivate_account(
            request.target_account.id,
            request.reason,
            confirmed_by
        )
        
        return profile
    
    def reject_deactivation(self, request_id, rejected_by):
        """
        Reject a deactivation request.
        
        Args:
            request_id: Deactivation request ID
            rejected_by: User who is rejecting the deactivation
        
        Returns:
            Rejected SuperAdminDeactivationRequest instance
        """
        request = self.deactivation_repo.get_by_id(request_id)
        if not request:
            raise ValueError("Deactivation request not found")
        
        if request.status != 'pending':
            raise ValueError(f"Request is {request.status}, cannot reject")
        
        return self.deactivation_repo.reject_request(request)
    
    def get_pending_requests(self):
        """Get all pending deactivation requests."""
        return self.deactivation_repo.get_pending_requests()
    
    def get_requests_for_account(self, user_id):
        """Get all deactivation requests for a specific account."""
        from django.contrib.auth.models import User
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return []
        
        return self.deactivation_repo.get_by_target_account(user)
    
    def cleanup_expired_requests(self):
        """Mark all expired pending requests as expired."""
        return self.deactivation_repo.cleanup_expired_requests()
    
    def _generate_confirmation_token(self):
        """Generate a secure confirmation token."""
        import uuid
        return uuid.uuid4().hex[:12].upper()
    
    def _hash_token(self, token):
        """Hash a token for secure storage."""
        return hashlib.sha256(token.encode('utf-8')).hexdigest()
