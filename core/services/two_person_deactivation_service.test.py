"""
Unit tests for Two-Person Deactivation Service.
"""

import pytest
from django.contrib.auth.models import User
from core.models import UserProfile
from core.services.two_person_deactivation_service import TwoPersonDeactivationService


@pytest.fixture
def deactivation_service():
    """Fixture for TwoPersonDeactivationService instance."""
    return TwoPersonDeactivationService()


@pytest.fixture
def super_admin_1():
    """Fixture for first super admin."""
    user = User.objects.create_user(
        username='admin1',
        email='admin1@uew.edu.gh',
        first_name='Admin',
        last_name='One'
    )
    UserProfile.objects.create(
        user=user,
        role='SUPER_ADMIN',
        staff_id='SA001'
    )
    return user


@pytest.fixture
def super_admin_2():
    """Fixture for second super admin."""
    user = User.objects.create_user(
        username='admin2',
        email='admin2@uew.edu.gh',
        first_name='Admin',
        last_name='Two'
    )
    UserProfile.objects.create(
        user=user,
        role='SUPER_ADMIN',
        staff_id='SA002'
    )
    return user


@pytest.fixture
def target_admin():
    """Fixture for target admin to be deactivated."""
    user = User.objects.create_user(
        username='target',
        email='target@uew.edu.gh',
        first_name='Target',
        last_name='Admin'
    )
    UserProfile.objects.create(
        user=user,
        role='SUPER_ADMIN',
        staff_id='SA003'
    )
    return user


class TestTwoPersonDeactivationService:
    """Test cases for TwoPersonDeactivationService."""
    
    def test_initiate_deactivation_success(self, deactivation_service, target_admin, super_admin_1):
        """Test successful initiation of deactivation request."""
        request, confirmation_token = deactivation_service.initiate_deactivation(
            target_user_id=target_admin.id,
            initiated_by=super_admin_1,
            reason='Security policy violation'
        )
        
        assert request is not None
        assert request.target_account == target_admin
        assert request.initiated_by == super_admin_1
        assert request.status == 'pending'
        assert request.reason == 'Security policy violation'
        assert confirmation_token is not None
        assert len(confirmation_token) == 12
    
    def test_initiate_deactivation_duplicate(self, deactivation_service, target_admin, super_admin_1):
        """Test initiating deactivation when active request already exists."""
        # Create first request
        deactivation_service.initiate_deactivation(
            target_user_id=target_admin.id,
            initiated_by=super_admin_1,
            reason='First reason'
        )
        
        # Try to create second request
        with pytest.raises(ValueError, match="Active deactivation request already exists"):
            deactivation_service.initiate_deactivation(
                target_user_id=target_admin.id,
                initiated_by=super_admin_1,
                reason='Second reason'
            )
    
    def test_confirm_deactivation_success(self, deactivation_service, target_admin, super_admin_1, super_admin_2):
        """Test successful confirmation of deactivation request."""
        # Initiate request
        request, confirmation_token = deactivation_service.initiate_deactivation(
            target_user_id=target_admin.id,
            initiated_by=super_admin_1,
            reason='Security policy violation'
        )
        
        # Confirm request
        profile = deactivation_service.confirm_deactivation(
            request_id=request.id,
            confirmed_by=super_admin_2,
            confirmation_token=confirmation_token
        )
        
        assert profile.user.is_active is False
        request.refresh_from_db()
        assert request.status == 'confirmed'
        assert request.confirmed_by == super_admin_2
    
    def test_confirm_deactivation_invalid_token(self, deactivation_service, target_admin, super_admin_1, super_admin_2):
        """Test confirmation with invalid token."""
        request, _ = deactivation_service.initiate_deactivation(
            target_user_id=target_admin.id,
            initiated_by=super_admin_1,
            reason='Security policy violation'
        )
        
        with pytest.raises(ValueError, match="Invalid confirmation token"):
            deactivation_service.confirm_deactivation(
                request_id=request.id,
                confirmed_by=super_admin_2,
                confirmation_token='INVALID'
            )
    
    def test_confirm_deactivation_same_admin(self, deactivation_service, target_admin, super_admin_1):
        """Test confirmation by the same admin who initiated."""
        request, confirmation_token = deactivation_service.initiate_deactivation(
            target_user_id=target_admin.id,
            initiated_by=super_admin_1,
            reason='Security policy violation'
        )
        
        with pytest.raises(ValueError, match="Cannot confirm your own deactivation request"):
            deactivation_service.confirm_deactivation(
                request_id=request.id,
                confirmed_by=super_admin_1,
                confirmation_token=confirmation_token
            )
    
    def test_reject_deactivation(self, deactivation_service, target_admin, super_admin_1, super_admin_2):
        """Test rejecting a deactivation request."""
        request, _ = deactivation_service.initiate_deactivation(
            target_user_id=target_admin.id,
            initiated_by=super_admin_1,
            reason='Security policy violation'
        )
        
        rejected_request = deactivation_service.reject_deactivation(
            request_id=request.id,
            rejected_by=super_admin_2
        )
        
        assert rejected_request.status == 'rejected'
        assert target_admin.is_active is True  # Account should remain active
    
    def test_get_pending_requests(self, deactivation_service, target_admin, super_admin_1):
        """Test getting all pending requests."""
        deactivation_service.initiate_deactivation(
            target_user_id=target_admin.id,
            initiated_by=super_admin_1,
            reason='Security policy violation'
        )
        
        pending_requests = deactivation_service.get_pending_requests()
        assert len(pending_requests) == 1
        assert pending_requests[0].status == 'pending'
    
    def test_get_requests_for_account(self, deactivation_service, target_admin, super_admin_1):
        """Test getting requests for a specific account."""
        deactivation_service.initiate_deactivation(
            target_user_id=target_admin.id,
            initiated_by=super_admin_1,
            reason='Security policy violation'
        )
        
        requests = deactivation_service.get_requests_for_account(target_admin.id)
        assert len(requests) == 1
        assert requests[0].target_account == target_admin
