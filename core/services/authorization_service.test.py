"""
Unit tests for Authorization Service.
"""

import pytest
from django.contrib.auth.models import User
from core.models import UserProfile
from core.services.authorization_service import (
    AuthorizationService,
    get_authorization_service,
    register_rule,
    check_rule,
    check_all_rules,
    check_any_rule,
)


@pytest.fixture
def auth_service():
    """Fixture for AuthorizationService instance."""
    return AuthorizationService()


@pytest.fixture
def super_admin_user():
    """Fixture for a super admin user."""
    user = User.objects.create_user(
        username='admin',
        email='admin@uew.edu.gh',
        first_name='Admin',
        last_name='User',
        is_superuser=True
    )
    UserProfile.objects.create(
        user=user,
        role='SUPER_ADMIN',
        staff_id='SA001'
    )
    return user


@pytest.fixture
def regular_admin_user():
    """Fixture for a regular admin user."""
    user = User.objects.create_user(
        username='regular',
        email='regular@uew.edu.gh',
        first_name='Regular',
        last_name='Admin'
    )
    UserProfile.objects.create(
        user=user,
        role='ADMIN',
        staff_id='ADM001',
        permissions={'can_create_certificates': True}
    )
    return user


@pytest.fixture
def inactive_user():
    """Fixture for an inactive user."""
    user = User.objects.create_user(
        username='inactive',
        email='inactive@uew.edu.gh',
        first_name='Inactive',
        last_name='User',
        is_active=False
    )
    UserProfile.objects.create(
        user=user,
        role='ADMIN',
        staff_id='INA001'
    )
    return user


class TestAuthorizationService:
    """Test cases for AuthorizationService."""
    
    def test_register_rule(self, auth_service):
        """Test registering a new rule."""
        def custom_rule(user, context):
            return user and user.username == 'admin'
        
        auth_service.register_rule('custom', custom_rule)
        assert 'custom' in auth_service.list_rules()
    
    def test_unregister_rule(self, auth_service):
        """Test unregistering a rule."""
        auth_service.unregister_rule('is_authenticated')
        assert 'is_authenticated' not in auth_service.list_rules()
    
    def test_check_rule_success(self, auth_service, super_admin_user):
        """Test checking a rule that passes."""
        result = auth_service.check_rule('is_authenticated', super_admin_user)
        assert result is True
    
    def test_check_rule_failure(self, auth_service):
        """Test checking a rule that fails."""
        result = auth_service.check_rule('is_authenticated', None)
        assert result is False
    
    def test_check_rule_not_registered(self, auth_service, super_admin_user):
        """Test checking a rule that doesn't exist."""
        with pytest.raises(ValueError, match="Rule 'nonexistent' not registered"):
            auth_service.check_rule('nonexistent', super_admin_user)
    
    def test_check_all_rules_all_pass(self, auth_service, super_admin_user):
        """Test checking all rules when all pass."""
        result = auth_service.check_all_rules(
            ['is_authenticated', 'is_active'],
            super_admin_user
        )
        assert result is True
    
    def test_check_all_rules_one_fails(self, auth_service, inactive_user):
        """Test checking all rules when one fails."""
        result = auth_service.check_all_rules(
            ['is_authenticated', 'is_active'],
            inactive_user
        )
        assert result is False
    
    def test_check_any_rule_one_passes(self, auth_service, super_admin_user):
        """Test checking any rules when one passes."""
        result = auth_service.check_any_rule(
            ['is_super_admin', 'is_admin_or_super_admin'],
            super_admin_user
        )
        assert result is True
    
    def test_check_any_rule_all_fail(self, auth_service):
        """Test checking any rules when all fail."""
        result = auth_service.check_any_rule(
            ['is_super_admin', 'is_admin_or_super_admin'],
            None
        )
        assert result is False
    
    def test_list_rules(self, auth_service):
        """Test listing all registered rules."""
        rules = auth_service.list_rules()
        assert isinstance(rules, list)
        assert 'is_authenticated' in rules
        assert 'is_super_admin' in rules
    
    def test_default_rules_registered(self, auth_service):
        """Test that default rules are registered."""
        expected_rules = [
            'is_authenticated',
            'is_active',
            'is_super_admin',
            'is_active_account',
            'is_admin_or_super_admin',
            'has_permission'
        ]
        for rule in expected_rules:
            assert rule in auth_service.list_rules()
    
    def test_rule_with_context(self, auth_service, regular_admin_user):
        """Test checking a rule with context."""
        result = auth_service.check_rule(
            'has_permission',
            regular_admin_user,
            {'permission_key': 'can_create_certificates'}
        )
        assert result is True
    
    def test_rule_with_context_missing_permission(self, auth_service, regular_admin_user):
        """Test checking a rule with context for missing permission."""
        result = auth_service.check_rule(
            'has_permission',
            regular_admin_user,
            {'permission_key': 'can_delete_certificates'}
        )
        assert result is False


class TestGlobalServiceFunctions:
    """Test cases for global service functions."""
    
    def test_get_authorization_service(self):
        """Test getting the global service instance."""
        service = get_authorization_service()
        assert isinstance(service, AuthorizationService)
    
    def test_register_rule_global(self, super_admin_user):
        """Test registering a rule globally."""
        def test_rule(user, context):
            return user and user.username == 'admin'
        
        register_rule('test_global', test_rule)
        result = check_rule('test_global', super_admin_user)
        assert result is True
    
    def test_check_rule_global(self, super_admin_user):
        """Test checking a rule globally."""
        result = check_rule('is_authenticated', super_admin_user)
        assert result is True
    
    def test_check_all_rules_global(self, super_admin_user):
        """Test checking all rules globally."""
        result = check_all_rules(['is_authenticated', 'is_active'], super_admin_user)
        assert result is True
    
    def test_check_any_rule_global(self, super_admin_user):
        """Test checking any rules globally."""
        result = check_any_rule(['is_super_admin', 'is_admin_or_super_admin'], super_admin_user)
        assert result is True


class TestDefaultRules:
    """Test cases for default authorization rules."""
    
    def test_is_authenticated_rule(self, auth_service, super_admin_user):
        """Test the is_authenticated rule."""
        assert auth_service.check_rule('is_authenticated', super_admin_user) is True
        assert auth_service.check_rule('is_authenticated', None) is False
    
    def test_is_active_rule(self, auth_service, super_admin_user, inactive_user):
        """Test the is_active rule."""
        assert auth_service.check_rule('is_active', super_admin_user) is True
        assert auth_service.check_rule('is_active', inactive_user) is False
    
    def test_is_super_admin_rule(self, auth_service, super_admin_user, regular_admin_user):
        """Test the is_super_admin rule."""
        assert auth_service.check_rule('is_super_admin', super_admin_user) is True
        assert auth_service.check_rule('is_super_admin', regular_admin_user) is False
    
    def test_is_active_account_rule(self, auth_service, super_admin_user, inactive_user):
        """Test the is_active_account rule."""
        assert auth_service.check_rule('is_active_account', super_admin_user) is True
        assert auth_service.check_rule('is_active_account', inactive_user) is False
    
    def test_is_admin_or_super_admin_rule(self, auth_service, super_admin_user, regular_admin_user):
        """Test the is_admin_or_super_admin rule."""
        assert auth_service.check_rule('is_admin_or_super_admin', super_admin_user) is True
        assert auth_service.check_rule('is_admin_or_super_admin', regular_admin_user) is True
