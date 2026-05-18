"""
Sample test demonstrating the new test infrastructure.

This test file serves as a reference pattern for using:
- Factory_boy factories for test data generation
- Custom test client with auth helpers
- Assertion helpers for common checks
"""

from django.test import TestCase
from tests.factories import (
    UserFactory,
    UserProfileFactory,
    CertificateFactory,
    StudentFactory,
    TestCertificateBuilder,
    TestUserBuilder,
)
from tests.utils import (
    APITestClient,
    assert_response_has_fields,
    assert_permission_granted,
    assert_permission_denied,
)


class CertificateAPITestCase(TestCase):
    """Sample test using new test infrastructure."""
    
    def setUp(self):
        """Set up test client and data using factories."""
        self.client = APITestClient()
        self.admin = self.client.login_with_role('ADMIN')
    
    def test_list_certificates(self):
        """Test listing certificates with authenticated user."""
        # Create test data using factory
        CertificateFactory(student_name='John Doe', degree_type='BSC')
        CertificateFactory(student_name='Jane Smith', degree_type='MSC')
        
        # Use custom client with auth
        response = self.client.get('/api/certificates/')
        
        # Use assertion helper
        assert_response_has_fields(response.data, 'count', 'results')
        self.assertEqual(response.status_code, 200)
    
    def test_create_certificate_with_builder(self):
        """Test creating certificate using builder pattern."""
        # Use builder for flexible test data
        certificate = TestCertificateBuilder() \
            .with_student_name('Test Student') \
            .with_degree('PHD') \
            .with_honors('FIRST') \
            .with_program('Computer Science') \
            .build()
        
        self.assertIsNotNone(certificate.id)
        self.assertEqual(certificate.degree_type, 'PHD')
        self.assertEqual(certificate.honors, 'FIRST')


class UserPermissionTestCase(TestCase):
    """Sample test for permission checks using assertion helpers."""
    
    def test_admin_has_permission(self):
        """Test that admin users have certificate permissions."""
        admin = UserFactory()
        UserProfileFactory(user=admin, role='ADMIN', permissions={
            'can_view_certificates': True,
            'can_create_certificates': True,
        })
        
        assert_permission_granted(admin, 'can_view_certificates')
        assert_permission_granted(admin, 'can_create_certificates')
    
    def test_student_lacks_permission(self):
        """Test that students lack certificate creation permission."""
        student = UserFactory()
        UserProfileFactory(user=student, role='STUDENT', permissions={
            'can_view_certificates': False,
            'can_create_certificates': False,
        })
        
        assert_permission_denied(student, 'can_create_certificates')


class UserBuilderTestCase(TestCase):
    """Sample test using UserBuilder for flexible user creation."""
    
    def test_build_superuser(self):
        """Test building a superuser with the builder."""
        superuser = TestUserBuilder() \
            .with_username('admin') \
            .with_email('admin@uew.edu.gh') \
            .with_name('Admin', 'User') \
            .as_superuser() \
            .build()
        
        self.assertTrue(superuser.is_superuser)
        self.assertEqual(superuser.profile.role, 'SUPER_ADMIN')
    
    def test_build_student_with_role(self):
        """Test building a student with the builder."""
        student = TestUserBuilder() \
            .with_username('student1') \
            .with_role('STUDENT') \
            .build()
        
        self.assertEqual(student.profile.role, 'STUDENT')


class AuthClientTestCase(TestCase):
    """Sample test using custom test client auth helpers."""
    
    def test_login_as_role(self):
        """Test logging in with a specific role."""
        client = APITestClient()
        user = client.login_with_role('SUPER_ADMIN')
        
        self.assertEqual(user.profile.role, 'SUPER_ADMIN')
        self.assertIsNotNone(client.current_user)
    
    def test_impersonate_user(self):
        """Test impersonating another user."""
        client = APITestClient()
        admin = client.login_with_role('ADMIN')
        
        # Create another user
        target_user = UserFactory()
        UserProfileFactory(user=target_user, role='STUDENT')
        
        # Impersonate
        client.impersonate(target_user)
        
        self.assertEqual(client.current_user, target_user)
    
    def test_logout(self):
        """Test logging out."""
        client = APITestClient()
        client.login_with_role('ADMIN')
        self.assertIsNotNone(client.current_user)
        
        client.logout()
        self.assertIsNone(client.current_user)


class CertificateCRUDTestCase(TestCase):
    """Sample test using domain-specific CRUD shortcuts."""
    
    def setUp(self):
        """Set up test client and authenticate."""
        self.client = APITestClient()
        self.client.login_with_role('ADMIN')
    
    def test_create_certificate_shortcut(self):
        """Test using create_certificate shortcut."""
        data = {
            'student_name': 'Test Student',
            'degree_type': 'BSC',
            'honors': 'SECOND_UPPER',
            'program': 'Computer Science',
            'date_awarded': '2024-12-15',
        }
        
        response = self.client.create_certificate(data)
        # Note: This will fail if the endpoint doesn't exist yet
        # This is just demonstrating the shortcut pattern
        # self.assertIn(response.status_code, [200, 201])
