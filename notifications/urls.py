from django.urls import path
from .views import (
    NotificationListView, mark_read, mark_all_read,
    archive_notification, unread_count, clear_all_notifications, NotificationPreferenceView,
)
from .sse_views import notification_sse, audit_log_sse

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification_list'),
    path('<uuid:pk>/read/', mark_read, name='notification_mark_read'),
    path('mark-all-read/', mark_all_read, name='notification_mark_all_read'),
    path('<uuid:pk>/archive/', archive_notification, name='notification_archive'),
    path('unread-count/', unread_count, name='notification_unread_count'),
    path('clear-all/', clear_all_notifications, name='notification_clear_all'),
    path('preferences/', NotificationPreferenceView.as_view(), name='notification_preferences'),
    # SSE endpoints
    path('sse/notifications/', notification_sse, name='notification_sse'),
    path('sse/audit-logs/', audit_log_sse, name='audit_log_sse'),
]
