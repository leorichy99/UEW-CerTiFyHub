"""Slice 1 tests — Congregation model, service, and API."""

from datetime import date, datetime, time, timedelta

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from registry.models import Congregation, CongregationSession
from registry.services import (
    CongregationService, CongregationError,
    SessionLifecycleService, SessionLifecycleError,
    derive_congregation_status,
    CONGREGATION_STATUS_DRAFT, CONGREGATION_STATUS_IN_PROGRESS,
    CONGREGATION_STATUS_COMPLETED, CONGREGATION_STATUS_ARCHIVED,
)
from tests.factories import (
    UserFactory, CertificateTemplateFactory,
    CongregationFactory, CongregationSessionFactory, StudentRecordFactory,
)


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")


def _set_role(user, role):
    user.profile.role = role
    user.profile.save(update_fields=['role'])


# ─────────────────────────────────────────────────────────────────────────────
#  Pure derived-status function
# ─────────────────────────────────────────────────────────────────────────────

class DeriveCongregationStatusTests(TestCase):
    def test_empty_is_draft(self):
        self.assertEqual(derive_congregation_status([]), CONGREGATION_STATUS_DRAFT)

    def test_all_draft(self):
        self.assertEqual(
            derive_congregation_status(['DRAFT', 'DRAFT']),
            CONGREGATION_STATUS_DRAFT,
        )

    def test_all_completed(self):
        self.assertEqual(
            derive_congregation_status(['COMPLETED', 'COMPLETED']),
            CONGREGATION_STATUS_COMPLETED,
        )

    def test_all_archived(self):
        self.assertEqual(
            derive_congregation_status(['ARCHIVED', 'ARCHIVED']),
            CONGREGATION_STATUS_ARCHIVED,
        )

    def test_completed_plus_archived_is_completed(self):
        self.assertEqual(
            derive_congregation_status(['COMPLETED', 'ARCHIVED']),
            CONGREGATION_STATUS_COMPLETED,
        )

    def test_mixed_in_flight(self):
        self.assertEqual(
            derive_congregation_status(['DRAFT', 'PUBLISHED']),
            CONGREGATION_STATUS_IN_PROGRESS,
        )

    def test_one_completed_one_pending(self):
        self.assertEqual(
            derive_congregation_status(['COMPLETED', 'CONFIRMATION_OPEN']),
            CONGREGATION_STATUS_IN_PROGRESS,
        )


# ─────────────────────────────────────────────────────────────────────────────
#  Service layer
# ─────────────────────────────────────────────────────────────────────────────

class CongregationServiceTests(TestCase):
    def setUp(self):
        self.user = UserFactory()
        self.service = CongregationService()

    def test_create_normalises_ceremony_month_to_day_1(self):
        c = self.service.create(
            name='40th Congregation', year=2027,
            ceremony_month=date(2027, 11, 15),
            created_by=self.user,
        )
        self.assertEqual(c.ceremony_month, date(2027, 11, 1))

    def test_create_rejects_duplicate_year(self):
        self.service.create(
            name='40th', year=2030, ceremony_month=date(2030, 11, 1),
            created_by=self.user,
        )
        with self.assertRaises(CongregationError):
            self.service.create(
                name='40th-dup', year=2030,
                ceremony_month=date(2030, 12, 1), created_by=self.user,
            )

    def test_create_rejects_blank_name(self):
        with self.assertRaises(CongregationError):
            self.service.create(
                name='   ', year=2031, ceremony_month=date(2031, 1, 1),
                created_by=self.user,
            )

    def test_get_status_reflects_child_session_statuses(self):
        c = self.service.create(
            name='Year', year=2032, ceremony_month=date(2032, 6, 1),
            created_by=self.user,
        )
        # No sessions yet → DRAFT.
        self.assertEqual(self.service.get_status(c), CONGREGATION_STATUS_DRAFT)
        s = CongregationSessionFactory(congregation=c, session_number=1)
        SessionLifecycleService().transition(
            s, CongregationSession.STATUS_PUBLISHED, actor=self.user,
        )
        self.assertEqual(self.service.get_status(c), CONGREGATION_STATUS_IN_PROGRESS)

    def test_archive_refuses_unfinished_sessions(self):
        c = self.service.create(
            name='Y', year=2033, ceremony_month=date(2033, 1, 1),
            created_by=self.user,
        )
        CongregationSessionFactory(congregation=c, session_number=1)
        with self.assertRaises(CongregationError):
            self.service.archive(c, actor=self.user)

    def test_archive_archives_completed_sessions(self):
        c = self.service.create(
            name='Y', year=2034, ceremony_month=date(2034, 1, 1),
            created_by=self.user,
        )
        s = CongregationSessionFactory(congregation=c, session_number=1)
        # Drive the session through the full status machine.
        lifecycle = SessionLifecycleService()
        for to in [
            CongregationSession.STATUS_PUBLISHED,
            CongregationSession.STATUS_CONFIRMATION_CLOSED,
            CongregationSession.STATUS_ISSUANCE_IN_PROGRESS,
            CongregationSession.STATUS_COMPLETED,
        ]:
            lifecycle.transition(s, to, actor=self.user)

        result = self.service.archive(c, actor=self.user)
        s.refresh_from_db()
        self.assertEqual(s.status, CongregationSession.STATUS_ARCHIVED)
        self.assertEqual(result['archived_sessions'], 1)


# ─────────────────────────────────────────────────────────────────────────────
#  SessionLifecycleService.create — congregation-aware
# ─────────────────────────────────────────────────────────────────────────────

class SessionLifecycleCongregationTests(TestCase):
    def setUp(self):
        self.user = UserFactory()
        self.template = CertificateTemplateFactory(created_by=self.user)
        self.congregation = CongregationFactory(created_by=self.user)
        self.service = SessionLifecycleService()

    def _kwargs(self, **over):
        base = dict(
            congregation=self.congregation,
            name='First Session',
            academic_year='2030/2031',
            ceremony_start_date=self.congregation.ceremony_month,
            ceremony_end_date=self.congregation.ceremony_month,
            scope_type=CongregationSession.SCOPE_INSTITUTION,
            confirmation_deadline=timezone.make_aware(datetime.combine(self.congregation.ceremony_month - timedelta(days=7), time(23, 59))),
            certificate_template=self.template,
            created_by=self.user,
        )
        base.update(over)
        return base

    def test_auto_assigns_session_number(self):
        s1 = self.service.create(**self._kwargs())
        s2 = self.service.create(**self._kwargs(name='Second Session'))
        self.assertEqual(s1.session_number, 1)
        self.assertEqual(s2.session_number, 2)

    def test_records_original_deadline_on_create(self):
        s = self.service.create(**self._kwargs())
        self.assertEqual(s.confirmation_deadline_original, s.confirmation_deadline)

    @override_settings(REGISTRY_MAX_SESSIONS_PER_CONGREGATION=2)
    def test_enforces_max_sessions_per_congregation(self):
        self.service.create(**self._kwargs())
        self.service.create(**self._kwargs(name='Second Session'))
        with self.assertRaises(SessionLifecycleError):
            self.service.create(**self._kwargs(name='Third Session'))

    def test_unique_name_within_congregation(self):
        self.service.create(**self._kwargs())
        with self.assertRaises(Exception):
            # Same name in the same congregation must be rejected by the
            # UniqueConstraint at the DB layer.
            CongregationSession.objects.create(
                congregation=self.congregation, session_number=2,
                name='First Session', academic_year='x',
                ceremony_start_date=self.congregation.ceremony_month,
                ceremony_end_date=self.congregation.ceremony_month,
                scope_type=CongregationSession.SCOPE_INSTITUTION,
                confirmation_deadline=timezone.make_aware(datetime.combine(self.congregation.ceremony_month - timedelta(days=1), time(23, 59))),
                certificate_template=self.template, created_by=self.user,
            )


# ─────────────────────────────────────────────────────────────────────────────
#  StudentRecord.save denormalises congregation
# ─────────────────────────────────────────────────────────────────────────────

class StudentRecordCongregationSyncTests(TestCase):
    def test_record_save_populates_congregation_from_session(self):
        c = CongregationFactory()
        s = CongregationSessionFactory(congregation=c)
        r = StudentRecordFactory(session=s)
        r.refresh_from_db()
        self.assertEqual(r.congregation_id, c.id)


# ─────────────────────────────────────────────────────────────────────────────
#  API
# ─────────────────────────────────────────────────────────────────────────────

class CongregationApiTests(APITestCase):
    def setUp(self):
        self.super_admin = UserFactory(is_superuser=True)
        _set_role(self.super_admin, 'SUPER_ADMIN')
        _auth(self.client, self.super_admin)

    def test_list_returns_derived_status_and_counts(self):
        c = CongregationFactory(year=2040, created_by=self.super_admin)
        CongregationSessionFactory(congregation=c, session_number=1)
        resp = self.client.get('/api/registry/congregations/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        rows = resp.data['results'] if 'results' in resp.data else resp.data
        ours = next(r for r in rows if r['year'] == 2040)
        self.assertEqual(ours['session_count'], 1)
        self.assertIn('status', ours)
        self.assertIn('counts', ours)

    def test_list_status_filter(self):
        # One DRAFT congregation, one IN_PROGRESS.
        CongregationFactory(year=2041, created_by=self.super_admin)
        c2 = CongregationFactory(year=2042, created_by=self.super_admin)
        s = CongregationSessionFactory(congregation=c2, session_number=1)
        SessionLifecycleService().transition(
            s, CongregationSession.STATUS_PUBLISHED, actor=self.super_admin,
        )
        resp = self.client.get('/api/registry/congregations/', {'status': 'IN_PROGRESS'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        rows = resp.data['results'] if 'results' in resp.data else resp.data
        years = {r['year'] for r in rows}
        self.assertIn(2042, years)
        self.assertNotIn(2041, years)

    def test_retrieve_embeds_sessions(self):
        c = CongregationFactory(year=2043, created_by=self.super_admin)
        CongregationSessionFactory(congregation=c, session_number=1)
        resp = self.client.get(f'/api/registry/congregations/{c.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data['sessions']), 1)

    def test_create_congregation(self):
        resp = self.client.post(
            '/api/registry/congregations/',
            {
                'name': '40th Congregation',
                'year': 2044,
                'ceremony_month': '2044-11-15',
                'description': 'Annual graduation.',
            },
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
        # Normalised to day 1.
        self.assertTrue(resp.data['ceremony_month'].startswith('2044-11-01'))

    def test_create_rejects_duplicate_year(self):
        CongregationFactory(year=2045, created_by=self.super_admin)
        resp = self.client.post(
            '/api/registry/congregations/',
            {'name': 'dup', 'year': 2045, 'ceremony_month': '2045-06-01'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_destroy_not_allowed(self):
        c = CongregationFactory(year=2046, created_by=self.super_admin)
        resp = self.client.delete(f'/api/registry/congregations/{c.id}/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_alias_mount(self):
        """The dual-mount alias under /api/admin/ exposes the same endpoint."""
        CongregationFactory(year=2047, created_by=self.super_admin)
        resp = self.client.get('/api/admin/congregations/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
