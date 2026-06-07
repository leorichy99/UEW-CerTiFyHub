"""Admin-authenticated faculty + department CRUD."""

from rest_framework import viewsets, permissions
from rest_framework.exceptions import ValidationError

from core.permissions import IsActiveAccount, IsSuperAdmin
from registry.models import Faculty, Department
from registry.serializers import FacultySerializer, DepartmentSerializer
from registry.services import FacultyService, DepartmentService


class FacultyViewSet(viewsets.ModelViewSet):
    """
    Read access for any active account. Write access for Super Admin only.
    """

    queryset = Faculty.objects.all().order_by('name')
    serializer_class = FacultySerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated(), IsActiveAccount()]
        return [permissions.IsAuthenticated(), IsActiveAccount(), IsSuperAdmin()]

    def get_queryset(self):
        qs = super().get_queryset()
        active_only = self.request.query_params.get('active_only') in ('1', 'true', 'True')
        if active_only:
            qs = qs.filter(is_active=True)
        return qs


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.select_related('faculty').all().order_by('name')
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated(), IsActiveAccount()]
        return [permissions.IsAuthenticated(), IsActiveAccount(), IsSuperAdmin()]

    def get_queryset(self):
        qs = super().get_queryset()
        faculty_id = self.request.query_params.get('faculty')
        if faculty_id:
            qs = qs.filter(faculty_id=faculty_id)
        active_only = self.request.query_params.get('active_only') in ('1', 'true', 'True')
        if active_only:
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        faculty = serializer.validated_data.get('faculty')
        if not faculty:
            raise ValidationError({'faculty': 'Faculty is required.'})
        serializer.save()
