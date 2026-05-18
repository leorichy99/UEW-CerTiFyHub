"""
Factory_boy factories for templates app models.
"""

import factory
from django.contrib.auth.models import User
from templates.models import CertificateTemplate


class CertificateTemplateFactory(factory.django.DjangoModelFactory):
    """Factory for CertificateTemplate model."""
    
    class Meta:
        model = CertificateTemplate
    
    name = factory.Sequence(lambda n: f"Template {n}")
    description = factory.Faker('text', max_nb_chars=200)
    canvas_width = 800
    canvas_height = 600
    metadata = {}
    is_locked = False
    status = 'draft'
    created_by = factory.SubFactory('tests.factories.core.UserFactory')
    
    class Params:
        official = factory.Trait(
            status='official',
        )
        internal = factory.Trait(
            status='internal',
        )
        locked = factory.Trait(
            is_locked=True,
        )
        with_elements = factory.Trait(
            metadata=factory.LazyFunction(
                lambda: {
                    'nodes': [
                        {
                            'attrs': {'x': 100, 'y': 100, 'text': 'Test Text'},
                            'className': 'Text',
                        }
                    ]
                }
            ),
        )
