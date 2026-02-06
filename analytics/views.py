from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from certificates.models import Certificate
from students.models import Student
from templates.models import CertificateTemplate
from django.db.models import Count
from django.db.models.functions import TruncDate
from datetime import timedelta
from django.utils import timezone

class AdminStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Basic counts
        total_certs = Certificate.objects.count()
        total_students = Student.objects.count()
        total_templates = CertificateTemplate.objects.count()
        
        # Issuance Timeline (Last 30 days)
        last_30_days = timezone.now() - timedelta(days=30)
        timeline = Certificate.objects.filter(generated_date__gte=last_30_days) \
            .annotate(date=TruncDate('generated_date')) \
            .values('date') \
            .annotate(count=Count('id')) \
            .order_by('date')

        # Certificates by Program
        by_program = Certificate.objects.values('program') \
            .annotate(count=Count('id')) \
            .order_by('-count')[:5]

        # Recent Activity
        recent = Certificate.objects.order_by('-generated_date')[:5].values(
            'id', 'student_name', 'certificate_number', 'generated_date', 'status'
        )

        return Response({
            'counts': {
                'certificates': total_certs,
                'students': total_students,
                'templates': total_templates
            },
            'timeline': timeline,
            'by_program': by_program,
            'recent_activity': recent
        })
