"""Factory_boy factories for the registry app."""

from datetime import date, datetime, time, timedelta

import factory
from django.utils import timezone

from registry.models import (
    Faculty, Department, Congregation, CongregationSession, StudentRecord,
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


class CongregationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Congregation
        django_get_or_create = ('year',)

    name = factory.Sequence(lambda n: f"Test Congregation {n}")
    # Sequence offset keeps each factory call in its own year. Tests that need
    # multiple sessions in one congregation should pass `congregation=...`
    # explicitly when calling CongregationSessionFactory.
    year = factory.Sequence(lambda n: 2024 + n)
    ceremony_month = factory.LazyFunction(
        lambda: (date.today() + timedelta(days=30)).replace(day=1)
    )
    description = ''
    created_by = factory.SubFactory('tests.factories.core.UserFactory')


class CongregationSessionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = CongregationSession

    congregation = factory.SubFactory(CongregationFactory)
    session_number = 1
    name = factory.Sequence(lambda n: f"Test Session {n}")
    academic_year = '2024/2025'
    ceremony_start_date = factory.LazyAttribute(lambda o: o.congregation.ceremony_month)
    ceremony_end_date = factory.LazyAttribute(lambda o: o.congregation.ceremony_month)
    scope_type = CongregationSession.SCOPE_INSTITUTION
    confirmation_deadline = factory.LazyAttribute(
        lambda o: timezone.make_aware(
            datetime.combine(o.ceremony_start_date - timedelta(days=7), time(23, 59))
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

    session = factory.SubFactory(CongregationSessionFactory)
    index_number = factory.Sequence(lambda n: f"UEW/2024/{n:04d}")
    full_name = factory.Faker('name')
    institutional_email = factory.LazyAttribute(
        lambda o: f"{o.full_name.lower().replace(' ', '.')}@uew.edu.gh"
    )
    programme = factory.Faker('job')
    class_of_degree = 'Second Class Upper'
    date_of_completion = factory.LazyFunction(date.today)
