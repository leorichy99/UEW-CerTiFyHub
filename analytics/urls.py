from django.urls import path
from .views import AdminStatsView, SuperAdminStatsView, GlobalAnalyticsView, AuditLogsView

urlpatterns = [
    path('stats/', AdminStatsView.as_view(), name='admin_stats'),
    path('super-admin-stats/', SuperAdminStatsView.as_view(), name='super_admin_stats'),
    path('global/', GlobalAnalyticsView.as_view(), name='global_analytics'),
    path('audit-logs/', AuditLogsView.as_view(), name='audit_logs'),
]
