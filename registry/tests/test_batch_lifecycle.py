"""Regression tests for IssuanceBatch lifecycle — especially the 3+ batch cap fix."""

from datetime import datetime, time, timedelta
from django.test import TestCase
from django.utils import timezone

from registry.models import IssuanceBatch
from registry.services import BatchLifecycleService
from tests.factories import IssuanceBatchFactory, UserFactory, CertificateTemplateFactory


def _default_deadline():
    return timezone.make_aware(
        datetime.combine(timezone.now().date() + timedelta(days=30), time(23, 59))
    )


class TestBatchCreation(TestCase):

    def setUp(self):
        self.user = UserFactory()

    def test_can_create_first_batch(self):
        tmpl = CertificateTemplateFactory()
        service = BatchLifecycleService()
        batch = service.create(
            name="First Batch",
            year=2025,
            confirmation_deadline=_default_deadline(),
            certificate_template=tmpl,
            created_by=self.user,
        )
        self.assertEqual(batch.name, "First Batch")
        self.assertEqual(batch.year, 2025)
        self.assertEqual(batch.status, IssuanceBatch.STATUS_DRAFT)

    def test_can_create_three_batches_no_cap(self):
        """Regression: previously capped at 2 sessions per congregation."""
        tmpl = CertificateTemplateFactory()
        service = BatchLifecycleService()
        for i in range(3):
            batch = service.create(
                name=f"Batch {i + 1}",
                year=2025,
                confirmation_deadline=_default_deadline(),
                certificate_template=tmpl,
                created_by=self.user,
            )
            self.assertEqual(batch.status, IssuanceBatch.STATUS_DRAFT)

        self.assertEqual(IssuanceBatch.objects.filter(year=2025).count(), 3)

    def test_can_create_ten_batches_no_cap(self):
        """No artificial ceiling on batches."""
        tmpl = CertificateTemplateFactory()
        service = BatchLifecycleService()
        for i in range(10):
            batch = service.create(
                name=f"Batch {i + 1}",
                year=2025,
                confirmation_deadline=_default_deadline(),
                certificate_template=tmpl,
                created_by=self.user,
            )
            self.assertEqual(batch.status, IssuanceBatch.STATUS_DRAFT)

        self.assertEqual(IssuanceBatch.objects.filter(year=2025).count(), 10)


class TestBatchTransitions(TestCase):

    def setUp(self):
        self.user = UserFactory()

    def test_draft_to_published(self):
        batch = IssuanceBatchFactory(
            status=IssuanceBatch.STATUS_DRAFT,
            created_by=self.user,
        )
        service = BatchLifecycleService()
        service.transition(batch, IssuanceBatch.STATUS_PUBLISHED, actor=self.user)
        batch.refresh_from_db()
        self.assertEqual(batch.status, IssuanceBatch.STATUS_PUBLISHED)

    def test_published_to_confirmation_closed(self):
        batch = IssuanceBatchFactory(
            status=IssuanceBatch.STATUS_PUBLISHED,
            created_by=self.user,
        )
        service = BatchLifecycleService()
        service.transition(
            batch, IssuanceBatch.STATUS_CONFIRMATION_CLOSED, actor=self.user
        )
        batch.refresh_from_db()
        self.assertEqual(batch.status, IssuanceBatch.STATUS_CONFIRMATION_CLOSED)

    def test_confirmation_closed_to_issuance_in_progress(self):
        batch = IssuanceBatchFactory(
            status=IssuanceBatch.STATUS_CONFIRMATION_CLOSED,
            created_by=self.user,
        )
        service = BatchLifecycleService()
        service.transition(
            batch, IssuanceBatch.STATUS_ISSUANCE_IN_PROGRESS, actor=self.user
        )
        batch.refresh_from_db()
        self.assertEqual(batch.status, IssuanceBatch.STATUS_ISSUANCE_IN_PROGRESS)

    def test_issuance_in_progress_to_completed(self):
        batch = IssuanceBatchFactory(
            status=IssuanceBatch.STATUS_ISSUANCE_IN_PROGRESS,
            created_by=self.user,
        )
        service = BatchLifecycleService()
        service.transition(batch, IssuanceBatch.STATUS_COMPLETED, actor=self.user)
        batch.refresh_from_db()
        self.assertEqual(batch.status, IssuanceBatch.STATUS_COMPLETED)

    def test_completed_to_archived(self):
        batch = IssuanceBatchFactory(
            status=IssuanceBatch.STATUS_COMPLETED,
            created_by=self.user,
        )
        service = BatchLifecycleService()
        service.transition(batch, IssuanceBatch.STATUS_ARCHIVED, actor=self.user)
        batch.refresh_from_db()
        self.assertEqual(batch.status, IssuanceBatch.STATUS_ARCHIVED)
