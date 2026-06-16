"""Tests for the synchronous student-record import pipeline."""

from datetime import date

from django.test import TestCase

from registry.models import (
    IssuanceBatch, ImportBatch, StudentRecord,
)
from registry.services import ImportService, ImportRejected
from tests.factories import (
    UserFactory, IssuanceBatchFactory, FacultyFactory, DepartmentFactory,
)


def _csv(*lines):
    return ('\r\n'.join(lines)).encode('utf-8')


HEADERS = (
    'index_number,full_name,institutional_email,programme,'
    'class_of_degree,date_of_completion,faculty_code,department_code'
)


class ImportServiceTests(TestCase):
    def setUp(self):
        self.user = UserFactory()
        self.service = ImportService()

    def test_rejects_non_draft_batch(self):
        batch = IssuanceBatchFactory()
        batch.status = IssuanceBatch.STATUS_PUBLISHED
        batch.save(update_fields=['status'])
        raw = _csv(HEADERS, 'UEW001,John Doe,j@uew.edu.gh,BSc CS,First,2025-06-01,,')
        with self.assertRaises(ImportRejected):
            self.service.process_upload(
                batch=batch, uploaded_by=self.user,
                file_name='records.csv', raw_bytes=raw,
            )

    def test_missing_headers_rejected(self):
        batch = IssuanceBatchFactory()
        raw = _csv('full_name,email', 'John,j@uew.edu.gh')
        with self.assertRaises(ImportRejected):
            self.service.process_upload(
                batch=batch, uploaded_by=self.user,
                file_name='r.csv', raw_bytes=raw,
            )

    def test_happy_path_creates_records_and_batch(self):
        batch = IssuanceBatchFactory()
        raw = _csv(
            HEADERS,
            'UEW001,Jane Doe,jane@uew.edu.gh,BSc CS,First Class,2025-06-01,,',
            'UEW002,John Roe,john@uew.edu.gh,BSc CS,Second Class Upper,2025-06-01,,',
        )
        import_batch = self.service.process_upload(
            batch=batch, uploaded_by=self.user,
            file_name='records.csv', raw_bytes=raw,
        )
        self.assertEqual(import_batch.total_rows, 2)
        self.assertEqual(import_batch.success_count, 2)
        self.assertEqual(import_batch.error_count, 0)
        self.assertEqual(import_batch.status, ImportBatch.STATUS_COMPLETED)
        self.assertEqual(StudentRecord.objects.filter(batch=batch).count(), 2)

    def test_duplicate_indices_inside_file_are_flagged(self):
        batch = IssuanceBatchFactory()
        raw = _csv(
            HEADERS,
            'UEW001,Jane Doe,jane@uew.edu.gh,BSc CS,First,2025-06-01,,',
            'UEW001,John Roe,john@uew.edu.gh,BSc CS,First,2025-06-01,,',
        )
        import_batch = self.service.process_upload(
            batch=batch, uploaded_by=self.user,
            file_name='records.csv', raw_bytes=raw,
        )
        self.assertEqual(import_batch.success_count, 1)
        self.assertEqual(import_batch.error_count, 1)
        self.assertEqual(import_batch.status, ImportBatch.STATUS_COMPLETED_WITH_ERRORS)

    def test_duplicate_against_existing_record(self):
        batch = IssuanceBatchFactory()
        StudentRecord.objects.create(
            batch=batch, index_number='UEW001', full_name='Existing',
            institutional_email='e@uew.edu.gh', programme='X',
            class_of_degree='First', date_of_completion=date(2025, 6, 1),
        )
        raw = _csv(
            HEADERS,
            'UEW001,Jane Doe,jane@uew.edu.gh,BSc CS,First,2025-06-01,,',
        )
        import_batch = self.service.process_upload(
            batch=batch, uploaded_by=self.user,
            file_name='records.csv', raw_bytes=raw,
        )
        self.assertEqual(import_batch.success_count, 0)
        self.assertEqual(import_batch.skipped_count, 1)
        self.assertEqual(import_batch.error_count, 1)

    def test_invalid_email_is_per_row_error(self):
        batch = IssuanceBatchFactory()
        raw = _csv(
            HEADERS,
            'UEW001,Jane Doe,not-an-email,BSc CS,First,2025-06-01,,',
            'UEW002,Ok Person,ok@uew.edu.gh,BSc CS,First,2025-06-01,,',
        )
        import_batch = self.service.process_upload(
            batch=batch, uploaded_by=self.user,
            file_name='records.csv', raw_bytes=raw,
        )
        self.assertEqual(import_batch.success_count, 1)
        self.assertEqual(import_batch.error_count, 1)
        rows = [e['row'] for e in import_batch.error_log]
        self.assertIn(2, rows)

    def test_unknown_faculty_code_per_row_error(self):
        batch = IssuanceBatchFactory()
        raw = _csv(
            HEADERS,
            'UEW001,Jane,j@uew.edu.gh,BSc,First,2025-06-01,NOPE,',
        )
        import_batch = self.service.process_upload(
            batch=batch, uploaded_by=self.user,
            file_name='records.csv', raw_bytes=raw,
        )
        self.assertEqual(import_batch.error_count, 1)
        self.assertEqual(import_batch.success_count, 0)
