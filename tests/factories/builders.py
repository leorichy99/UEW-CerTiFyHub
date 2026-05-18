"""
Builder pattern for dynamic test data generation.
Useful for complex scenarios that need flexible configuration.
"""

from datetime import date, timedelta
from tests.factories.core import UserFactory, UserProfileFactory
from tests.factories.certificates import CertificateFactory
from tests.factories.students import StudentFactory
from tests.factories.templates import CertificateTemplateFactory


class TestCertificateBuilder:
    """Builder for creating Certificate instances with flexible configuration."""
    
    def __init__(self):
        self._student_name = None
        self._degree_type = None
        self._honors = None
        self._program = None
        self._date_awarded = None
        self._student = None
        self._template = None
        self._status = 'ISSUED'
        self._created_by = None
    
    def with_student_name(self, name):
        """Set student name."""
        self._student_name = name
        return self
    
    def with_degree(self, degree):
        """Set degree type (BSC, MSC, PHD, etc.)."""
        self._degree_type = degree
        return self
    
    def with_honors(self, honors):
        """Set honors (FIRST, SECOND_UPPER, etc.)."""
        self._honors = honors
        return self
    
    def with_program(self, program):
        """Set program name."""
        self._program = program
        return self
    
    def with_date_awarded(self, date):
        """Set date awarded."""
        self._date_awarded = date
        return self
    
    def with_student(self, student):
        """Set student instance."""
        self._student = student
        return self
    
    def with_template(self, template):
        """Set template instance."""
        self._template = template
        return self
    
    def with_status(self, status):
        """Set status (ISSUED, REVOKED)."""
        self._status = status
        return self
    
    def with_created_by(self, user):
        """Set creator user."""
        self._created_by = user
        return self
    
    def build(self):
        """Build the Certificate instance."""
        kwargs = {}
        if self._student_name:
            kwargs['student_name'] = self._student_name
        if self._degree_type:
            kwargs['degree_type'] = self._degree_type
        if self._honors:
            kwargs['honors'] = self._honors
        if self._program:
            kwargs['program'] = self._program
        if self._date_awarded:
            kwargs['date_awarded'] = self._date_awarded
        if self._student:
            kwargs['student'] = self._student
        if self._template:
            kwargs['template'] = self._template
        if self._status:
            kwargs['status'] = self._status
        if self._created_by:
            kwargs['created_by'] = self._created_by
        
        return CertificateFactory(**kwargs)


class TestUserBuilder:
    """Builder for creating User instances with flexible configuration."""
    
    def __init__(self):
        self._username = None
        self._email = None
        self._first_name = None
        self._last_name = None
        self._role = 'ADMIN'
        self._is_superuser = False
        self._is_active = True
    
    def with_username(self, username):
        """Set username."""
        self._username = username
        return self
    
    def with_email(self, email):
        """Set email."""
        self._email = email
        return self
    
    def with_name(self, first_name, last_name):
        """Set first and last name."""
        self._first_name = first_name
        self._last_name = last_name
        return self
    
    def with_role(self, role):
        """Set role (SUPER_ADMIN, ADMIN, STUDENT, EMPLOYER)."""
        self._role = role
        if role == 'SUPER_ADMIN':
            self._is_superuser = True
        return self
    
    def as_superuser(self):
        """Set as superuser."""
        self._role = 'SUPER_ADMIN'
        self._is_superuser = True
        return self
    
    def as_inactive(self):
        """Set as inactive."""
        self._is_active = False
        return self
    
    def build(self):
        """Build the User instance with UserProfile."""
        user_kwargs = {}
        if self._username:
            user_kwargs['username'] = self._username
        if self._email:
            user_kwargs['email'] = self._email
        if self._first_name:
            user_kwargs['first_name'] = self._first_name
        if self._last_name:
            user_kwargs['last_name'] = self._last_name
        if self._is_superuser:
            user_kwargs['is_superuser'] = True
        if not self._is_active:
            user_kwargs['is_active'] = False
        
        user = UserFactory(**user_kwargs)
        UserProfileFactory(user=user, role=self._role)
        return user


class TestTemplateBuilder:
    """Builder for creating CertificateTemplate instances with flexible configuration."""
    
    def __init__(self):
        self._name = None
        self._description = None
        self._canvas_width = 800
        self._canvas_height = 600
        self._metadata = None
        self._is_locked = False
        self._status = 'draft'
        self._created_by = None
    
    def with_name(self, name):
        """Set template name."""
        self._name = name
        return self
    
    def with_description(self, description):
        """Set description."""
        self._description = description
        return self
    
    def with_dimensions(self, width, height):
        """Set canvas dimensions."""
        self._canvas_width = width
        self._canvas_height = height
        return self
    
    def with_metadata(self, metadata):
        """Set metadata (Konva JSON state)."""
        self._metadata = metadata
        return self
    
    def with_elements(self, elements):
        """Add elements to metadata."""
        if self._metadata is None:
            self._metadata = {}
        if 'nodes' not in self._metadata:
            self._metadata['nodes'] = []
        self._metadata['nodes'].extend(elements)
        return self
    
    def as_locked(self):
        """Set as locked."""
        self._is_locked = True
        return self
    
    def as_official(self):
        """Set as official status."""
        self._status = 'official'
        return self
    
    def with_created_by(self, user):
        """Set creator."""
        self._created_by = user
        return self
    
    def build(self):
        """Build the CertificateTemplate instance."""
        kwargs = {}
        if self._name:
            kwargs['name'] = self._name
        if self._description:
            kwargs['description'] = self._description
        if self._canvas_width:
            kwargs['canvas_width'] = self._canvas_width
        if self._canvas_height:
            kwargs['canvas_height'] = self._canvas_height
        if self._metadata:
            kwargs['metadata'] = self._metadata
        if self._is_locked:
            kwargs['is_locked'] = self._is_locked
        if self._status:
            kwargs['status'] = self._status
        if self._created_by:
            kwargs['created_by'] = self._created_by
        
        return CertificateTemplateFactory(**kwargs)
