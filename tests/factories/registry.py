"""Factory_boy factories for the registry app."""

from datetime import date, datetime, time, timedelta

import factory
from django.utils import timezone

from registry.models import (
    Faculty, Department, IssuanceBatch, StudentRecord,
)


class FacultyFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Faculty
        django_get_or_create = ('code',)

    name = factory.Sequence(lambda n: f"Faculty of Test {n}")
    code = factory.Sequence(lambda n: f"FOT{n:03d}")
    is_active = True


class DepartmentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Department
        django_get_or_create = ('faculty', 'code')

    faculty = factory.SubFactory(FacultyFactory)
    name = factory.Sequence(lambda n: f"Department of Test {n}")
    code = factory.Sequence(lambda n: f"DEPT{n:03d}")
    is_active = True


class IssuanceBatchFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = IssuanceBatch

    name = factory.Sequence(lambda n: f"Test Batch {n}")
    year = factory.Sequence(lambda n: 2024 + n)
    status = IssuanceBatch.STATUS_DRAFT
    confirmation_deadline = factory.LazyFunction(
        lambda: timezone.make_aware(
            datetime.combine(date.today() + timedelta(days=30), time(23, 59))
        )
    )
    confirmation_deadline_original = factory.LazyAttribute(
        lambda o: o.confirmation_deadline
    )
    certificate_template = factory.SubFactory(
        'tests.factories.templates.CertificateTemplateFactory'
    )
    created_by = factory.SubFactory('tests.factories.core.UserFactory')


class StudentRecordFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = StudentRecord

    batch = factory.SubFactory(IssuanceBatchFactory)
    index_number = factory.Sequence(lambda n: f"UEW/2024/{n:04d}")
    full_name = factory.Faker('name')
    institutional_email = factory.LazyAttribute(
        lambda o: f"{o.full_name.lower().replace(' ', '.')}@uew.edu.gh"
    )
    programme = factory.Faker('job')
    class_of_degree = 'Second Class Upper'
    date_of_completion = factory.LazyFunction(date.today)
