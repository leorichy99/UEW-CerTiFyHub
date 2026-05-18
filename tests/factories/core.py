"""
Factory_boy factories for core app models.
"""

import factory
from django.contrib.auth.models import User
from core.models import UserProfile, AuthorisationReference, SuperAdminDeactivationRequest


class UserFactory(factory.django.DjangoModelFactory):
    """Factory for Django User model."""
    
    class Meta:
        model = User
    
    username = factory.Sequence(lambda n: f"user_{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@example.com")
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    is_active = True


class UserProfileFactory(factory.django.DjangoModelFactory):
    """Factory for UserProfile model."""
    
    class Meta:
        model = UserProfile
    
    user = factory.SubFactory(UserFactory)
    role = 'ADMIN'
    phone_number = factory.Faker('phone_number')
    organization = factory.Faker('company')
    staff_id = factory.Sequence(lambda n: f"STAFF{n:04d}")
    department = factory.Faker('job')
    account_type = 'STAFF'
    access_duration = 'permanent'
    access_end_date = None
    credential_status = 'none'
    is_legacy = False
    first_login_completed = False
    
    class Params:
        super_admin = factory.Trait(
            role='SUPER_ADMIN',
            user__is_superuser=True,
        )
        student = factory.Trait(
            role='STUDENT',
            account_type='EXTERNAL_COLLABORATOR',
        )
        employer = factory.Trait(
            role='EMPLOYER',
            organization='Test Company',
        )
        time_limited = factory.Trait(
            access_duration='time_limited',
            access_end_date=factory.LazyFunction(
                lambda: factory.Faker('future_date', end_date='+30d').generate()
            ),
        )


class AuthorisationReferenceFactory(factory.django.DjangoModelFactory):
    """Factory for AuthorisationReference model."""
    
    class Meta:
        model = AuthorisationReference
    
    reference_number = factory.Sequence(lambda n: f"CERT-2025-AB{n:04d}")
    requester_name = factory.Faker('name')
    requester_staff_id = factory.Sequence(lambda n: f"STAFF{n:04d}")
    authorising_head_name = factory.Faker('name')
    authorising_head_title = factory.Faker('job')
    authorising_head_department = factory.Faker('job')
    approval_date = factory.Faker('past_date', start_date='-365d', end_date='today')
    purpose = 'provision'
    status = 'pending'
    linked_account = None
    logged_by = factory.SubFactory(UserFactory)
    notes = factory.Faker('text', max_nb_chars=200)
    
    class Params:
        used = factory.Trait(
            status='used',
            linked_account=factory.SubFactory(UserFactory),
        )
        cancelled = factory.Trait(
            status='cancelled',
        )
        permission_change = factory.Trait(
            purpose='permission_change',
        )


class SuperAdminDeactivationRequestFactory(factory.django.DjangoModelFactory):
    """Factory for SuperAdminDeactivationRequest model."""
    
    class Meta:
        model = SuperAdminDeactivationRequest
    
    target_account = factory.SubFactory(UserFactory, profile__role='SUPER_ADMIN')
    initiated_by = factory.SubFactory(UserFactory, profile__role='SUPER_ADMIN')
    confirmed_by = None
    status = 'pending'
    reason = factory.Faker('text', max_nb_chars=500)
    confirmation_token_hash = factory.Faker('sha256')
    confirmation_token_expires_at = factory.LazyFunction(
        lambda: factory.Faker('future_date', end_date='+24h').generate()
    )
    
    class Params:
        confirmed = factory.Trait(
            status='confirmed',
            confirmed_by=factory.SubFactory(UserFactory, profile__role='SUPER_ADMIN'),
        )
        rejected = factory.Trait(
            status='rejected',
        )
        expired = factory.Trait(
            status='expired',
            confirmation_token_expires_at=factory.LazyFunction(
                lambda: factory.Faker('past_date', start_date='-2d').generate()
            ),
        )
