"""
Service layer for the core application.

This module provides business logic services that encapsulate
domain operations and orchestrate data access through repositories.
"""

from .account_lifecycle_service import AccountLifecycleService
from .two_person_deactivation_service import TwoPersonDeactivationService
from .authorization_service import (
    AuthorizationService,
    get_authorization_service,
    register_rule,
    check_rule,
    check_all_rules,
    check_any_rule,
)

__all__ = [
    'AccountLifecycleService',
    'TwoPersonDeactivationService',
    'AuthorizationService',
    'get_authorization_service',
    'register_rule',
    'check_rule',
    'check_all_rules',
    'check_any_rule',
]
