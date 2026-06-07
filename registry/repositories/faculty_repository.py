"""Repositories for Faculty and Department reference data."""

from registry.models import Faculty, Department


class FacultyRepository:
    def all(self, active_only=False):
        qs = Faculty.objects.all()
        if active_only:
            qs = qs.filter(is_active=True)
        return qs

    def get(self, faculty_id):
        return Faculty.objects.filter(pk=faculty_id).first()

    def create(self, *, name, code, is_active=True):
        return Faculty.objects.create(name=name, code=code, is_active=is_active)

    def update(self, faculty_id, **fields):
        Faculty.objects.filter(pk=faculty_id).update(**fields)
        return self.get(faculty_id)


class DepartmentRepository:
    def all(self, faculty_id=None, active_only=False):
        qs = Department.objects.select_related('faculty')
        if faculty_id:
            qs = qs.filter(faculty_id=faculty_id)
        if active_only:
            qs = qs.filter(is_active=True)
        return qs

    def get(self, department_id):
        return Department.objects.filter(pk=department_id).select_related('faculty').first()

    def create(self, *, faculty, name, code, is_active=True):
        return Department.objects.create(
            faculty=faculty, name=name, code=code, is_active=is_active,
        )

    def update(self, department_id, **fields):
        Department.objects.filter(pk=department_id).update(**fields)
        return self.get(department_id)
