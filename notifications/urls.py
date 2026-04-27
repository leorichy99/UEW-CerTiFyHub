from django.urls import path
from .views import (
    NotificationListView, mark_read, mark_all_read,
    archive_notification, unread_count, clear_all_notifications, NotificationPreferenceView,
)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification_list'),
    path('<uuid:pk>/read/', mark_read, name='notification_mark_read'),
    path('mark-all-read/', mark_all_read, name='notification_mark_all_read'),
    path('<uuid:pk>/archive/', archive_notification, name='notification_archive'),
    path('unread-count/', unread_count, name='notification_unread_count'),
    path('clear-all/', clear_all_notifications, name='notification_clear_all'),
    path('preferences/', NotificationPreferenceView.as_view(), name='notification_preferences'),
]
