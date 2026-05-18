"""
Repository for AuthorisationReference model.

Encapsulates data access logic for authorisation references,
which are used for account provisioning.
"""

from core.models import AuthorisationReference


class AuthorisationReferenceRepository:
    """
    Repository for AuthorisationReference data access operations.
    """
    
    def get_by_reference_number(self, reference_number):
        """Get a reference by its reference number."""
        try:
            return AuthorisationReference.objects.get(reference_number=reference_number)
        except AuthorisationReference.DoesNotExist:
            return None
    
    def get_by_staff_id(self, staff_id):
        """Get references by requester staff ID."""
        return AuthorisationReference.objects.filter(requester_staff_id=staff_id)
    
    def get_pending_references(self):
        """Get all pending references."""
        return AuthorisationReference.objects.filter(status='pending')
    
    def get_used_references(self):
        """Get all used references."""
        return AuthorisationReference.objects.filter(status='used')
    
    def get_by_purpose(self, purpose):
        """Get references by purpose (provision, permission_change)."""
        return AuthorisationReference.objects.filter(purpose=purpose)
    
    def create_reference(self, **kwargs):
        """Create a new authorisation reference."""
        return AuthorisationReference.objects.create(**kwargs)
    
    def mark_as_used(self, reference, linked_account):
        """Mark a reference as used and link it to an account."""
        reference.status = 'used'
        reference.linked_account = linked_account
        reference.save()
        return reference
    
    def mark_as_cancelled(self, reference):
        """Mark a reference as cancelled."""
        reference.status = 'cancelled'
        reference.save()
        return reference
    
    def get_available_for_provisioning(self):
        """Get pending references that can be used for provisioning."""
        return AuthorisationReference.objects.filter(
            status='pending',
            purpose='provision'
        )
    
    def get_available_for_permission_change(self):
        """Get pending references that can be used for permission changes."""
        return AuthorisationReference.objects.filter(
            status='pending',
            purpose='permission_change'
        )
