"""Tests for filtered issuance via IssuanceRun."""

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from registry.models import (
    IssuanceBatch, IssuanceRun, StudentRecord,
)
from registry.services import (
    IssuanceRunService, IssuanceError,
    BatchLifecycleService, IssuanceService,
)
from registry.services.issuance_filters import (
    FilterValidationError, validate_filter_criteria, apply_batch_filters,
    issuable_records_for_batch,
)
from tests.factories import (
    UserFactory, FacultyFactory, DepartmentFactory,
    IssuanceBatchFactory, StudentRecordFactory,
)


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")


def _set_role(user, role):
    user.profile.role = role
    user.profile.save(update_fields=['role'])


def _ready_for_issuance(batch, *, actor, n=3, faculty=None, department=None,
                        index_prefix='UEW', class_of_degree='First Class'):
    """Drive a fresh batch to CONFIRMATION_CLOSED with N confirmed records."""
    records = [
        StudentRecordFactory(
            batch=batch,
            index_number=f'{index_prefix}/2024/{i:04d}',
            faculty=faculty, department=department,
            class_of_degree=class_of_degree,
        )
        for i in range(n)
    ]
    lifecycle = BatchLifecycleService()
    lifecycle.transition(batch, IssuanceBatch.STATUS_PUBLISHED, actor=actor)
    # Mark all CONFIRMED so close_confirmation doesn't flag them.
    StudentRecord.objects.filter(batch=batch).update(
        confirmation_status=StudentRecord.CONF_CONFIRMED,
    )
    IssuanceService().close_confirmation(batch, actor=actor)
    batch.refresh_from_db()
    return records


# -----------------------------------------------------------------------------
#  Filter validation + application
# -----------------------------------------------------------------------------

class FilterValidationTests(TestCase):
    def test_empty_dict_is_valid(self):
        self.assertEqual(validate_filter_criteria({}), {})
        self.assertEqual(validate_filter_criteria(None), {})

    def test_rejects_unknown_keys(self):
        with self.assertRaises(FilterValidationError):
            validate_filter_criteria({'bogus': 1})

    def test_rejects_non_list_for_list_fields(self):
        with self.assertRaises(FilterValidationError):
            validate_filter_criteria({'faculty_ids': 'one'})

    def test_strips_whitespace(self):
        out = validate_filter_criteria({'index_number_prefix': '  UEW/2024  '})
        self.assertEqual(out['index_number_prefix'], 'UEW/2024')

    def test_retry_failed_must_be_bool(self):
        with self.assertRaises(FilterValidationError):
            validate_filter_criteria({'retry_failed': 'yes'})


class FilterApplicationTests(TestCase):
    def setUp(self):
        self.user = UserFactory()
        self.batch = IssuanceBatchFactory()
        self.fac1 = FacultyFactory()
        self.fac2 = FacultyFactory()
        self.dep1 = DepartmentFactory(faculty=self.fac1)
        self.r1 = StudentRecordFactory(
            batch=self.batch, faculty=self.fac1, department=self.dep1,
            index_number='UEW/CS/0001', class_of_degree='First Class',
        )
        self.r2 = StudentRecordFactory(
            batch=self.batch, faculty=self.fac1, department=self.dep1,
            index_number='UEW/CS/0002', class_of_degree='Second Class Upper',
        )
        self.r3 = StudentRecordFactory(
            batch=self.batch, faculty=self.fac2,
            index_number='AAA/0001', class_of_degree='Pass',
        )

    def test_filter_by_faculty(self):
        qs = StudentRecord.objects.filter(batch=self.batch)
        filtered = apply_batch_filters(qs, {'faculty_ids': [str(self.fac1.id)]})
        self.assertEqual(set(filtered.values_list('id', flat=True)), {self.r1.id, self.r2.id})

    def test_filter_by_index_prefix(self):
        qs = StudentRecord.objects.filter(batch=self.batch)
        filtered = apply_batch_filters(qs, {'index_number_prefix': 'UEW/CS'})
        self.assertEqual(set(filtered.values_list('id', flat=True)), {self.r1.id, self.r2.id})

    def test_filter_by_honors(self):
        qs = StudentRecord.objects.filter(batch=self.batch)
        filtered = apply_batch_filters(qs, {'honors': ['FIRST']})
        self.assertEqual(set(filtered.values_list('id', flat=True)), {self.r1.id})

    def test_issuable_records_excludes_pending_and_issued(self):
        # By default the helper only includes CONFIRMED + NOT_ISSUED/QUEUED records.
        StudentRecord.objects.filter(pk=self.r1.pk).update(
            confirmation_status=StudentRecord.CONF_CONFIRMED,
            issuance_status=StudentRecord.ISSUE_NOT_ISSUED,
        )
        StudentRecord.objects.filter(pk=self.r2.pk).update(
            confirmation_status=StudentRecord.CONF_CONFIRMED,
            issuance_status=StudentRecord.ISSUE_ISSUED,
        )
        # r3 left as CONF_PENDING.
        qs = issuable_records_for_batch(self.batch, {})
        self.assertEqual(set(qs.values_list('id', flat=True)), {self.r1.id})


# -----------------------------------------------------------------------------
#  Service layer
# -----------------------------------------------------------------------------

class IssuanceRunServiceTests(TestCase):
    def setUp(self):
        self.user = UserFactory()
        self.batch = IssuanceBatchFactory()
        self.service = IssuanceRunService()

    def test_rejects_batch_not_in_batchable_state(self):
        # Batch is still DRAFT.
        with self.assertRaises(IssuanceError):
            self.service.create(
                batch=self.batch,
                requested_by=self.user,
                filter_criteria={},
            )

    def test_rejects_empty_target_set(self):
        # Move to CONFIRMATION_CLOSED but with no confirmed records.
        BatchLifecycleService().transition(
            self.batch, IssuanceBatch.STATUS_PUBLISHED, actor=self.user,
        )
        IssuanceService().close_confirmation(self.batch, actor=self.user)
        self.batch.refresh_from_db()
        with self.assertRaises(IssuanceError):
            self.service.create(
                batch=self.batch, requested_by=self.user,
                filter_criteria={},
            )

    def test_first_run_transitions_to_in_progress(self):
        _ready_for_issuance(self.batch, actor=self.user, n=2)
        run, result = self.service.create_and_run(
            batch=self.batch, requested_by=self.user,
            filter_criteria={},
        )
        self.batch.refresh_from_db()
        self.assertEqual(
            self.batch.status, IssuanceBatch.STATUS_ISSUANCE_IN_PROGRESS,
        )
        self.assertEqual(run.total_targeted, 2)
        self.assertEqual(result['succeeded'] + result['failed'], 2)
        self.assertIn(run.status, {
            IssuanceRun.STATUS_COMPLETED,
            IssuanceRun.STATUS_PARTIAL,
            IssuanceRun.STATUS_FAILED,
        })

    def test_subsequent_run_does_not_re_transition(self):
        _ready_for_issuance(self.batch, actor=self.user, n=2)
        # First run -- empty filter, issues both.
        self.service.create_and_run(
            batch=self.batch, requested_by=self.user, filter_criteria={},
        )
        # Add another confirmed record by hand.
        new_record = StudentRecordFactory(
            batch=self.batch,
            confirmation_status=StudentRecord.CONF_CONFIRMED,
        )
        # Second run should pick up exactly that one record.
        run2, result2 = self.service.create_and_run(
            batch=self.batch, requested_by=self.user,
            filter_criteria={'record_ids': [str(new_record.id)]},
        )
        self.assertEqual(run2.total_targeted, 1)
        self.batch.refresh_from_db()
        self.assertEqual(
            self.batch.status, IssuanceBatch.STATUS_ISSUANCE_IN_PROGRESS,
        )

    def test_filter_limits_target_set(self):
        fac = FacultyFactory()
        records_a = _ready_for_issuance(self.batch, actor=self.user, n=2,
                                        faculty=fac, index_prefix='AAA')
        records_b = [
            StudentRecordFactory(batch=self.batch, index_number=f'BBB/{i}',
                                 confirmation_status=StudentRecord.CONF_CONFIRMED)
            for i in range(2)
        ]
        run, result = self.service.create_and_run(
            batch=self.batch, requested_by=self.user,
            filter_criteria={'faculty_ids': [str(fac.id)]},
        )
        self.assertEqual(run.total_targeted, 2)
        # Records B remain not issued.
        for r in records_b:
            r.refresh_from_db()
            self.assertEqual(r.issuance_status, StudentRecord.ISSUE_NOT_ISSUED)

    def test_last_issuance_run_is_stamped(self):
        _ready_for_issuance(self.batch, actor=self.user, n=1)
        run, _ = self.service.create_and_run(
            batch=self.batch, requested_by=self.user, filter_criteria={},
        )
        record = StudentRecord.objects.get(batch=self.batch)
        self.assertEqual(record.last_issuance_run_id, run.id)

    def test_retry_failed_includes_previously_failed_records(self):
        _ready_for_issuance(self.batch, actor=self.user, n=1)
        record = StudentRecord.objects.get(batch=self.batch)
        # First run -- issue everything. Then artificially flip to FAILED.
        self.service.create_and_run(
            batch=self.batch, requested_by=self.user, filter_criteria={},
        )
        StudentRecord.objects.filter(pk=record.pk).update(
            issuance_status=StudentRecord.ISSUE_FAILED,
        )
        # Without retry_failed, no records match -> IssuanceError.
        with self.assertRaises(IssuanceError):
            self.service.create(
                batch=self.batch, requested_by=self.user,
                filter_criteria={},
            )
        # With retry_failed it picks the failed record up.
        run, _ = self.service.create_and_run(
            batch=self.batch, requested_by=self.user,
            filter_criteria={'retry_failed': True},
        )
        self.assertEqual(run.total_targeted, 1)


# -----------------------------------------------------------------------------
#  Backwards compatibility -- legacy start_issuance still works
# -----------------------------------------------------------------------------

class LegacyStartIssuanceTests(TestCase):
    def test_start_issuance_creates_a_run(self):
        user = UserFactory()
        batch = IssuanceBatchFactory()
        _ready_for_issuance(batch, actor=user, n=2)
        result = IssuanceService().start_issuance(batch, actor=user)
        self.assertIn('run_id', result)
        self.assertEqual(IssuanceRun.objects.filter(batch=batch).count(), 1)


# -----------------------------------------------------------------------------
#  API
# -----------------------------------------------------------------------------

class IssuanceRunApiTests(APITestCase):
    def setUp(self):
        self.super_admin = UserFactory(is_superuser=True)
        _set_role(self.super_admin, 'SUPER_ADMIN')
        _auth(self.client, self.super_admin)
        self.batch = IssuanceBatchFactory()
        _ready_for_issuance(self.batch, actor=self.super_admin, n=2)

    def test_create_run_via_post(self):
        resp = self.client.post(
            f'/api/registry/batches/{self.batch.id}/issuance-runs/',
            {'filter_criteria': {}, 'notes': 'Initial run'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
        self.assertEqual(resp.data['total_targeted'], 2)
        self.assertEqual(resp.data['notes'], 'Initial run')
        self.assertIn('execution', resp.data)

    def test_create_run_rejects_unknown_filter_keys(self):
        resp = self.client.post(
            f'/api/registry/batches/{self.batch.id}/issuance-runs/',
            {'filter_criteria': {'bogus_key': []}},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_runs(self):
        self.client.post(
            f'/api/registry/batches/{self.batch.id}/issuance-runs/',
            {'filter_criteria': {}}, format='json',
        )
        resp = self.client.get(
            f'/api/registry/batches/{self.batch.id}/issuance-runs/',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        rows = resp.data['results'] if 'results' in resp.data else resp.data
        self.assertEqual(len(rows), 1)

    def test_admin_alias_mount(self):
        resp = self.client.post(
            f'/api/admin/batches/{self.batch.id}/issuance-runs/',
            {'filter_criteria': {}}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
