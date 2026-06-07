"""Tests for dispute resolution (correct + reject)."""

from datetime import timedelta

from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from registry.models import (
    CongregationSession, StudentRecord, EmailDeliveryLog, ConfirmationAuditLog,
)
from registry.services import (
    DisputeService, DisputeResolutionError, ConfirmationService,
)
from registry.services.token_service import generate_token, hash_token
from tests.factories import (
    UserFactory, CongregationSessionFactory, StudentRecordFactory,
)


def _publish_with_dispute(session, actor, *, note='Name is misspelled.'):
    """Move the session to PUBLISHED and put one record in DISPUTED."""
    record = StudentRecordFactory(session=session, index_number='UEW001')
    raw = generate_token()
    record.confirmation_token_hash = hash_token(raw)
    record.confirmation_token_expires_at = timezone.now() + timedelta(days=7)
    record.save(update_fields=[
        'confirmation_token_hash', 'confirmation_token_expires_at',
    ])
    session.status = CongregationSession.STATUS_PUBLISHED
    session.published_at = timezone.now()
    session.save(update_fields=['status', 'published_at'])
    ConfirmationService().dispute(record, note=note)
    record.refresh_from_db()
    return record, raw


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class DisputeServiceTests(APITestCase):
    def setUp(self):
        self.actor = UserFactory()
        self.session = CongregationSessionFactory()
        self.record, _ = _publish_with_dispute(self.session, self.actor)
        self.service = DisputeService()

    def test_correct_changes_record_and_reissues_token(self):
        prior_hash = self.record.confirmation_token_hash
        result = self.service.correct(
            self.record, actor=self.actor,
            corrections={'full_name': 'Jane Adwoa Doe'},
            resolution_note='Confirmed via student ID card.',
        )
        result.refresh_from_db()
        self.assertEqual(result.full_name, 'Jane Adwoa Doe')
        self.assertEqual(result.confirmation_status, StudentRecord.CONF_PENDING)
        self.assertNotEqual(result.confirmation_token_hash, prior_hash)
        self.assertIsNotNone(result.dispute_resolved_at)
        self.assertEqual(result.dispute_resolved_by, self.actor)
        # Re-confirmation email dispatched
        self.assertEqual(len(mail.outbox), 1)
        self.assertTrue(EmailDeliveryLog.objects.filter(
            student_record=result,
            email_type=EmailDeliveryLog.TYPE_RECORD_CORRECTED,
            status=EmailDeliveryLog.STATUS_SENT,
        ).exists())

    def test_reject_marks_confirmed_with_note(self):
        result = self.service.reject(
            self.record, actor=self.actor,
            resolution_note='Original spelling matches admission record.',
        )
        result.refresh_from_db()
        self.assertEqual(result.confirmation_status, StudentRecord.CONF_CONFIRMED)
        self.assertEqual(
            result.dispute_resolution_note,
            'Original spelling matches admission record.',
        )
        self.assertEqual(len(mail.outbox), 1)
        self.assertTrue(EmailDeliveryLog.objects.filter(
            student_record=result,
            email_type=EmailDeliveryLog.TYPE_DISPUTE_REJECTED,
        ).exists())

    def test_reject_requires_note(self):
        with self.assertRaises(DisputeResolutionError):
            self.service.reject(self.record, actor=self.actor, resolution_note='')

    def test_cannot_correct_non_disputed_record(self):
        # Resolve once to move out of DISPUTED, then try again
        self.service.reject(self.record, actor=self.actor, resolution_note='ok')
        with self.assertRaises(DisputeResolutionError):
            self.service.correct(
                self.record, actor=self.actor,
                corrections={'full_name': 'X'},
            )

    def test_cannot_correct_unknown_field(self):
        with self.assertRaises(DisputeResolutionError):
            self.service.correct(
                self.record, actor=self.actor,
                corrections={'session_id': 'whatever'},
            )


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class DisputeEndpointTests(APITestCase):
    def setUp(self):
        self.actor = UserFactory(is_superuser=True)
        self.actor.profile.role = 'SUPER_ADMIN'
        self.actor.profile.save(update_fields=['role'])
        token = RefreshToken.for_user(self.actor).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        self.session = CongregationSessionFactory(created_by=self.actor)
        self.record, _ = _publish_with_dispute(self.session, self.actor)

    def test_list_disputes(self):
        resp = self.client.get(f'/api/registry/sessions/{self.session.id}/disputes/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['index_number'], 'UEW001')

    def test_resolve_correct_endpoint(self):
        resp = self.client.post(
            f'/api/registry/sessions/{self.session.id}/records/{self.record.id}/resolve-dispute/',
            {
                'mode': 'correct',
                'corrections': {'full_name': 'Jane Adwoa Doe'},
                'resolution_note': 'Confirmed via student ID.',
            },
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        self.assertEqual(resp.data['full_name'], 'Jane Adwoa Doe')
        self.assertEqual(resp.data['confirmation_status'], 'PENDING')

    def test_resolve_reject_endpoint(self):
        resp = self.client.post(
            f'/api/registry/sessions/{self.session.id}/records/{self.record.id}/resolve-dispute/',
            {'mode': 'reject', 'resolution_note': 'Original is correct.'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        self.assertEqual(resp.data['confirmation_status'], 'CONFIRMED')

    def test_resolve_requires_valid_mode(self):
        resp = self.client.post(
            f'/api/registry/sessions/{self.session.id}/records/{self.record.id}/resolve-dispute/',
            {'mode': 'shrug'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
