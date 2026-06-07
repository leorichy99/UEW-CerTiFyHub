"""Slice 2 tests — confirmation-deadline extension."""

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from notifications.models import Notification
from registry.models import (
    CongregationSession, DeadlineExtensionLog,
)
from registry.services import (
    SessionLifecycleService, SessionLifecycleError,
)
from tests.factories import (
    UserFactory, CongregationSessionFactory,
)


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")


def _set_role(user, role):
    user.profile.role = role
    user.profile.save(update_fields=['role'])


def _published(actor):
    """Return a fresh PUBLISHED session whose deadline is 7 days out."""
    session = CongregationSessionFactory(
        confirmation_deadline=timezone.now() + timedelta(days=7),
    )
    SessionLifecycleService().transition(
        session, CongregationSession.STATUS_PUBLISHED, actor=actor,
    )
    session.refresh_from_db()
    return session


# ─────────────────────────────────────────────────────────────────────────────
#  Service layer
# ─────────────────────────────────────────────────────────────────────────────

class ExtendDeadlineServiceTests(TestCase):
    def setUp(self):
        self.user = UserFactory()
        self.service = SessionLifecycleService()

    def test_extends_in_published_state(self):
        session = _published(self.user)
        new_deadline = session.confirmation_deadline + timedelta(days=5)
        log = self.service.extend_confirmation_deadline(
            session, new_deadline=new_deadline, actor=self.user, reason='Server issue',
        )
        session.refresh_from_db()
        self.assertEqual(session.confirmation_deadline, new_deadline)
        self.assertEqual(session.confirmation_deadline_extension_count, 1)
        self.assertIsNotNone(session.confirmation_deadline_extended_at)
        self.assertEqual(session.confirmation_deadline_extended_by, self.user)
        self.assertEqual(log.reason, 'Server issue')
        self.assertEqual(DeadlineExtensionLog.objects.filter(session=session).count(), 1)

    def test_records_each_extension(self):
        session = _published(self.user)
        first_deadline = session.confirmation_deadline
        d1 = first_deadline + timedelta(days=2)
        d2 = d1 + timedelta(days=2)
        self.service.extend_confirmation_deadline(
            session, new_deadline=d1, actor=self.user,
        )
        self.service.extend_confirmation_deadline(
            session, new_deadline=d2, actor=self.user,
        )
        session.refresh_from_db()
        self.assertEqual(session.confirmation_deadline_extension_count, 2)
        logs = list(DeadlineExtensionLog.objects.filter(session=session).order_by('extended_at'))
        self.assertEqual(len(logs), 2)
        # The first log captures the original deadline as `previous_deadline`.
        self.assertEqual(logs[0].previous_deadline, first_deadline)
        self.assertEqual(logs[0].new_deadline, d1)
        self.assertEqual(logs[1].previous_deadline, d1)
        self.assertEqual(logs[1].new_deadline, d2)

    def test_rejects_earlier_or_equal_deadline(self):
        session = _published(self.user)
        too_soon = session.confirmation_deadline
        with self.assertRaises(SessionLifecycleError):
            self.service.extend_confirmation_deadline(
                session, new_deadline=too_soon, actor=self.user,
            )
        with self.assertRaises(SessionLifecycleError):
            self.service.extend_confirmation_deadline(
                session, new_deadline=too_soon - timedelta(days=1), actor=self.user,
            )

    def test_rejects_past_deadline(self):
        session = _published(self.user)
        with self.assertRaises(SessionLifecycleError):
            self.service.extend_confirmation_deadline(
                session, new_deadline=timezone.now() - timedelta(days=1),
                actor=self.user,
            )

    def test_rejects_when_session_is_draft(self):
        session = CongregationSessionFactory()
        # DRAFT — never moved to PUBLISHED.
        with self.assertRaises(SessionLifecycleError):
            self.service.extend_confirmation_deadline(
                session,
                new_deadline=timezone.now() + timedelta(days=14),
                actor=self.user,
            )

    def test_rejects_after_confirmation_closed(self):
        session = _published(self.user)
        self.service.transition(
            session, CongregationSession.STATUS_CONFIRMATION_CLOSED, actor=self.user,
        )
        with self.assertRaises(SessionLifecycleError):
            self.service.extend_confirmation_deadline(
                session,
                new_deadline=timezone.now() + timedelta(days=10),
                actor=self.user,
            )

    def test_legacy_session_original_deadline_lazy_populated(self):
        # Simulate a legacy session created before Slice 1 — clear the original.
        session = _published(self.user)
        original = session.confirmation_deadline
        session.confirmation_deadline_original = None
        session.save(update_fields=['confirmation_deadline_original'])

        self.service.extend_confirmation_deadline(
            session,
            new_deadline=session.confirmation_deadline + timedelta(days=3),
            actor=self.user,
        )
        session.refresh_from_db()
        self.assertEqual(session.confirmation_deadline_original, original)


# ─────────────────────────────────────────────────────────────────────────────
#  API
# ─────────────────────────────────────────────────────────────────────────────

class ExtendDeadlineApiTests(APITestCase):
    def setUp(self):
        self.super_admin = UserFactory(is_superuser=True)
        _set_role(self.super_admin, 'SUPER_ADMIN')
        _auth(self.client, self.super_admin)
        self.session = _published(self.super_admin)

    def test_extend_deadline_happy_path(self):
        new_deadline = (self.session.confirmation_deadline + timedelta(days=3)).isoformat()
        resp = self.client.post(
            f'/api/registry/sessions/{self.session.id}/extend-deadline/',
            {'new_deadline': new_deadline, 'reason': 'Power outage on campus'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        self.assertEqual(resp.data['confirmation_deadline_extension_count'], 1)
        self.assertEqual(resp.data['extension']['reason'], 'Power outage on campus')

    def test_extend_deadline_validates_required(self):
        resp = self.client.post(
            f'/api/registry/sessions/{self.session.id}/extend-deadline/',
            {}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_extend_deadline_rejects_invalid_iso(self):
        resp = self.client.post(
            f'/api/registry/sessions/{self.session.id}/extend-deadline/',
            {'new_deadline': 'not-a-date'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_extend_deadline_rejects_long_reason(self):
        new_deadline = (self.session.confirmation_deadline + timedelta(days=3)).isoformat()
        resp = self.client.post(
            f'/api/registry/sessions/{self.session.id}/extend-deadline/',
            {'new_deadline': new_deadline, 'reason': 'x' * 301},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_extension_history_endpoint(self):
        new_deadline = (self.session.confirmation_deadline + timedelta(days=3)).isoformat()
        self.client.post(
            f'/api/registry/sessions/{self.session.id}/extend-deadline/',
            {'new_deadline': new_deadline}, format='json',
        )
        resp = self.client.get(
            f'/api/registry/sessions/{self.session.id}/deadline-extensions/'
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['extended_by_name'], self.super_admin.username)

    def test_extend_fires_super_admin_notification(self):
        new_deadline = (self.session.confirmation_deadline + timedelta(days=3)).isoformat()
        resp = self.client.post(
            f'/api/registry/sessions/{self.session.id}/extend-deadline/',
            {'new_deadline': new_deadline, 'reason': 'Storm closure'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        notif = Notification.objects.filter(
            metadata__event='session.deadline_extended',
        ).first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.priority, 'warning')
        self.assertEqual(notif.metadata.get('reason'), 'Storm closure')

    def test_admin_alias_mount_works(self):
        new_deadline = (self.session.confirmation_deadline + timedelta(days=3)).isoformat()
        resp = self.client.post(
            f'/api/admin/sessions/{self.session.id}/extend-deadline/',
            {'new_deadline': new_deadline}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
