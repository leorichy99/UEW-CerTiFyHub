"""
Factory_boy factories for students app models.
"""

import factory
from students.models import Student


class StudentFactory(factory.django.DjangoModelFactory):
    """Factory for Student model."""
    
    class Meta:
        model = Student
    
    student_id = factory.Sequence(lambda n: f"STU{n:06d}")
    full_name = factory.Faker('name')
    email = factory.LazyAttribute(lambda obj: f"{obj.full_name.replace(' ', '.').lower()}@uew.edu.gh")
    program = factory.Faker('job')
    graduation_date = factory.Faker('past_date', start_date='-365d', end_date='today')
    degree_type = 'BSC'
    honors = 'PASS'
    cohort = factory.Sequence(lambda n: f"202{n}")
    
    class Params:
        first_class = factory.Trait(
            honors='FIRST',
        )
        masters = factory.Trait(
            degree_type='MSC',
        )
        phd = factory.Trait(
            degree_type='PHD',
        )
