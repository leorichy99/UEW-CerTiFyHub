"""Model-level tests for the registry app."""

from datetime import date, datetime, time, timedelta

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from registry.models import (
    Faculty, Department, CongregationSession, StudentRecord,
)
from tests.factories import (
    FacultyFactory, DepartmentFactory,
    CongregationFactory, CongregationSessionFactory, StudentRecordFactory,
    UserFactory, CertificateTemplateFactory,
)


class FacultyDepartmentTests(TestCase):
    def test_unique_faculty_code(self):
        Faculty.objects.create(name='Science', code='SCI')
        with self.assertRaises(Exception):
            Faculty.objects.create(name='Science Two', code='SCI')

    def test_department_unique_per_faculty(self):
        f = FacultyFactory()
        Department.objects.create(faculty=f, name='Biology', code='BIO')
        with self.assertRaises(Exception):
            Department.objects.create(faculty=f, name='Biology', code='BIO2')


class CongregationSessionScopeValidationTests(TestCase):
    def setUp(self):
        self.user = UserFactory()
        self.template = CertificateTemplateFactory(created_by=self.user)
        self.faculty = FacultyFactory()
        self.department = DepartmentFactory(faculty=self.faculty)
        self.other_faculty = FacultyFactory()
        self.congregation = CongregationFactory(created_by=self.user)

    def _build(self, **overrides):
        # Each call to _build allocates a fresh session_number to avoid
        # tripping the unique_together(congregation, session_number).
        next_number = CongregationSession.objects.filter(
            congregation=self.congregation,
        ).count() + 1
        kwargs = dict(
            congregation=self.congregation,
            session_number=next_number,
            name=f'Test Session {next_number}',
            academic_year='2024/2025',
            ceremony_start_date=self.congregation.ceremony_month,
            ceremony_end_date=self.congregation.ceremony_month,
            scope_type=CongregationSession.SCOPE_INSTITUTION,
            confirmation_deadline=timezone.make_aware(datetime.combine(self.congregation.ceremony_month - timedelta(days=7), time(23, 59))),
            certificate_template=self.template,
            created_by=self.user,
        )
        kwargs.update(overrides)
        return CongregationSession(**kwargs)

    def test_institution_scope_rejects_faculty(self):
        s = self._build(faculty=self.faculty)
        with self.assertRaises(ValidationError):
            s.full_clean()

    def test_faculty_scope_requires_faculty(self):
        s = self._build(scope_type=CongregationSession.SCOPE_FACULTY)
        with self.assertRaises(ValidationError):
            s.full_clean()

    def test_faculty_scope_rejects_department(self):
        s = self._build(
            scope_type=CongregationSession.SCOPE_FACULTY,
            faculty=self.faculty,
            department=self.department,
        )
        with self.assertRaises(ValidationError):
            s.full_clean()

    def test_department_scope_requires_faculty_match(self):
        s = self._build(
            scope_type=CongregationSession.SCOPE_DEPARTMENT,
            faculty=self.other_faculty,
            department=self.department,
        )
        with self.assertRaises(ValidationError):
            s.full_clean()

    def test_department_scope_valid(self):
        s = self._build(
            scope_type=CongregationSession.SCOPE_DEPARTMENT,
            faculty=self.faculty,
            department=self.department,
        )
        s.full_clean()  # no raise

    def test_slug_auto_generated(self):
        s = self._build()
        s.save()
        self.assertTrue(s.slug)
        self.assertIn('test-session', s.slug)

    def test_slug_unique(self):
        s1 = self._build()
        s1.save()
        s2 = self._build()
        s2.save()
        self.assertNotEqual(s1.slug, s2.slug)

    def test_default_status_is_draft(self):
        s = self._build()
        s.save()
        self.assertEqual(s.status, CongregationSession.STATUS_DRAFT)


class StudentRecordTests(TestCase):
    def test_unique_index_per_session(self):
        session = CongregationSessionFactory()
        StudentRecordFactory(session=session, index_number='UEW/2024/0001')
        with self.assertRaises(Exception):
            StudentRecordFactory(session=session, index_number='UEW/2024/0001')

    def test_same_index_allowed_in_different_sessions(self):
        s1 = CongregationSessionFactory()
        s2 = CongregationSessionFactory()
        StudentRecordFactory(session=s1, index_number='UEW/2024/0001')
        StudentRecordFactory(session=s2, index_number='UEW/2024/0001')
        self.assertEqual(StudentRecord.objects.count(), 2)

    def test_default_statuses(self):
        r = StudentRecordFactory()
        self.assertEqual(r.confirmation_status, StudentRecord.CONF_PENDING)
        self.assertEqual(r.issuance_status, StudentRecord.ISSUE_NOT_ISSUED)
