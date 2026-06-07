"""Tests for the issuance pipeline (close → start → complete)."""

from datetime import timedelta

from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from certificates.models import Certificate
from registry.models import (
    CongregationSession, StudentRecord, EmailDeliveryLog,
)
from registry.services import (
    IssuanceService, IssuanceError, SessionLifecycleService,
    ConfirmationService,
)
from registry.services.token_service import generate_token, hash_token
from tests.factories import (
    UserFactory, CongregationSessionFactory, StudentRecordFactory,
)


def _publish(session, *, num_records=3):
    """Move the session to PUBLISHED with N student records carrying tokens."""
    records = [
        StudentRecordFactory(session=session, index_number=f'UEW{n:03d}')
        for n in range(1, num_records + 1)
    ]
    for r in records:
        raw = generate_token()
        r.confirmation_token_hash = hash_token(raw)
        r.confirmation_token_expires_at = timezone.now() + timedelta(days=7)
        r.save(update_fields=[
            'confirmation_token_hash', 'confirmation_token_expires_at',
        ])
    session.status = CongregationSession.STATUS_PUBLISHED
    session.published_at = timezone.now()
    session.save(update_fields=['status', 'published_at'])
    return records


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class CloseConfirmationTests(APITestCase):
    def setUp(self):
        self.actor = UserFactory()
        self.session = CongregationSessionFactory()
        self.records = _publish(self.session, num_records=3)
        # Confirm one, leave two pending
        ConfirmationService().confirm(self.records[0])
        self.service = IssuanceService()

    def test_close_flags_pending_records(self):
        result = self.service.close_confirmation(self.session, actor=self.actor)
        self.assertEqual(result['flagged'], 2)
        self.session.refresh_from_db()
        self.assertEqual(
            self.session.status, CongregationSession.STATUS_CONFIRMATION_CLOSED,
        )
        statuses = list(
            StudentRecord.objects.filter(session=self.session)
            .order_by('index_number')
            .values_list('confirmation_status', flat=True)
        )
        self.assertEqual(statuses, ['CONFIRMED', 'FLAGGED', 'FLAGGED'])

    def test_cannot_close_from_draft(self):
        draft = CongregationSessionFactory()
        with self.assertRaises(IssuanceError):
            self.service.close_confirmation(draft, actor=self.actor)


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class StartIssuanceTests(APITestCase):
    def setUp(self):
        self.actor = UserFactory()
        self.session = CongregationSessionFactory()
        self.records = _publish(self.session, num_records=3)
        ConfirmationService().confirm(self.records[0])
        ConfirmationService().confirm(self.records[1])
        # Leave [2] pending so close_confirmation flags it
        self.service = IssuanceService()
        self.service.close_confirmation(self.session, actor=self.actor)

    def test_issues_only_confirmed_records(self):
        mail.outbox.clear()
        result = self.service.start_issuance(self.session, actor=self.actor)
        self.assertEqual(result['issued'], 2)
        self.assertEqual(result['failed'], 0)
        self.session.refresh_from_db()
        self.assertEqual(
            self.session.status,
            CongregationSession.STATUS_ISSUANCE_IN_PROGRESS,
        )
        self.assertEqual(Certificate.objects.count(), 2)
        for cert in Certificate.objects.all():
            self.assertIsNotNone(cert.student_record)
            self.assertEqual(cert.template, self.session.certificate_template)
            self.assertTrue(cert.certificate_number.startswith('UEW/'))
        # One issuance email per certificate
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(
            EmailDeliveryLog.objects.filter(
                session=self.session,
                email_type=EmailDeliveryLog.TYPE_ISSUANCE,
            ).count(),
            2,
        )

    def test_cannot_start_with_no_confirmed_records(self):
        session = CongregationSessionFactory()
        _publish(session, num_records=2)
        self.service.close_confirmation(session, actor=self.actor)  # all flagged
        with self.assertRaises(IssuanceError):
            self.service.start_issuance(session, actor=self.actor)


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class CompleteSessionTests(APITestCase):
    def setUp(self):
        self.actor = UserFactory()
        self.session = CongregationSessionFactory()
        self.records = _publish(self.session, num_records=2)
        for r in self.records:
            ConfirmationService().confirm(r)
        self.service = IssuanceService()
        self.service.close_confirmation(self.session, actor=self.actor)
        self.service.start_issuance(self.session, actor=self.actor)

    def test_complete_marks_session_completed(self):
        self.service.complete(self.session, actor=self.actor)
        self.session.refresh_from_db()
        self.assertEqual(self.session.status, CongregationSession.STATUS_COMPLETED)
        self.assertIsNotNone(self.session.completed_at)

    def test_cannot_complete_with_outstanding_records(self):
        # Force one record back to QUEUED
        StudentRecord.objects.filter(
            session=self.session,
        ).update(issuance_status=StudentRecord.ISSUE_QUEUED)
        with self.assertRaises(IssuanceError):
            self.service.complete(self.session, actor=self.actor)


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class IssuanceEndpointTests(APITestCase):
    def setUp(self):
        self.actor = UserFactory(is_superuser=True)
        self.actor.profile.role = 'SUPER_ADMIN'
        self.actor.profile.save(update_fields=['role'])
        token = RefreshToken.for_user(self.actor).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        self.session = CongregationSessionFactory(created_by=self.actor)
        self.records = _publish(self.session, num_records=2)
        for r in self.records:
            ConfirmationService().confirm(r)

    def test_full_pipeline_endpoints(self):
        # Close confirmation
        resp = self.client.post(
            f'/api/registry/sessions/{self.session.id}/close-confirmation/'
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        self.assertEqual(resp.data['status'], 'CONFIRMATION_CLOSED')

        # Start issuance
        resp = self.client.post(
            f'/api/registry/sessions/{self.session.id}/start-issuance/'
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        self.assertEqual(resp.data['status'], 'ISSUANCE_IN_PROGRESS')
        self.assertEqual(resp.data['issued_records'], 2)

        # Complete
        resp = self.client.post(f'/api/registry/sessions/{self.session.id}/complete/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        self.assertEqual(resp.data['status'], 'COMPLETED')
