# Factory functions for test data generation

from tests.factories.core import (
    UserFactory,
    UserProfileFactory,
    AuthorisationReferenceFactory,
    SuperAdminDeactivationRequestFactory,
)
from tests.factories.certificates import CertificateFactory
from tests.factories.templates import CertificateTemplateFactory
from tests.factories.registry import (
    FacultyFactory,
    DepartmentFactory,
    CongregationFactory,
    CongregationSessionFactory,
    StudentRecordFactory,
)
from tests.factories.builders import (
    TestCertificateBuilder,
    TestUserBuilder,
    TestTemplateBuilder,
)

__all__ = [
    'UserFactory',
    'UserProfileFactory',
    'AuthorisationReferenceFactory',
    'SuperAdminDeactivationRequestFactory',
    'CertificateFactory',
    'CertificateTemplateFactory',
    'FacultyFactory',
    'DepartmentFactory',
    'CongregationFactory',
    'CongregationSessionFactory',
    'StudentRecordFactory',
    'TestCertificateBuilder',
    'TestUserBuilder',
    'TestTemplateBuilder',
]
