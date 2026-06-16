"""Model-level tests for the registry app."""

from datetime import date, datetime, time, timedelta

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from registry.models import (
    Faculty, Department, IssuanceBatch, StudentRecord,
)
from tests.factories import (
    FacultyFactory, DepartmentFactory,
    IssuanceBatchFactory, StudentRecordFactory,
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


class IssuanceBatchModelTests(TestCase):
    def setUp(self):
        self.user = UserFactory()
        self.template = CertificateTemplateFactory(created_by=self.user)

    def _build(self, **overrides):
        kwargs = dict(
            name='Test Batch',
            year=2024,
            confirmation_deadline=timezone.make_aware(
                datetime.combine(date.today() + timedelta(days=7), time(23, 59))
            ),
            certificate_template=self.template,
            created_by=self.user,
        )
        kwargs.update(overrides)
        return IssuanceBatch(**kwargs)

    def test_default_status_is_draft(self):
        b = self._build()
        b.save()
        self.assertEqual(b.status, IssuanceBatch.STATUS_DRAFT)

    def test_year_auto_populated_from_deadline(self):
        b = self._build(year=None)
        b.save()
        self.assertEqual(b.year, b.confirmation_deadline.year)

    def test_str_includes_name_and_status(self):
        b = self._build()
        b.save()
        self.assertIn('Test Batch', str(b))


class StudentRecordTests(TestCase):
    def test_unique_index_per_batch(self):
        batch = IssuanceBatchFactory()
        StudentRecordFactory(batch=batch, index_number='UEW/2024/0001')
        with self.assertRaises(Exception):
            StudentRecordFactory(batch=batch, index_number='UEW/2024/0001')

    def test_same_index_allowed_in_different_batches(self):
        b1 = IssuanceBatchFactory()
        b2 = IssuanceBatchFactory()
        StudentRecordFactory(batch=b1, index_number='UEW/2024/0001')
        StudentRecordFactory(batch=b2, index_number='UEW/2024/0001')
        self.assertEqual(StudentRecord.objects.count(), 2)

    def test_default_statuses(self):
        r = StudentRecordFactory()
        self.assertEqual(r.confirmation_status, StudentRecord.CONF_PENDING)
        self.assertEqual(r.issuance_status, StudentRecord.ISSUE_NOT_ISSUED)
