"""Tests for publication: token generation and email dispatch."""

from datetime import date

from django.core import mail
from django.test import TestCase, override_settings

from registry.models import (
    CongregationSession, StudentRecord, EmailDeliveryLog,
    ConfirmationAuditLog,
)
from registry.services import (
    PublicationService, PublicationError, SessionLifecycleService,
)
from registry.services.token_service import hash_token
from tests.factories import (
    UserFactory, CongregationSessionFactory, StudentRecordFactory,
)


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class PublicationTests(TestCase):
    def setUp(self):
        self.actor = UserFactory()
        self.service = PublicationService()

    def test_rejects_empty_session(self):
        session = CongregationSessionFactory()
        with self.assertRaises(PublicationError):
            self.service.publish(session, actor=self.actor)

    def test_rejects_non_draft_session(self):
        session = CongregationSessionFactory()
        StudentRecordFactory(session=session)
        SessionLifecycleService().transition(
            session, CongregationSession.STATUS_PUBLISHED, actor=self.actor,
        )
        with self.assertRaises(PublicationError):
            self.service.publish(session, actor=self.actor)

    def test_happy_path_generates_tokens_and_emails(self):
        session = CongregationSessionFactory()
        r1 = StudentRecordFactory(session=session)
        r2 = StudentRecordFactory(session=session)

        result = self.service.publish(session, actor=self.actor)

        self.assertEqual(result['total'], 2)
        self.assertEqual(result['sent'], 2)
        session.refresh_from_db()
        self.assertEqual(session.status, CongregationSession.STATUS_PUBLISHED)

        for r in (r1, r2):
            r.refresh_from_db()
            self.assertTrue(r.confirmation_token_hash)
            self.assertIsNotNone(r.confirmation_token_expires_at)
            self.assertEqual(r.confirmation_email_status, StudentRecord.DELIVERY_SENT)

        self.assertEqual(EmailDeliveryLog.objects.filter(session=session).count(), 2)
        self.assertEqual(len(mail.outbox), 2)
        events = set(ConfirmationAuditLog.objects.filter(session=session)
                     .values_list('event_type', flat=True))
        self.assertIn('TOKEN_GENERATED', events)
        self.assertIn('EMAIL_SENT', events)

    def test_token_is_hashed_not_plaintext(self):
        session = CongregationSessionFactory()
        StudentRecordFactory(session=session)
        self.service.publish(session, actor=self.actor)
        record = StudentRecord.objects.get(session=session)
        # 64 hex chars = SHA-256
        self.assertEqual(len(record.confirmation_token_hash), 64)
        self.assertTrue(all(c in '0123456789abcdef' for c in record.confirmation_token_hash))
