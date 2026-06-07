"""Tests for SessionLifecycleService transitions."""

from datetime import date, datetime, time, timedelta

from django.test import TestCase
from django.utils import timezone

from registry.models import CongregationSession, SessionStatusTransition
from registry.services import SessionLifecycleService, SessionLifecycleError
from tests.factories import (
    UserFactory, FacultyFactory, DepartmentFactory,
    CertificateTemplateFactory, CongregationFactory, CongregationSessionFactory,
)


class CreateSessionTests(TestCase):
    def setUp(self):
        self.user = UserFactory()
        self.template = CertificateTemplateFactory(created_by=self.user)
        self.faculty = FacultyFactory()
        self.dept = DepartmentFactory(faculty=self.faculty)
        self.congregation = CongregationFactory(created_by=self.user)
        self.service = SessionLifecycleService()

    def _kwargs(self, **over):
        base = dict(
            congregation=self.congregation,
            name='Spring 2026',
            academic_year='2025/2026',
            ceremony_start_date=self.congregation.ceremony_month,
            ceremony_end_date=self.congregation.ceremony_month,
            scope_type=CongregationSession.SCOPE_INSTITUTION,
            confirmation_deadline=timezone.make_aware(datetime.combine(self.congregation.ceremony_month - timedelta(days=7), time(23, 59))),
            certificate_template=self.template,
            created_by=self.user,
        )
        base.update(over)
        return base

    def test_institution_scope_creates_draft(self):
        s = self.service.create(**self._kwargs())
        self.assertEqual(s.status, CongregationSession.STATUS_DRAFT)
        self.assertTrue(s.slug)

    def test_faculty_scope_requires_faculty(self):
        with self.assertRaises(Exception):
            self.service.create(**self._kwargs(
                scope_type=CongregationSession.SCOPE_FACULTY,
            ))

    def test_department_scope_records_both(self):
        s = self.service.create(**self._kwargs(
            scope_type=CongregationSession.SCOPE_DEPARTMENT,
            faculty=self.faculty,
            department=self.dept,
        ))
        self.assertEqual(s.faculty, self.faculty)
        self.assertEqual(s.department, self.dept)


class TransitionTests(TestCase):
    def setUp(self):
        self.service = SessionLifecycleService()
        self.user = UserFactory()
        self.session = CongregationSessionFactory()

    def test_draft_to_published_records_timestamps_and_audit(self):
        self.service.transition(
            self.session, CongregationSession.STATUS_PUBLISHED, actor=self.user,
        )
        self.session.refresh_from_db()
        self.assertEqual(self.session.status, CongregationSession.STATUS_PUBLISHED)
        self.assertIsNotNone(self.session.published_at)
        self.assertEqual(
            SessionStatusTransition.objects.filter(session=self.session).count(), 1,
        )

    def test_cannot_skip_states(self):
        with self.assertRaises(SessionLifecycleError):
            self.service.transition(
                self.session, CongregationSession.STATUS_COMPLETED,
            )

    def test_cannot_go_backwards(self):
        self.service.transition(
            self.session, CongregationSession.STATUS_PUBLISHED, actor=self.user,
        )
        with self.assertRaises(SessionLifecycleError):
            self.service.transition(
                self.session, CongregationSession.STATUS_DRAFT, actor=self.user,
            )

    def test_archived_is_terminal(self):
        # Walk the full happy path
        for to in [
            CongregationSession.STATUS_PUBLISHED,
            CongregationSession.STATUS_CONFIRMATION_CLOSED,
            CongregationSession.STATUS_ISSUANCE_IN_PROGRESS,
            CongregationSession.STATUS_COMPLETED,
            CongregationSession.STATUS_ARCHIVED,
        ]:
            self.service.transition(self.session, to, actor=self.user)
        with self.assertRaises(SessionLifecycleError):
            self.service.transition(
                self.session, CongregationSession.STATUS_DRAFT, actor=self.user,
            )
