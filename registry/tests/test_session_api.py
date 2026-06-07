"""HTTP tests for session CRUD, record nested CRUD, and import upload."""

from datetime import date, datetime, time, timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from registry.models import CongregationSession, StudentRecord, ImportBatch
from tests.factories import (
    UserFactory, CertificateTemplateFactory,
    CongregationFactory, CongregationSessionFactory,
)


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")


def _set_role(user, role):
    user.profile.role = role
    user.profile.save(update_fields=['role'])


HEADERS = (
    'index_number,full_name,institutional_email,programme,'
    'class_of_degree,date_of_completion,faculty_code,department_code'
)


class SessionApiTests(APITestCase):
    def setUp(self):
        self.super_admin = UserFactory(is_superuser=True)
        _set_role(self.super_admin, 'SUPER_ADMIN')
        self.admin = UserFactory()
        _set_role(self.admin, 'ADMIN')
        self.template = CertificateTemplateFactory(created_by=self.super_admin)
        self.congregation = CongregationFactory(created_by=self.super_admin)

    def _create_payload(self, **over):
        base = {
            'congregation': str(self.congregation.id),
            'ceremony_start_date': str(self.congregation.ceremony_month),
            'ceremony_end_date': str(self.congregation.ceremony_month),
            'scope_type': 'INSTITUTION',
            'confirmation_deadline': timezone.make_aware(datetime.combine(self.congregation.ceremony_month - timedelta(days=7), time(23, 59))).isoformat(),
            'session_number': None,
            'certificate_template': str(self.template.id),
        }
        base.update(over)
        return base

    def test_admin_cannot_create(self):
        _auth(self.client, self.admin)
        resp = self.client.post('/api/registry/sessions/', self._create_payload(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_super_admin_can_create(self):
        _auth(self.client, self.super_admin)
        resp = self.client.post('/api/registry/sessions/', self._create_payload(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
        self.assertEqual(resp.data['status'], 'DRAFT')

    def test_cannot_edit_published_session(self):
        session = CongregationSessionFactory()
        from registry.services import SessionLifecycleService
        SessionLifecycleService().transition(
            session, CongregationSession.STATUS_PUBLISHED, actor=self.super_admin,
        )
        _auth(self.client, self.super_admin)
        resp = self.client.patch(
            f'/api/registry/sessions/{session.id}/',
            {'name': 'Renamed'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class RecordApiTests(APITestCase):
    def setUp(self):
        self.super_admin = UserFactory(is_superuser=True)
        _set_role(self.super_admin, 'SUPER_ADMIN')
        self.session = CongregationSessionFactory()
        _auth(self.client, self.super_admin)

    def test_create_record_in_draft(self):
        resp = self.client.post(
            f'/api/registry/sessions/{self.session.id}/records/',
            {
                'index_number': 'UEW100',
                'full_name': 'Test Student',
                'institutional_email': 'test@uew.edu.gh',
                'programme': 'BSc',
                'class_of_degree': 'First',
                'date_of_completion': '2025-06-01',
            },
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
        self.assertEqual(StudentRecord.objects.filter(session=self.session).count(), 1)

    def test_cannot_create_in_published(self):
        from registry.services import SessionLifecycleService
        SessionLifecycleService().transition(
            self.session, CongregationSession.STATUS_PUBLISHED, actor=self.super_admin,
        )
        resp = self.client.post(
            f'/api/registry/sessions/{self.session.id}/records/',
            {
                'index_number': 'UEW100',
                'full_name': 'Test',
                'institutional_email': 'test@uew.edu.gh',
                'programme': 'BSc',
                'class_of_degree': 'First',
                'date_of_completion': '2025-06-01',
            },
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class ImportUploadApiTests(APITestCase):
    def setUp(self):
        self.super_admin = UserFactory(is_superuser=True)
        _set_role(self.super_admin, 'SUPER_ADMIN')
        self.session = CongregationSessionFactory()
        _auth(self.client, self.super_admin)

    def test_upload_csv(self):
        from io import BytesIO
        content = ('\r\n'.join([
            HEADERS,
            'UEW001,Jane,jane@uew.edu.gh,BSc,First,2025-06-01,,',
        ])).encode('utf-8')
        upload = BytesIO(content)
        upload.name = 'records.csv'
        resp = self.client.post(
            f'/api/registry/sessions/{self.session.id}/imports/upload/',
            {'file': upload},
            format='multipart',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
        self.assertEqual(resp.data['success_count'], 1)
        self.assertEqual(ImportBatch.objects.filter(session=self.session).count(), 1)
