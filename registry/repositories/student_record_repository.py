"""Repository for StudentRecord."""

from django.db.models import Q

from registry.models import StudentRecord


class StudentRecordRepository:
    def for_session(self, session_id, *, confirmation_status=None,
                    issuance_status=None, faculty_id=None, department_id=None,
                    search=None):
        qs = StudentRecord.objects.filter(session_id=session_id).select_related(
            'faculty', 'department', 'import_batch'
        )
        if confirmation_status:
            qs = qs.filter(confirmation_status=confirmation_status)
        if issuance_status:
            qs = qs.filter(issuance_status=issuance_status)
        if faculty_id:
            qs = qs.filter(faculty_id=faculty_id)
        if department_id:
            qs = qs.filter(department_id=department_id)
        if search:
            qs = qs.filter(
                Q(index_number__icontains=search) |
                Q(full_name__icontains=search) |
                Q(institutional_email__icontains=search)
            )
        return qs

    def get(self, record_id):
        return StudentRecord.objects.filter(pk=record_id).select_related(
            'session', 'faculty', 'department'
        ).first()

    def get_by_session_index(self, session_id, index_number):
        return StudentRecord.objects.filter(
            session_id=session_id, index_number=index_number,
        ).first()

    def create(self, **fields):
        return StudentRecord.objects.create(**fields)

    def update(self, record_id, **fields):
        StudentRecord.objects.filter(pk=record_id).update(**fields)
        return self.get(record_id)

    def delete(self, record_id):
        StudentRecord.objects.filter(pk=record_id).delete()

    def disputed_for_session(self, session_id):
        return self.for_session(session_id, confirmation_status=StudentRecord.CONF_DISPUTED)

    def eligible_for_issuance(self, session_id):
        return StudentRecord.objects.filter(
            session_id=session_id,
            confirmation_status=StudentRecord.CONF_CONFIRMED,
            issuance_status=StudentRecord.ISSUE_NOT_ISSUED,
        )
