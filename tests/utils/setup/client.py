"""
Custom test client wrapper with auth helpers and CRUD shortcuts.
"""

from django.test import APIClient
from django.contrib.auth import get_user_model
from tests.factories import UserFactory, UserProfileFactory

User = get_user_model()


class APITestClient:
    """
    Custom wrapper around Django's APIClient with convenience methods
    for authentication and common CRUD operations.
    """
    
    def __init__(self):
        self.client = APIClient()
        self.current_user = None
    
    def login_as(self, user):
        """
        Authenticate as a specific user.
        
        Args:
            user: User instance to authenticate as
        """
        self.client.force_authenticate(user=user)
        self.current_user = user
        return self
    
    def login_with_role(self, role='ADMIN'):
        """
        Create a user with the specified role and authenticate as them.
        
        Args:
            role: Role to assign (SUPER_ADMIN, ADMIN, STUDENT, EMPLOYER)
        
        Returns:
            The authenticated user
        """
        user = UserFactory()
        UserProfileFactory(user=user, role=role)
        self.login_as(user)
        return user
    
    def login_as_superuser(self):
        """
        Create a superuser and authenticate as them.
        
        Returns:
            The authenticated superuser
        """
        user = UserFactory(is_superuser=True)
        UserProfileFactory(user=user, role='SUPER_ADMIN')
        self.login_as(user)
        return user
    
    def logout(self):
        """
        Clear authentication.
        """
        self.client.force_authenticate(user=None)
        self.current_user = None
        return self
    
    def impersonate(self, user):
        """
        Impersonate another user (useful for testing permission checks).
        
        Args:
            user: User to impersonate
        """
        self.login_as(user)
        return self
    
    # CRUD shortcuts for common operations
    
    def get(self, url, **kwargs):
        """
        Perform a GET request.
        
        Args:
            url: The URL to request
            **kwargs: Additional arguments to pass to client.get()
        
        Returns:
            Response object
        """
        return self.client.get(url, **kwargs)
    
    def post(self, url, data=None, **kwargs):
        """
        Perform a POST request.
        
        Args:
            url: The URL to request
            data: Request data
            **kwargs: Additional arguments to pass to client.post()
        
        Returns:
            Response object
        """
        return self.client.post(url, data, **kwargs)
    
    def put(self, url, data=None, **kwargs):
        """
        Perform a PUT request.
        
        Args:
            url: The URL to request
            data: Request data
            **kwargs: Additional arguments to pass to client.put()
        
        Returns:
            Response object
        """
        return self.client.put(url, data, **kwargs)
    
    def patch(self, url, data=None, **kwargs):
        """
        Perform a PATCH request.
        
        Args:
            url: The URL to request
            data: Request data
            **kwargs: Additional arguments to pass to client.patch()
        
        Returns:
            Response object
        """
        return self.client.patch(url, data, **kwargs)
    
    def delete(self, url, **kwargs):
        """
        Perform a DELETE request.
        
        Args:
            url: The URL to request
            **kwargs: Additional arguments to pass to client.delete()
        
        Returns:
            Response object
        """
        return self.client.delete(url, **kwargs)
    
    # Domain-specific CRUD shortcuts
    
    def create_certificate(self, data):
        """
        Create a certificate.
        
        Args:
            data: Certificate data
        
        Returns:
            Response object
        """
        return self.post('/api/certificates/', data)
    
    def get_certificate(self, pk):
        """
        Get a certificate by ID.
        
        Args:
            pk: Certificate primary key
        
        Returns:
            Response object
        """
        return self.get(f'/api/certificates/{pk}/')
    
    def update_certificate(self, pk, data):
        """
        Update a certificate.
        
        Args:
            pk: Certificate primary key
            data: Updated certificate data
        
        Returns:
            Response object
        """
        return self.patch(f'/api/certificates/{pk}/', data)
    
    def delete_certificate(self, pk):
        """
        Delete a certificate.
        
        Args:
            pk: Certificate primary key
        
        Returns:
            Response object
        """
        return self.delete(f'/api/certificates/{pk}/')
    
    def create_user(self, data):
        """
        Create a user account.
        
        Args:
            data: User account data
        
        Returns:
            Response object
        """
        return self.post('/api/accounts/', data)
    
    def get_user(self, pk):
        """
        Get a user by ID.
        
        Args:
            pk: User primary key
        
        Returns:
            Response object
        """
        return self.get(f'/api/accounts/{pk}/')
    
    def update_user_permissions(self, pk, data):
        """
        Update user permissions.
        
        Args:
            pk: User primary key
            data: Permission update data
        
        Returns:
            Response object
        """
        return self.patch(f'/api/accounts/{pk}/permissions/', data)
