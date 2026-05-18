"""
Repository for SuperAdminDeactivationRequest model.

Encapsulates data access logic for super admin deactivation requests,
which implement two-person authorisation for account deactivation.
"""

from django.utils import timezone
from core.models import SuperAdminDeactivationRequest


class DeactivationRequestRepository:
    """
    Repository for SuperAdminDeactivationRequest data access operations.
    """
    
    def get_by_id(self, request_id):
        """Get a deactivation request by ID."""
        try:
            return SuperAdminDeactivationRequest.objects.get(id=request_id)
        except SuperAdminDeactivationRequest.DoesNotExist:
            return None
    
    def get_pending_requests(self):
        """Get all pending deactivation requests."""
        return SuperAdminDeactivationRequest.objects.filter(status='pending')
    
    def get_by_target_account(self, target_account):
        """Get all deactivation requests for a target account."""
        return SuperAdminDeactivationRequest.objects.filter(target_account=target_account)
    
    def get_by_initiator(self, initiator):
        """Get all deactivation requests initiated by a specific admin."""
        return SuperAdminDeactivationRequest.objects.filter(initiated_by=initiator)
    
    def get_expired_requests(self):
        """Get all expired pending requests."""
        return SuperAdminDeactivationRequest.objects.filter(
            status='pending',
            confirmation_token_expires_at__lt=timezone.now()
        )
    
    def create_request(self, target_account, initiated_by, reason, token_hash, expires_at):
        """Create a new deactivation request."""
        return SuperAdminDeactivationRequest.objects.create(
            target_account=target_account,
            initiated_by=initiated_by,
            reason=reason,
            confirmation_token_hash=token_hash,
            confirmation_token_expires_at=expires_at,
            status='pending'
        )
    
    def confirm_request(self, request, confirmed_by):
        """Confirm a deactivation request."""
        request.status = 'confirmed'
        request.confirmed_by = confirmed_by
        request.resolved_at = timezone.now()
        request.save()
        return request
    
    def reject_request(self, request):
        """Reject a deactivation request."""
        request.status = 'rejected'
        request.resolved_at = timezone.now()
        request.save()
        return request
    
    def mark_expired(self, request):
        """Mark a request as expired."""
        request.status = 'expired'
        request.resolved_at = timezone.now()
        request.save()
        return request
    
    def get_active_request_for_target(self, target_account):
        """Get the active pending request for a target account."""
        try:
            return SuperAdminDeactivationRequest.objects.filter(
                target_account=target_account,
                status='pending',
                confirmation_token_expires_at__gt=timezone.now()
            ).first()
        except SuperAdminDeactivationRequest.DoesNotExist:
            return None
    
    def cleanup_expired_requests(self):
        """Mark all expired pending requests as expired."""
        expired = self.get_expired_requests()
        for request in expired:
            self.mark_expired(request)
        return expired.count()
