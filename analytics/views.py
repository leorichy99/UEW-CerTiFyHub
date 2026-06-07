from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from rest_framework.pagination import PageNumberPagination
from certificates.models import Certificate
from registry.models import StudentRecord
from templates.models import CertificateTemplate
from django.contrib.auth.models import User
from django.db.models import Count, Avg, F, Q
from django.db.models.functions import TruncDate
from datetime import timedelta
from django.utils import timezone

from .models import AuditLog
from core.permissions import IsSuperAdmin, IsActiveAccount, HasPermission, IsAdminOrSuperAdmin


class AdminStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActiveAccount, IsAdminOrSuperAdmin]

    def get(self, request):
        total_certs = Certificate.objects.count()
        total_students = StudentRecord.objects.count()
        total_templates = CertificateTemplate.objects.count()

        last_30_days = timezone.now() - timedelta(days=30)
        timeline = Certificate.objects.filter(generated_date__gte=last_30_days) \
            .annotate(date=TruncDate('generated_date')) \
            .values('date') \
            .annotate(count=Count('id')) \
            .order_by('date')

        by_program = Certificate.objects.values('program') \
            .annotate(count=Count('id')) \
            .order_by('-count')[:5]

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


class SuperAdminStatsView(APIView):
    """Dashboard stats for the Super Admin overview page."""
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        now = timezone.now()

        # Core counts
        total_students = StudentRecord.objects.count()
        total_certificates = Certificate.objects.count()
        total_verifications = AuditLog.objects.filter(category='verification').count()
        active_admins = User.objects.filter(
            is_active=True,
            profile__role__in=['ADMIN', 'SUPER_ADMIN']
        ).count()

        # Blockchain-derived stats (certificates as proxy)
        # "Blocks mined" = total certificates
        blocks_mined = total_certificates

        # "Network hashrate" = certificates per hour over last 24h
        last_24h = now - timedelta(hours=24)
        certs_last_24h = Certificate.objects.filter(generated_date__gte=last_24h).count()
        hashrate = round(certs_last_24h / 24.0, 1) if certs_last_24h > 0 else 0

        # "Avg block time" = average seconds between consecutive certificate generations
        avg_block_time = None
        recent_certs = list(
            Certificate.objects.order_by('-generated_date')
            .values_list('generated_date', flat=True)[:100]
        )
        if len(recent_certs) >= 2:
            gaps = []
            for i in range(len(recent_certs) - 1):
                gap = (recent_certs[i] - recent_certs[i + 1]).total_seconds()
                if gap > 0:
                    gaps.append(gap)
            if gaps:
                avg_block_time = round(sum(gaps) / len(gaps), 1)

        # Blockchain status
        blockchain_status = 'healthy' if total_certificates > 0 else 'inactive'

        # Recent admin activities from AuditLog (exclude logins and notifications)
        recent_activities = list(
            AuditLog.objects.filter(category='admin')
            .exclude(action__icontains='notification')
            .exclude(action__icontains='login')
            .order_by('-timestamp')[:10]
            .values('id', 'username', 'action', 'target', 'timestamp', 'category', 'status')
        )

        # Map category to frontend type
        type_map = {
            'admin': 'admin',
            'login': 'admin',
            'security': 'blockchain',
            'verification': 'certificate',
        }
        for a in recent_activities:
            a['type'] = type_map.get(a.pop('category', ''), 'admin')
            a['user'] = a.pop('username', 'System')

        return Response({
            'totalStudents': total_students,
            'totalCertificates': total_certificates,
            'totalVerifications': total_verifications,
            'activeAdmins': active_admins,
            'blockchainStatus': blockchain_status,
            'blocksMined': blocks_mined,
            'networkHashrate': hashrate,
            'avgBlockTime': avg_block_time,
            'recentActivities': recent_activities,
        })


class GlobalAnalyticsView(APIView):
    """System-wide analytics with time range filtering."""
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        range_param = request.query_params.get('range', '30d')
        range_map = {'7d': 7, '30d': 30, '90d': 90, '1y': 365}
        days = range_map.get(range_param, 30)
        now = timezone.now()
        start_date = now - timedelta(days=days)
        prev_start = start_date - timedelta(days=days)

        # --- Issuance trends (certs per day) ---
        issuance_qs = (
            Certificate.objects.filter(generated_date__gte=start_date)
            .annotate(date=TruncDate('generated_date'))
            .values('date')
            .annotate(issued=Count('id'))
            .order_by('date')
        )
        # Verification counts per day
        verif_qs = (
            AuditLog.objects.filter(category='verification', timestamp__gte=start_date)
            .annotate(date=TruncDate('timestamp'))
            .values('date')
            .annotate(verified=Count('id'))
            .order_by('date')
        )
        verif_by_date = {v['date']: v['verified'] for v in verif_qs}
        issuance_trends = []
        for item in issuance_qs:
            d = item['date']
            issuance_trends.append({
                'date': d.isoformat() if d else '',
                'issued': item['issued'],
                'verified': verif_by_date.get(d, 0),
            })

        # --- Verification method breakdown per day ---
        # We track method in the 'details' field of verification audit logs
        verif_method_qs = (
            AuditLog.objects.filter(category='verification', timestamp__gte=start_date)
            .annotate(date=TruncDate('timestamp'))
            .values('date', 'details')
            .annotate(count=Count('id'))
            .order_by('date')
        )
        method_by_date = {}
        for item in verif_method_qs:
            d = item['date']
            if d not in method_by_date:
                method_by_date[d] = {'qr': 0, 'blockchain': 0, 'api': 0}
            detail = (item.get('details') or '').lower()
            if 'qr' in detail:
                method_by_date[d]['qr'] += item['count']
            elif 'blockchain' in detail:
                method_by_date[d]['blockchain'] += item['count']
            else:
                method_by_date[d]['api'] += item['count']
        verification_trends = [
            {'date': d.isoformat(), **methods}
            for d, methods in sorted(method_by_date.items())
        ]

        # --- Department/program breakdown ---
        current_by_program = (
            Certificate.objects.filter(generated_date__gte=start_date)
            .values('program')
            .annotate(issued=Count('id'))
            .order_by('-issued')
        )
        prev_by_program = dict(
            Certificate.objects.filter(
                generated_date__gte=prev_start, generated_date__lt=start_date
            )
            .values('program')
            .annotate(issued=Count('id'))
            .values_list('program', 'issued')
        )
        # Verification counts per program
        verif_by_program = dict(
            AuditLog.objects.filter(category='verification', timestamp__gte=start_date)
            .values('target')
            .annotate(count=Count('id'))
            .values_list('target', 'count')
        )

        department_breakdown = []
        for item in current_by_program:
            prog = item['program'] or 'Unknown'
            issued = item['issued']
            prev_issued = prev_by_program.get(prog, 0)
            growth = round(((issued - prev_issued) / max(prev_issued, 1)) * 100, 1)
            verified = verif_by_program.get(prog, 0)
            department_breakdown.append({
                'department': prog,
                'issued': issued,
                'verified': verified,
                'growth': growth,
            })

        # --- Summary ---
        total_issued = Certificate.objects.filter(generated_date__gte=start_date).count()
        prev_issued = Certificate.objects.filter(
            generated_date__gte=prev_start, generated_date__lt=start_date
        ).count()
        total_verified = AuditLog.objects.filter(
            category='verification', timestamp__gte=start_date
        ).count()
        prev_verified = AuditLog.objects.filter(
            category='verification', timestamp__gte=prev_start, timestamp__lt=start_date
        ).count()

        growth_rate = round(
            ((total_issued - prev_issued) / max(prev_issued, 1)) * 100, 1
        ) if prev_issued > 0 else (100.0 if total_issued > 0 else 0)
        verification_rate = round(
            (total_verified / max(total_issued, 1)) * 100, 1
        )
        verif_growth = round(
            ((total_verified - prev_verified) / max(prev_verified, 1)) * 100, 1
        ) if prev_verified > 0 else (100.0 if total_verified > 0 else 0)

        return Response({
            'issuanceTrends': issuance_trends,
            'verificationTrends': verification_trends,
            'departmentBreakdown': department_breakdown,
            'summary': {
                'totalIssued': total_issued,
                'totalVerified': total_verified,
                'growthRate': growth_rate,
                'verificationRate': verification_rate,
                'verificationGrowth': verif_growth,
            },
        })


class AuditLogPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class AuditLogsView(APIView):
    """Paginated, filterable audit logs for the Super Admin."""
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        category = request.query_params.get('category', 'admin')
        search = request.query_params.get('search', '').strip()
        date_filter = request.query_params.get('date', 'all')
        status_filter = request.query_params.get('status', 'all')

        qs = AuditLog.objects.all()

        # Exclude notification and login noise from audit logs
        qs = qs.exclude(category='login')
        qs = qs.exclude(action__icontains='notification')

        if category and category != 'all':
            qs = qs.filter(category=category)

        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)

        if search:
            qs = qs.filter(
                Q(username__icontains=search)
                | Q(action__icontains=search)
                | Q(target__icontains=search)
            )

        now = timezone.now()
        if date_filter == 'today':
            qs = qs.filter(timestamp__date=now.date())
        elif date_filter == 'week':
            qs = qs.filter(timestamp__gte=now - timedelta(days=7))
        elif date_filter == 'month':
            qs = qs.filter(timestamp__gte=now - timedelta(days=30))

        paginator = AuditLogPagination()
        page = paginator.paginate_queryset(qs, request)

        results = []
        for log in page:
            results.append({
                'id': log.id,
                'user': log.username or 'System',
                'action': log.action,
                'target': log.target,
                'timestamp': log.timestamp.isoformat(),
                'ip': log.ip_address or '',
                'status': log.status,
                'details': log.details,
                'category': log.category,
            })

        return paginator.get_paginated_response(results)
