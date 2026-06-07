"""
Authorization Service.

Centralizes authorization logic with a rule registration system,
providing a clean interface for permission checking and rule management.
"""

from typing import Callable, Dict, Optional, Any
from functools import wraps


class AuthorizationService:
    """
    Service for managing authorization rules and checking permissions.
    
    Provides a centralized place to register and evaluate authorization rules,
    making the permission system more flexible and testable.
    """
    
    def __init__(self):
        self._rules: Dict[str, Callable] = {}
        self._register_default_rules()
    
    def register_rule(self, name: str, rule_fn: Callable) -> None:
        """
        Register an authorization rule.
        
        Args:
            name: Unique name for the rule
            rule_fn: Function that takes (user, context) and returns bool
        """
        self._rules[name] = rule_fn
    
    def unregister_rule(self, name: str) -> None:
        """Unregister an authorization rule."""
        if name in self._rules:
            del self._rules[name]
    
    def check_rule(self, name: str, user, context: Optional[Dict[str, Any]] = None) -> bool:
        """
        Check if a user passes a specific authorization rule.
        
        Args:
            name: Name of the rule to check
            user: User to check
            context: Optional context dictionary for rule evaluation
        
        Returns:
            True if user passes the rule, False otherwise
        """
        if name not in self._rules:
            raise ValueError(f"Rule '{name}' not registered")
        
        context = context or {}
        return self._rules[name](user, context)
    
    def check_all_rules(self, rule_names: list, user, context: Optional[Dict[str, Any]] = None) -> bool:
        """
        Check if a user passes all specified rules (AND logic).
        
        Args:
            rule_names: List of rule names to check
            user: User to check
            context: Optional context dictionary for rule evaluation
        
        Returns:
            True if user passes all rules, False otherwise
        """
        return all(self.check_rule(name, user, context) for name in rule_names)
    
    def check_any_rule(self, rule_names: list, user, context: Optional[Dict[str, Any]] = None) -> bool:
        """
        Check if a user passes any of the specified rules (OR logic).
        
        Args:
            rule_names: List of rule names to check
            user: User to check
            context: Optional context dictionary for rule evaluation
        
        Returns:
            True if user passes at least one rule, False otherwise
        """
        return any(self.check_rule(name, user, context) for name in rule_names)
    
    def list_rules(self) -> list:
        """List all registered rule names."""
        return list(self._rules.keys())
    
    def _register_default_rules(self) -> None:
        """Register default authorization rules."""
        
        # Rule: Check if user is authenticated
        self.register_rule('is_authenticated', lambda user, ctx: (
            user and user.is_authenticated
        ))
        
        # Rule: Check if user is active
        self.register_rule('is_active', lambda user, ctx: (
            user and user.is_authenticated and user.is_active
        ))
        
        # Rule: Check if user is a Super Admin
        self.register_rule('is_super_admin', lambda user, ctx: (
            self._is_super_admin(user)
        ))
        
        # Rule: Check if user has an active, non-expired account
        self.register_rule('is_active_account', lambda user, ctx: (
            self._is_active_account(user)
        ))
        
        # Rule: Check if user is an Admin or Super Admin
        self.register_rule('is_admin_or_super_admin', lambda user, ctx: (
            self._is_admin_or_super_admin(user)
        ))
        
        # Rule: Check if user has a specific permission
        self.register_rule('has_permission', lambda user, ctx: (
            self._has_permission(user, ctx.get('permission_key'))
        ))
    
    def _is_super_admin(self, user) -> bool:
        """Check if a user is a Super Admin."""
        if not user or not user.is_authenticated:
            return False
        if getattr(user, 'is_superuser', False):
            return True
        profile = getattr(user, 'profile', None)
        return profile and profile.role == 'SUPER_ADMIN'
    
    def _is_active_account(self, user) -> bool:
        """Check if user account is active and not expired."""
        if not user or not user.is_authenticated or not user.is_active:
            return False
        profile = getattr(user, 'profile', None)
        if profile and profile.is_access_expired():
            return False
        return True
    
    def _is_admin_or_super_admin(self, user) -> bool:
        """Check if user is an Admin or Super Admin."""
        if not self._is_active_account(user):
            return False
        if self._is_super_admin(user):
            return True
        profile = getattr(user, 'profile', None)
        if not profile:
            return False
        # Legacy admins or anyone with at least one permission
        if profile.role in ['ADMIN', 'SUPER_ADMIN']:
            return True
        # New provisioned accounts: check if they have any permission
        return any(profile.permissions.get(k, False) for k in profile.permissions)
    
    def _has_permission(self, user, permission_key: Optional[str]) -> bool:
        """Check if user has a specific permission."""
        if not permission_key:
            return False
        if not self._is_active_account(user):
            return False
        # Super Admin bypasses all permission checks
        if self._is_super_admin(user):
            return True
        profile = getattr(user, 'profile', None)
        if not profile:
            return False
        return profile.has_permission(permission_key)


# Global singleton instance
_authorization_service = AuthorizationService()


def get_authorization_service() -> AuthorizationService:
    """Get the global authorization service instance."""
    return _authorization_service


def register_rule(name: str, rule_fn: Callable) -> None:
    """Register an authorization rule with the global service."""
    _authorization_service.register_rule(name, rule_fn)


def check_rule(name: str, user, context: Optional[Dict[str, Any]] = None) -> bool:
    """Check if a user passes a specific authorization rule."""
    return _authorization_service.check_rule(name, user, context)


def check_all_rules(rule_names: list, user, context: Optional[Dict[str, Any]] = None) -> bool:
    """Check if a user passes all specified rules (AND logic)."""
    return _authorization_service.check_all_rules(rule_names, user, context)


def check_any_rule(rule_names: list, user, context: Optional[Dict[str, Any]] = None) -> bool:
    """Check if a user passes any of the specified rules (OR logic)."""
    return _authorization_service.check_any_rule(rule_names, user, context)
