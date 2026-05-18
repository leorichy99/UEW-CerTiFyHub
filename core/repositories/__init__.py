"""
Repository classes for account lifecycle management.

This module provides repository classes that encapsulate data access logic
for account-related models, following the repository pattern to separate
data access from business logic.
"""

from .user_profile_repository import UserProfileRepository
from .authorisation_reference_repository import AuthorisationReferenceRepository
from .deactivation_request_repository import DeactivationRequestRepository

__all__ = [
    'UserProfileRepository',
    'AuthorisationReferenceRepository',
    'DeactivationRequestRepository',
]
