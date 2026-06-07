"""Services for Faculty and Department reference data."""

from registry.repositories import FacultyRepository, DepartmentRepository


class FacultyService:
    def __init__(self, repo=None):
        self.repo = repo or FacultyRepository()

    def list(self, *, active_only=False):
        return self.repo.all(active_only=active_only)

    def get(self, faculty_id):
        return self.repo.get(faculty_id)

    def create(self, *, name, code, is_active=True):
        return self.repo.create(name=name, code=code, is_active=is_active)

    def update(self, faculty_id, **fields):
        return self.repo.update(faculty_id, **fields)


class DepartmentService:
    def __init__(self, repo=None, faculty_repo=None):
        self.repo = repo or DepartmentRepository()
        self.faculty_repo = faculty_repo or FacultyRepository()

    def list(self, *, faculty_id=None, active_only=False):
        return self.repo.all(faculty_id=faculty_id, active_only=active_only)

    def get(self, department_id):
        return self.repo.get(department_id)

    def create(self, *, faculty_id, name, code, is_active=True):
        faculty = self.faculty_repo.get(faculty_id)
        if not faculty:
            raise ValueError('Faculty not found')
        return self.repo.create(
            faculty=faculty, name=name, code=code, is_active=is_active,
        )

    def update(self, department_id, **fields):
        return self.repo.update(department_id, **fields)
