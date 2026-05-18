"""
Unit tests for Account Lifecycle Service.
"""

import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from core.models import UserProfile, AuthorisationReference
from core.services.account_lifecycle_service import AccountLifecycleService


@pytest.fixture
def lifecycle_service():
    """Fixture for AccountLifecycleService instance."""
    return AccountLifecycleService()


@pytest.fixture
def authorisation_reference():
    """Fixture for an authorisation reference."""
    return AuthorisationReference.objects.create(
        reference_number='CERT-2025-AB1234',
        requester_name='John Doe',
        requester_staff_id='AB1234',
        authorising_head_name='Jane Smith',
        authorising_head_title='Dean',
        authorising_head_department='Computer Science',
        approval_date='2025-01-15',
        status='pending',
        purpose='provision'
    )


@pytest.fixture
def super_admin_user():
    """Fixture for a super admin user."""
    user = User.objects.create_user(
        username='admin',
        email='admin@uew.edu.gh',
        first_name='Admin',
        last_name='User'
    )
    profile = UserProfile.objects.create(
        user=user,
        role='SUPER_ADMIN',
        staff_id='SA001'
    )
    return user


class TestAccountLifecycleService:
    """Test cases for AccountLifecycleService."""
    
    def test_provision_account_success(self, lifecycle_service, authorisation_reference, super_admin_user):
        """Test successful account provisioning."""
        profile, credential_token = lifecycle_service.provision_account(
            email='test@uew.edu.gh',
            username='testuser',
            first_name='Test',
            last_name='User',
            role='ADMIN',
            staff_id='ST001',
            department='Computer Science',
            account_type='STAFF',
            access_duration='permanent',
            access_end_date=None,
            reference_number=authorisation_reference.reference_number,
            logged_by=super_admin_user
        )
        
        assert profile is not None
        assert profile.user.username == 'testuser'
        assert profile.role == 'ADMIN'
        assert profile.staff_id == 'ST001'
        assert credential_token is not None
        assert len(credential_token) == 8
        
        # Verify authorisation reference is marked as used
        authorisation_reference.refresh_from_db()
        assert authorisation_reference.status == 'used'
        assert authorisation_reference.linked_account == profile.user
    
    def test_provision_account_invalid_reference(self, lifecycle_service):
        """Test account provisioning with invalid reference."""
        with pytest.raises(ValueError, match="Invalid or used authorisation reference"):
            lifecycle_service.provision_account(
                email='test@uew.edu.gh',
                username='testuser',
                first_name='Test',
                last_name='User',
                role='ADMIN',
                staff_id='ST001',
                department='Computer Science',
                account_type='STAFF',
                access_duration='permanent',
                access_end_date=None,
                reference_number='INVALID-REF',
                logged_by=None
            )
    
    def test_generate_credential_for_existing_account(self, lifecycle_service, super_admin_user):
        """Test generating credential for existing account."""
        profile, credential_token = lifecycle_service.generate_credential_for_existing_account(
            super_admin_user.id
        )
        
        assert profile is not None
        assert credential_token is not None
        assert len(credential_token) == 8
        assert profile.credential_status == 'delivered'
    
    def test_complete_first_login_success(self, lifecycle_service, super_admin_user):
        """Test successful first login completion."""
        # First, generate a credential
        profile, _ = lifecycle_service.generate_credential_for_existing_account(
            super_admin_user.id
        )
        
        # Complete first login
        updated_profile = lifecycle_service.complete_first_login(
            super_admin_user.id,
            'NewPassword123!'
        )
        
        assert updated_profile.first_login_completed is True
        assert updated_profile.credential_status == 'completed'
        assert updated_profile.credential_token_hash == ''
        assert updated_profile.user.is_active is True
    
    def test_complete_first_login_no_token(self, lifecycle_service, super_admin_user):
        """Test first login completion without credential token."""
        with pytest.raises(ValueError, match="No valid credential token"):
            lifecycle_service.complete_first_login(
                super_admin_user.id,
                'NewPassword123!'
            )
    
    def test_deactivate_account(self, lifecycle_service, super_admin_user):
        """Test account deactivation."""
        profile = lifecycle_service.deactivate_account(
            super_admin_user.id,
            'Test deactivation',
            super_admin_user
        )
        
        assert profile.user.is_active is False
    
    def test_reactivate_account(self, lifecycle_service, super_admin_user):
        """Test account reactivation."""
        # First deactivate
        lifecycle_service.deactivate_account(
            super_admin_user.id,
            'Test deactivation',
            super_admin_user
        )
        
        # Then reactivate
        profile = lifecycle_service.reactivate_account(
            super_admin_user.id,
            super_admin_user
        )
        
        assert profile.user.is_active is True
    
    def test_update_account_permissions(self, lifecycle_service, super_admin_user):
        """Test updating account permissions."""
        new_permissions = {
            'can_create_certificates': True,
            'can_issue_certificates': False,
        }
        
        profile = lifecycle_service.update_account_permissions(
            super_admin_user.id,
            new_permissions,
            super_admin_user
        )
        
        assert profile.permissions == new_permissions
        assert len(profile.permission_history) == 1
        assert profile.permission_history[0]['updated_by'] == super_admin_user.username
    
    def test_get_expiring_accounts(self, lifecycle_service):
        """Test getting expiring accounts."""
        # Create a time-limited account expiring in 15 days
        user = User.objects.create_user(
            username='expiring',
            email='expiring@uew.edu.gh',
            first_name='Expiring',
            last_name='User'
        )
        UserProfile.objects.create(
            user=user,
            role='ADMIN',
            staff_id='EXP001',
            access_duration='time_limited',
            access_end_date=timezone.now().date() + timedelta(days=15)
        )
        
        expiring_accounts = lifecycle_service.get_expiring_accounts(days=30)
        assert len(expiring_accounts) == 1
        assert expiring_accounts[0].user.username == 'expiring'
