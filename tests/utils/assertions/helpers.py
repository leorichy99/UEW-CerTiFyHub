"""
Custom assertion helpers for test assertions.
"""

from django.test import TestCase


def assert_response_has_fields(response, *fields):
    """
    Assert that a response dictionary contains all specified fields.
    
    Args:
        response: The response dictionary to check
        *fields: Field names that must be present
    """
    for field in fields:
        assert field in response, f"Expected field '{field}' not found in response"


def assert_response_no_extra_fields(response, *allowed_fields):
    """
    Assert that a response dictionary contains only the allowed fields.
    
    Args:
        response: The response dictionary to check
        *allowed_fields: Field names that are allowed
    """
    for field in response:
        assert field in allowed_fields, f"Unexpected field '{field}' found in response"


def assert_response_structure(response, expected_structure):
    """
    Assert that a response dictionary matches the expected structure.
    
    Args:
        response: The response dictionary to check
        expected_structure: Dictionary with expected keys and their types
    """
    for key, expected_type in expected_structure.items():
        assert key in response, f"Expected key '{key}' not found in response"
        assert isinstance(response[key], expected_type), \
            f"Expected type {expected_type} for key '{key}', got {type(response[key])}"


def assert_permission_granted(user, permission_key):
    """
    Assert that a user has a specific permission.
    
    Args:
        user: Django User instance
        permission_key: Permission key to check
    """
    assert user.profile.has_permission(permission_key), \
        f"User {user.username} does not have permission '{permission_key}'"


def assert_permission_denied(user, permission_key):
    """
    Assert that a user does not have a specific permission.
    
    Args:
        user: Django User instance
        permission_key: Permission key to check
    """
    assert not user.profile.has_permission(permission_key), \
        f"User {user.username} unexpectedly has permission '{permission_key}'"
