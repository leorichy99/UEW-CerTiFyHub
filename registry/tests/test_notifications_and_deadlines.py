"""Tests for registry notifications + deadline auto-close beat task."""

from datetime import timedelta
from unittest.mock import patch

from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from notifications.models import Notification
from registry.models import (
    IssuanceBatch, StudentRecord,
)
from registry.services import (
    ConfirmationService, IssuanceService, PublicationService,
)
from registry.services.token_service import generate_token, hash_token
from registry.tasks import auto_close_expired_confirmation_windows
from tests.factories import (
    UserFactory, IssuanceBatchFactory, StudentRecordFactory,
)


def _seed_published(batch, *, n=2):
    records = [
        StudentRecordFactory(batch=batch, index_number=f'UEW{i:03d}')
        for i in range(1, n + 1)
    ]
    for r in records:
        raw = generate_token()
        r.confirmation_token_hash = hash_token(raw)
        r.confirmation_token_expires_at = timezone.now() + timedelta(days=7)
        r.save(update_fields=[
            'confirmation_token_hash', 'confirmation_token_expires_at',
        ])
    batch.status = IssuanceBatch.STATUS_PUBLISHED
    batch.published_at = timezone.now()
    batch.save(update_fields=['status', 'published_at'])
    return records


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class RegistryNotificationsTests(APITestCase):
    def setUp(self):
        self.actor = UserFactory()

    def test_publish_fires_super_admin_notification(self):
        batch = IssuanceBatchFactory()
        StudentRecordFactory(batch=batch, index_number='UEW001')
        PublicationService().publish(batch, actor=self.actor)
        n = Notification.objects.filter(
            role_target='SUPER_ADMIN',
            related_object_type='issuance_batch',
            related_object_id=str(batch.id),
        )
        self.assertTrue(n.filter(metadata__event='batch_published').exists())

    def test_close_confirmation_notifies_with_flag_count(self):
        batch = IssuanceBatchFactory()
        records = _seed_published(batch, n=2)
        # Confirm one, leave one pending -> 1 will be flagged
        ConfirmationService().confirm(records[0])
        IssuanceService().close_confirmation(batch, actor=self.actor)
        notif = Notification.objects.get(
            metadata__event='confirmation_closed',
            related_object_id=str(batch.id),
        )
        self.assertEqual(notif.metadata.get('flagged'), 1)
        self.assertEqual(notif.priority, 'warning')

    def test_issuance_finish_uses_critical_priority_when_failures(self):
        batch = IssuanceBatchFactory()
        records = _seed_published(batch, n=1)
        ConfirmationService().confirm(records[0])
        IssuanceService().close_confirmation(batch, actor=self.actor)
        # Force the certificate-generation call to fail
        with patch(
            'registry.services.issuance_service.Certificate.objects.create',
            side_effect=RuntimeError('boom'),
        ):
            IssuanceService().start_issuance(batch, actor=self.actor)
        notif = Notification.objects.get(
            metadata__event='issuance_finished',
            related_object_id=str(batch.id),
        )
        self.assertEqual(notif.priority, 'critical')
        self.assertEqual(notif.metadata.get('failed'), 1)

    def test_public_dispute_notifies_admins(self):
        batch = IssuanceBatchFactory()
        records = _seed_published(batch, n=1)
        ConfirmationService().dispute(
            records[0], note='Wrong middle name', ip='127.0.0.1',
        )
        self.assertTrue(
            Notification.objects.filter(
                metadata__event='dispute_raised',
                related_object_id=str(batch.id),
            ).exists()
        )


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class AutoCloseDeadlineTaskTests(APITestCase):
    def test_task_closes_batch_past_deadline(self):
        actor = UserFactory()
        batch = IssuanceBatchFactory(
            confirmation_deadline=timezone.localdate() - timedelta(days=1),
        )
        _seed_published(batch, n=2)

        result = auto_close_expired_confirmation_windows()

        self.assertEqual(result['closed'], 1)
        batch.refresh_from_db()
        self.assertEqual(
            batch.status, IssuanceBatch.STATUS_CONFIRMATION_CLOSED,
        )
        # Both records were pending -> both flagged
        self.assertEqual(
            StudentRecord.objects
            .filter(batch=batch, confirmation_status=StudentRecord.CONF_FLAGGED)
            .count(),
            2,
        )

    def test_task_ignores_batches_within_deadline(self):
        batch = IssuanceBatchFactory(
            confirmation_deadline=timezone.localdate() + timedelta(days=3),
        )
        _seed_published(batch, n=1)
        result = auto_close_expired_confirmation_windows()
        self.assertEqual(result['closed'], 0)
        batch.refresh_from_db()
        self.assertEqual(batch.status, IssuanceBatch.STATUS_PUBLISHED)

    def test_task_skips_non_publishable_states(self):
        # DRAFT batch past its deadline must not be auto-closed
        batch = IssuanceBatchFactory(
            confirmation_deadline=timezone.localdate() - timedelta(days=5),
        )
        result = auto_close_expired_confirmation_windows()
        self.assertEqual(result['closed'], 0)
        batch.refresh_from_db()
        self.assertEqual(batch.status, IssuanceBatch.STATUS_DRAFT)
