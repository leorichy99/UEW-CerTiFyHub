"""Tests for Slice 7: registry notifications + deadline auto-close beat task."""

from datetime import timedelta
from unittest.mock import patch

from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from notifications.models import Notification
from registry.models import (
    CongregationSession, StudentRecord,
)
from registry.services import (
    ConfirmationService, IssuanceService, PublicationService,
)
from registry.services.token_service import generate_token, hash_token
from registry.tasks import auto_close_expired_confirmation_windows
from tests.factories import (
    UserFactory, CongregationSessionFactory, StudentRecordFactory,
)


def _seed_published(session, *, n=2):
    records = [
        StudentRecordFactory(session=session, index_number=f'UEW{i:03d}')
        for i in range(1, n + 1)
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
class RegistryNotificationsTests(APITestCase):
    def setUp(self):
        self.actor = UserFactory()

    def test_publish_fires_super_admin_notification(self):
        session = CongregationSessionFactory()
        StudentRecordFactory(session=session, index_number='UEW001')
        PublicationService().publish(session, actor=self.actor)
        n = Notification.objects.filter(
            role_target='SUPER_ADMIN',
            related_object_type='congregation_session',
            related_object_id=str(session.id),
        )
        self.assertTrue(n.filter(metadata__event='session_published').exists())

    def test_close_confirmation_notifies_with_flag_count(self):
        session = CongregationSessionFactory()
        records = _seed_published(session, n=2)
        # Confirm one, leave one pending → 1 will be flagged
        ConfirmationService().confirm(records[0])
        IssuanceService().close_confirmation(session, actor=self.actor)
        notif = Notification.objects.get(
            metadata__event='confirmation_closed',
            related_object_id=str(session.id),
        )
        self.assertEqual(notif.metadata.get('flagged'), 1)
        self.assertEqual(notif.priority, 'warning')

    def test_issuance_finish_uses_critical_priority_when_failures(self):
        session = CongregationSessionFactory()
        records = _seed_published(session, n=1)
        ConfirmationService().confirm(records[0])
        IssuanceService().close_confirmation(session, actor=self.actor)
        # Force the certificate-generation call to fail
        with patch(
            'registry.services.issuance_service.Certificate.objects.create',
            side_effect=RuntimeError('boom'),
        ):
            IssuanceService().start_issuance(session, actor=self.actor)
        notif = Notification.objects.get(
            metadata__event='issuance_finished',
            related_object_id=str(session.id),
        )
        self.assertEqual(notif.priority, 'critical')
        self.assertEqual(notif.metadata.get('failed'), 1)

    def test_public_dispute_notifies_admins(self):
        session = CongregationSessionFactory()
        records = _seed_published(session, n=1)
        ConfirmationService().dispute(
            records[0], note='Wrong middle name', ip='127.0.0.1',
        )
        self.assertTrue(
            Notification.objects.filter(
                metadata__event='dispute_raised',
                related_object_id=str(session.id),
            ).exists()
        )


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class AutoCloseDeadlineTaskTests(APITestCase):
    def test_task_closes_session_past_deadline(self):
        actor = UserFactory()
        session = CongregationSessionFactory(
            confirmation_deadline=timezone.localdate() - timedelta(days=1),
        )
        _seed_published(session, n=2)

        result = auto_close_expired_confirmation_windows()

        self.assertEqual(result['closed'], 1)
        session.refresh_from_db()
        self.assertEqual(
            session.status, CongregationSession.STATUS_CONFIRMATION_CLOSED,
        )
        # Both records were pending → both flagged
        self.assertEqual(
            StudentRecord.objects
            .filter(session=session, confirmation_status=StudentRecord.CONF_FLAGGED)
            .count(),
            2,
        )

    def test_task_ignores_sessions_within_deadline(self):
        session = CongregationSessionFactory(
            confirmation_deadline=timezone.localdate() + timedelta(days=3),
        )
        _seed_published(session, n=1)
        result = auto_close_expired_confirmation_windows()
        self.assertEqual(result['closed'], 0)
        session.refresh_from_db()
        self.assertEqual(session.status, CongregationSession.STATUS_PUBLISHED)

    def test_task_skips_non_publishable_states(self):
        # DRAFT session past its deadline must not be auto-closed
        session = CongregationSessionFactory(
            confirmation_deadline=timezone.localdate() - timedelta(days=5),
        )
        result = auto_close_expired_confirmation_windows()
        self.assertEqual(result['closed'], 0)
        session.refresh_from_db()
        self.assertEqual(session.status, CongregationSession.STATUS_DRAFT)
