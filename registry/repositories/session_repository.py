"""Repository for CongregationSession."""

from django.db.models import Q

from registry.models import CongregationSession, SessionStatusTransition


class CongregationSessionRepository:
    def list(self, *, status=None, academic_year=None, faculty_id=None,
             department_id=None, search=None):
        qs = CongregationSession.objects.select_related(
            'faculty', 'department', 'certificate_template', 'created_by'
        )
        if status:
            qs = qs.filter(status=status)
        if academic_year:
            qs = qs.filter(academic_year=academic_year)
        if faculty_id:
            qs = qs.filter(faculty_id=faculty_id)
        if department_id:
            qs = qs.filter(department_id=department_id)
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(slug__icontains=search))
        return qs

    def get(self, session_id):
        return (
            CongregationSession.objects
            .select_related('faculty', 'department', 'certificate_template', 'created_by')
            .filter(pk=session_id)
            .first()
        )

    def get_by_slug(self, slug):
        return (
            CongregationSession.objects
            .select_related('faculty', 'department', 'certificate_template')
            .filter(slug=slug)
            .first()
        )

    def create(self, **fields):
        return CongregationSession.objects.create(**fields)

    def update(self, session_id, **fields):
        CongregationSession.objects.filter(pk=session_id).update(**fields)
        return self.get(session_id)

    def record_transition(self, *, session, from_status, to_status, actor, note=''):
        return SessionStatusTransition.objects.create(
            session=session, from_status=from_status, to_status=to_status,
            actor=actor, note=note,
        )
