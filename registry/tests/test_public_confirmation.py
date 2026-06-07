"""End-to-end tests for the public confirmation endpoints."""

from datetime import timedelta

from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from registry.models import (
    CongregationSession, StudentRecord, ConfirmationAuditLog,
)
from registry.services import (
    PublicationService, ConfirmationService,
)
from registry.services.token_service import generate_token, hash_token
from tests.factories import (
    UserFactory, CongregationSessionFactory, StudentRecordFactory,
)


def _publish(session, actor):
    """Publish a session by hand and return raw tokens keyed by index_number."""
    raw_tokens = {}
    for record in session.student_records.all():
        raw = generate_token()
        record.confirmation_token_hash = hash_token(raw)
        record.confirmation_token_expires_at = timezone.now() + timedelta(days=7)
        record.save(update_fields=[
            'confirmation_token_hash', 'confirmation_token_expires_at',
        ])
        raw_tokens[record.index_number] = raw
    session.status = CongregationSession.STATUS_PUBLISHED
    session.published_at = timezone.now()
    session.save(update_fields=['status', 'published_at'])
    return raw_tokens


class PublicLookupTests(APITestCase):
    def setUp(self):
        self.session = CongregationSessionFactory()
        self.record = StudentRecordFactory(session=self.session, index_number='UEW001')
        self.tokens = _publish(self.session, UserFactory())

    def test_lookup_returns_record(self):
        resp = self.client.get(
            '/api/registry/public/confirm/lookup/',
            {'token': self.tokens['UEW001'], 'index_number': 'UEW001'},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        self.assertEqual(resp.data['record']['index_number'], 'UEW001')
        # Page-view event recorded
        self.assertTrue(ConfirmationAuditLog.objects.filter(
            student_record=self.record, event_type='PAGE_VIEWED',
        ).exists())

    def test_lookup_with_wrong_index_404s(self):
        resp = self.client.get(
            '/api/registry/public/confirm/lookup/',
            {'token': self.tokens['UEW001'], 'index_number': 'WRONG'},
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(resp.data['code'], 'invalid')

    def test_lookup_with_bogus_token_404s(self):
        resp = self.client.get(
            '/api/registry/public/confirm/lookup/',
            {'token': 'not-a-real-token', 'index_number': 'UEW001'},
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_expired_token_410s(self):
        self.record.confirmation_token_expires_at = timezone.now() - timedelta(hours=1)
        self.record.save(update_fields=['confirmation_token_expires_at'])
        resp = self.client.get(
            '/api/registry/public/confirm/lookup/',
            {'token': self.tokens['UEW001'], 'index_number': 'UEW001'},
        )
        self.assertEqual(resp.status_code, status.HTTP_410_GONE)
        self.assertEqual(resp.data['code'], 'expired')

    def test_draft_session_409s(self):
        self.session.status = CongregationSession.STATUS_DRAFT
        self.session.save(update_fields=['status'])
        resp = self.client.get(
            '/api/registry/public/confirm/lookup/',
            {'token': self.tokens['UEW001'], 'index_number': 'UEW001'},
        )
        self.assertEqual(resp.status_code, status.HTTP_409_CONFLICT)


class PublicConfirmTests(APITestCase):
    def setUp(self):
        self.session = CongregationSessionFactory()
        self.record = StudentRecordFactory(session=self.session, index_number='UEW001')
        self.tokens = _publish(self.session, UserFactory())

    def test_confirm_marks_record_confirmed(self):
        resp = self.client.post(
            '/api/registry/public/confirm/confirm/',
            {'token': self.tokens['UEW001'], 'index_number': 'UEW001'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        self.record.refresh_from_db()
        self.assertEqual(self.record.confirmation_status, StudentRecord.CONF_CONFIRMED)
        self.assertIsNotNone(self.record.confirmed_at)


class PublicDisputeTests(APITestCase):
    def setUp(self):
        self.session = CongregationSessionFactory()
        self.record = StudentRecordFactory(session=self.session, index_number='UEW001')
        self.tokens = _publish(self.session, UserFactory())

    def test_dispute_requires_note(self):
        resp = self.client.post(
            '/api/registry/public/confirm/dispute/',
            {'token': self.tokens['UEW001'], 'index_number': 'UEW001'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_dispute_records_note(self):
        resp = self.client.post(
            '/api/registry/public/confirm/dispute/',
            {'token': self.tokens['UEW001'], 'index_number': 'UEW001',
             'note': 'My name is misspelled — should be Jane Doe.'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        self.record.refresh_from_db()
        self.assertEqual(self.record.confirmation_status, StudentRecord.CONF_DISPUTED)
        self.assertIn('misspelled', self.record.dispute_note)


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class PublishEndpointTests(APITestCase):
    """The Super-Admin publish action wires through PublicationService."""

    def setUp(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        self.admin = UserFactory(is_superuser=True)
        self.admin.profile.role = 'SUPER_ADMIN'
        self.admin.profile.save(update_fields=['role'])
        token = RefreshToken.for_user(self.admin).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_publish_endpoint_dispatches_emails(self):
        session = CongregationSessionFactory(created_by=self.admin)
        StudentRecordFactory(session=session)
        StudentRecordFactory(session=session)
        resp = self.client.post(f'/api/registry/sessions/{session.id}/publish/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        self.assertEqual(resp.data['status'], CongregationSession.STATUS_PUBLISHED)
        self.assertEqual(resp.data['publication_summary']['total'], 2)
        self.assertEqual(len(mail.outbox), 2)
