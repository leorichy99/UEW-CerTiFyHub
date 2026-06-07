"""Faculty / Department admin CRUD API tests."""

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from registry.models import Faculty, Department
from tests.factories import UserFactory, FacultyFactory


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")


def _set_role(user, role):
    """A signal auto-creates UserProfile; update it in place."""
    user.profile.role = role
    user.profile.save(update_fields=['role'])


class FacultyApiTests(APITestCase):
    def setUp(self):
        self.super_admin = UserFactory(is_superuser=True)
        _set_role(self.super_admin, 'SUPER_ADMIN')

        self.admin = UserFactory()
        _set_role(self.admin, 'ADMIN')

    def test_list_requires_authentication(self):
        resp = self.client.get('/api/registry/faculties/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_can_list(self):
        FacultyFactory()
        _auth(self.client, self.admin)
        resp = self.client.get('/api/registry/faculties/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_admin_cannot_create(self):
        _auth(self.client, self.admin)
        resp = self.client.post('/api/registry/faculties/', {
            'name': 'Faculty of Science', 'code': 'SCI',
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_super_admin_can_create(self):
        _auth(self.client, self.super_admin)
        resp = self.client.post('/api/registry/faculties/', {
            'name': 'Faculty of Science', 'code': 'SCI',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Faculty.objects.filter(code='SCI').exists())

    def test_super_admin_can_update(self):
        f = FacultyFactory()
        _auth(self.client, self.super_admin)
        resp = self.client.patch(f'/api/registry/faculties/{f.id}/', {
            'is_active': False,
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        f.refresh_from_db()
        self.assertFalse(f.is_active)


class DepartmentApiTests(APITestCase):
    def setUp(self):
        self.super_admin = UserFactory(is_superuser=True)
        _set_role(self.super_admin, 'SUPER_ADMIN')
        self.faculty = FacultyFactory()

    def test_super_admin_can_create(self):
        _auth(self.client, self.super_admin)
        resp = self.client.post('/api/registry/departments/', {
            'faculty': self.faculty.id,
            'name': 'Mathematics', 'code': 'MATH',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
        self.assertTrue(Department.objects.filter(code='MATH').exists())

    def test_filter_by_faculty(self):
        _auth(self.client, self.super_admin)
        other = FacultyFactory()
        Department.objects.create(faculty=self.faculty, name='Math', code='MATH')
        Department.objects.create(faculty=other, name='Physics', code='PHY')
        resp = self.client.get(f'/api/registry/departments/?faculty={self.faculty.id}')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        names = [d['name'] for d in resp.data.get('results', resp.data)]
        self.assertIn('Math', names)
        self.assertNotIn('Physics', names)
