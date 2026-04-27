from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Student
from .serializers import StudentSerializer, BulkStudentSerializer
from analytics.utils import log_audit
from core.permissions import HasPermission, IsActiveAccount

class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    permission_classes = [permissions.IsAuthenticated, IsActiveAccount]

    def get_permissions(self):
        """Map actions to granular permission keys."""
        perm_map = {
            'list': 'students.view',
            'retrieve': 'students.view',
            'create': 'students.edit',
            'update': 'students.edit',
            'partial_update': 'students.edit',
            'destroy': 'students.delete',
            'bulk_create': 'students.import',
        }
        perm_key = perm_map.get(self.action)
        if perm_key:
            return [permissions.IsAuthenticated(), IsActiveAccount(), HasPermission.of(perm_key)()]
        return super().get_permissions()

    def get_queryset(self):
        qs = Student.objects.all().order_by('-id')
        params = self.request.query_params

        # Multi-ID tokenized search: comma-separated student_id values
        ids_param = params.get('ids', '').strip()
        if ids_param:
            id_list = [v.strip() for v in ids_param.split(',') if v.strip()]
            if id_list:
                id_q = Q()
                for sid in id_list:
                    id_q |= Q(student_id__iexact=sid)
                qs = qs.filter(id_q)

        search = params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(full_name__icontains=search) |
                Q(student_id__icontains=search) |
                Q(email__icontains=search)
            )

        program = params.get('program', '').strip()
        if program:
            qs = qs.filter(program=program)

        graduation_year = params.get('graduation_year', '').strip()
        if graduation_year:
            qs = qs.filter(graduation_date__year=graduation_year)

        return qs

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if response.status_code == 201:
            name = response.data.get('full_name', '')
            log_audit(request=request, action='Created student',
                      target=name,
                      details=f'Student {name} added to the system',
                      category='admin')
        return response

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        name = instance.full_name
        sid = instance.student_id
        response = super().destroy(request, *args, **kwargs)
        log_audit(request=request, action='Deleted student',
                  target=f'{name} ({sid})',
                  details=f'Student record removed',
                  category='admin')
        return response

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Bulk create students from Excel import"""
        serializer = BulkStudentSerializer(data=request.data)
        if serializer.is_valid():
            students = serializer.save()
            log_audit(request=request, action='Bulk imported students',
                      target=f'{len(students)} students',
                      details=f'Bulk imported {len(students)} student records from Excel',
                      category='admin')
            return Response(
                StudentSerializer(students, many=True).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
