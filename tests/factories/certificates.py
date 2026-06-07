"""
Factory_boy factories for certificates app models.
"""

import factory
from django.contrib.auth.models import User
from certificates.models import Certificate


class CertificateFactory(factory.django.DjangoModelFactory):
    """Factory for Certificate model."""
    
    class Meta:
        model = Certificate
    
    student_name = factory.Faker('name')
    degree_type = 'BSC'
    honors = 'SECOND_UPPER'
    program = factory.Faker('job')
    date_awarded = factory.Faker('past_date', start_date='-365d', end_date='today')
    status = 'ISSUED'
    paper_size = 'A4'
    created_by = factory.SubFactory('tests.factories.core.UserFactory')
    
    class Params:
        with_student = factory.Trait(
            student_record=factory.SubFactory('tests.factories.registry.StudentRecordFactory'),
        )
        with_template = factory.Trait(
            template=factory.SubFactory('tests.factories.templates.CertificateTemplateFactory'),
        )
        first_class = factory.Trait(
            honors='FIRST',
        )
        masters = factory.Trait(
            degree_type='MSC',
        )
        phd = factory.Trait(
            degree_type='PHD',
        )
        revoked = factory.Trait(
            status='REVOKED',
        )
