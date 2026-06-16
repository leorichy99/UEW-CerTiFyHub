"""Tests for publication: token generation and email dispatch."""

from datetime import date

from django.core import mail
from unittest.mock import patch

from django.test import TransactionTestCase, override_settings

from registry.models import (
    IssuanceBatch, StudentRecord, EmailDeliveryLog,
    ConfirmationAuditLog,
)
from registry.services import (
    PublicationService, PublicationError, BatchLifecycleService,
)
from registry.services.token_service import hash_token
from tests.factories import (
    UserFactory, IssuanceBatchFactory, StudentRecordFactory,
)


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class PublicationTests(TransactionTestCase):
    def setUp(self):
        self.actor = UserFactory()
        self.service = PublicationService()

    def test_rejects_empty_batch(self):
        batch = IssuanceBatchFactory()
        with self.assertRaises(PublicationError):
            self.service.publish(batch, actor=self.actor)

    def test_rejects_non_draft_batch(self):
        batch = IssuanceBatchFactory()
        StudentRecordFactory(batch=batch)
        BatchLifecycleService().transition(
            batch, IssuanceBatch.STATUS_PUBLISHED, actor=self.actor,
        )
        with self.assertRaises(PublicationError):
            self.service.publish(batch, actor=self.actor)

    def _mock_send(self, record_id, raw_token):
        from registry.models import StudentRecord
        record = StudentRecord.objects.filter(pk=record_id).first()
        if record:
            PublicationService()._dispatch_invitation(record.batch, record, raw_token)

    def test_happy_path_generates_tokens_and_emails(self):
        batch = IssuanceBatchFactory()
        r1 = StudentRecordFactory(batch=batch)
        r2 = StudentRecordFactory(batch=batch)

        with patch('registry.tasks.send_confirmation_invitation.delay',
                   side_effect=self._mock_send):
            result = self.service.publish(batch, actor=self.actor)

        self.assertEqual(result['total'], 2)
        self.assertEqual(result['sent'], 2)
        batch.refresh_from_db()
        self.assertEqual(batch.status, IssuanceBatch.STATUS_PUBLISHED)

        for r in (r1, r2):
            r.refresh_from_db()
            self.assertTrue(r.confirmation_token_hash)
            self.assertIsNotNone(r.confirmation_token_expires_at)
            self.assertEqual(r.confirmation_email_status, StudentRecord.DELIVERY_SENT)

        self.assertEqual(EmailDeliveryLog.objects.filter(batch=batch).count(), 2)
        self.assertEqual(len(mail.outbox), 2)
        events = set(ConfirmationAuditLog.objects.filter(batch=batch)
                     .values_list('event_type', flat=True))
        self.assertIn('TOKEN_GENERATED', events)
        self.assertIn('EMAIL_SENT', events)

    def test_token_is_hashed_not_plaintext(self):
        batch = IssuanceBatchFactory()
        StudentRecordFactory(batch=batch)

        with patch('registry.tasks.send_confirmation_invitation.delay',
                   side_effect=self._mock_send):
            self.service.publish(batch, actor=self.actor)

        record = StudentRecord.objects.get(batch=batch)
        # 64 hex chars = SHA-256
        self.assertEqual(len(record.confirmation_token_hash), 64)
        self.assertTrue(all(c in '0123456789abcdef' for c in record.confirmation_token_hash))
