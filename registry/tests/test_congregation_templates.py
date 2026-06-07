"""Slice 4 tests — CongregationTemplate + apply/snapshot flows."""

from datetime import datetime, time, timedelta

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from registry.models import (
    CongregationSession, CongregationTemplate, CongregationTemplateSessionDef,
)
from registry.services import (
    CongregationTemplateService, CongregationTemplateError,
)
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


# ─────────────────────────────────────────────────────────────────────────────
#  Service: create / update
# ─────────────────────────────────────────────────────────────────────────────

class TemplateCreateTests(TestCase):
    def setUp(self):
        self.user = UserFactory()
        self.cert = CertificateTemplateFactory()
        self.service = CongregationTemplateService()

    def _base_def(self, session_number=1, **overrides):
        return {
            'session_number': session_number,
            'name_pattern': '{year} Congregation · Session {n}',
            'scope_type': CongregationSession.SCOPE_INSTITUTION,
            'ceremony_day_offset': 0,
            'confirmation_window_days': 14,
            'default_certificate_template': str(self.cert.id),
            **overrides,
        }

    def test_create_happy_path(self):
        template = self.service.create(
            name='Standard 2-session',
            description='Spring + Autumn',
            created_by=self.user,
            session_defs=[
                self._base_def(1),
                self._base_def(2, ceremony_day_offset=180),
            ],
        )
        self.assertEqual(template.session_defs.count(), 2)
        self.assertTrue(template.is_active)

    def test_create_requires_at_least_one_session_def(self):
        with self.assertRaises(CongregationTemplateError):
            self.service.create(
                name='Empty', description='', created_by=self.user,
                session_defs=[],
            )

    def test_create_rejects_duplicate_session_numbers(self):
        with self.assertRaises(CongregationTemplateError):
            self.service.create(
                name='Dup', description='', created_by=self.user,
                session_defs=[self._base_def(1), self._base_def(1)],
            )

    def test_update_replaces_session_defs(self):
        template = self.service.create(
            name='Old', description='', created_by=self.user,
            session_defs=[self._base_def(1)],
        )
        self.service.update(
            template,
            name='Renamed',
            session_defs=[self._base_def(1), self._base_def(2)],
        )
        template.refresh_from_db()
        self.assertEqual(template.name, 'Renamed')
        self.assertEqual(template.session_defs.count(), 2)


# ─────────────────────────────────────────────────────────────────────────────
#  Service: snapshot + apply
# ─────────────────────────────────────────────────────────────────────────────

@override_settings(REGISTRY_MAX_SESSIONS_PER_CONGREGATION=4)
class TemplateApplyTests(TestCase):
    def setUp(self):
        self.user = UserFactory()
        self.cert = CertificateTemplateFactory()
        self.service = CongregationTemplateService()

    def _template_with_two_sessions(self):
        return self.service.create(
            name='Two-session',
            description='',
            created_by=self.user,
            session_defs=[
                {
                    'session_number': 1,
                    'name_pattern': '{year} Spring',
                    'scope_type': CongregationSession.SCOPE_INSTITUTION,
                    'ceremony_day_offset': 0,
                    'confirmation_window_days': 14,
                    'default_certificate_template': str(self.cert.id),
                },
                {
                    'session_number': 2,
                    'name_pattern': '{year} Autumn',
                    'scope_type': CongregationSession.SCOPE_INSTITUTION,
                    'ceremony_day_offset': 15,
                    'confirmation_window_days': 7,
                    'default_certificate_template': str(self.cert.id),
                },
            ],
        )

    def test_apply_creates_sessions_with_correct_dates(self):
        template = self._template_with_two_sessions()
        target = CongregationFactory()
        sessions = self.service.apply_to_congregation(
            template, target, actor=self.user,
        )
        self.assertEqual(len(sessions), 2)
        s1, s2 = sorted(sessions, key=lambda s: s.session_number)
        self.assertEqual(s1.ceremony_start_date, target.ceremony_month)
        self.assertEqual(
            s2.ceremony_start_date, target.ceremony_month + timedelta(days=15),
        )
        # Confirmation deadlines respect the window.
        self.assertEqual(
            (s1.ceremony_start_date - s1.confirmation_deadline.date()).days, 14,
        )
        self.assertEqual(
            (s2.ceremony_start_date - s2.confirmation_deadline.date()).days, 7,
        )
        # The target now points back at the template.
        target.refresh_from_db()
        self.assertEqual(target.sourced_from_template_id, template.id)

    def test_apply_rejects_non_empty_congregation(self):
        template = self._template_with_two_sessions()
        target = CongregationFactory()
        CongregationSessionFactory(congregation=target)
        with self.assertRaises(CongregationTemplateError):
            self.service.apply_to_congregation(template, target, actor=self.user)

    def test_apply_requires_certificate_template_somewhere(self):
        # Build a template without defaults — apply must fail.
        bare = self.service.create(
            name='Bare', description='', created_by=self.user,
            session_defs=[{
                'session_number': 1,
                'name_pattern': 'Session {n}',
                'scope_type': CongregationSession.SCOPE_INSTITUTION,
                'ceremony_day_offset': 0,
                'confirmation_window_days': 14,
                # default_certificate_template intentionally omitted
            }],
        )
        target = CongregationFactory()
        with self.assertRaises(CongregationTemplateError):
            self.service.apply_to_congregation(bare, target, actor=self.user)

    def test_apply_with_overrides(self):
        template = self._template_with_two_sessions()
        target = CongregationFactory()
        sessions = self.service.apply_to_congregation(
            template, target, actor=self.user,
            overrides={1: {'ceremony_day_offset': 5}},
        )
        s1 = next(s for s in sessions if s.session_number == 1)
        self.assertEqual(
            s1.ceremony_start_date, target.ceremony_month + timedelta(days=5),
        )

    def test_snapshot_round_trip(self):
        # Seed a congregation with two sessions, then snapshot + re-apply.
        source = CongregationFactory()
        s1 = CongregationSessionFactory(
            congregation=source, session_number=1,
            ceremony_start_date=source.ceremony_month + timedelta(days=10),
            ceremony_end_date=source.ceremony_month + timedelta(days=10),
            confirmation_deadline=timezone.make_aware(
                datetime.combine(
                    source.ceremony_month + timedelta(days=3),
                    time(23, 59),
                )
            ),
        )
        template = self.service.snapshot_from_congregation(
            source, name='Snapshot of source', description='',
            created_by=self.user,
        )
        self.assertEqual(template.sourced_from_congregation_id, source.id)
        self.assertEqual(template.session_defs.count(), 1)
        sd = template.session_defs.first()
        self.assertEqual(sd.ceremony_day_offset, 10)
        # Re-apply to a fresh congregation — dates should match the source.
        target = CongregationFactory(ceremony_month=source.ceremony_month)
        applied = self.service.apply_to_congregation(
            template, target, actor=self.user,
        )
        self.assertEqual(applied[0].ceremony_start_date, s1.ceremony_start_date)


# ─────────────────────────────────────────────────────────────────────────────
#  API
# ─────────────────────────────────────────────────────────────────────────────

class TemplateApiTests(APITestCase):
    def setUp(self):
        self.admin = UserFactory(is_superuser=True)
        _set_role(self.admin, 'SUPER_ADMIN')
        _auth(self.client, self.admin)
        self.cert = CertificateTemplateFactory()

    def _payload(self):
        return {
            'name': 'API template',
            'description': 'Created via API',
            'session_defs': [
                {
                    'session_number': 1,
                    'name_pattern': '{year} Session {n}',
                    'scope_type': CongregationSession.SCOPE_INSTITUTION,
                    'ceremony_day_offset': 0,
                    'confirmation_window_days': 10,
                    'default_certificate_template': str(self.cert.id),
                },
            ],
        }

    def test_create_template_via_api(self):
        resp = self.client.post(
            '/api/registry/congregation-templates/',
            self._payload(), format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
        self.assertEqual(len(resp.data['session_defs']), 1)

    def test_list_filters_by_active(self):
        self.client.post(
            '/api/registry/congregation-templates/',
            self._payload(), format='json',
        )
        # Deactivate
        template_id = CongregationTemplate.objects.first().id
        self.client.patch(
            f'/api/registry/congregation-templates/{template_id}/',
            {'is_active': False}, format='json',
        )
        resp = self.client.get(
            '/api/registry/congregation-templates/?is_active=true',
        )
        rows = resp.data.get('results', resp.data)
        self.assertEqual(len(rows), 0)

    def test_apply_endpoint(self):
        # Create template
        resp = self.client.post(
            '/api/registry/congregation-templates/',
            self._payload(), format='json',
        )
        template_id = resp.data['id']
        target = CongregationFactory()

        resp = self.client.post(
            f'/api/registry/congregation-templates/{template_id}/apply/',
            {'congregation': str(target.id)}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        self.assertEqual(len(resp.data['sessions']), 1)
        target.refresh_from_db()
        self.assertEqual(str(target.sourced_from_template_id), template_id)

    def test_snapshot_endpoint(self):
        source = CongregationFactory()
        CongregationSessionFactory(congregation=source)
        resp = self.client.post(
            '/api/registry/congregation-templates/from-congregation/',
            {
                'congregation': str(source.id),
                'name': 'Snapshot via API',
                'description': '',
            },
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
        self.assertEqual(str(resp.data['sourced_from_congregation']), str(source.id))

    def test_admin_alias_mount(self):
        resp = self.client.post(
            '/api/admin/congregation-templates/',
            self._payload(), format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
