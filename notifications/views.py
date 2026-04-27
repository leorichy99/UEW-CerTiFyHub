from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q

from .models import Notification, NotificationPreference
from .serializers import NotificationSerializer, NotificationPreferenceSerializer


class NotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 50


class NotificationListView(generics.ListAPIView):
    """List notifications for the authenticated user (personal + role broadcasts)."""
    serializer_class = NotificationSerializer
    pagination_class = NotificationPagination
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = getattr(getattr(user, 'profile', None), 'role', '')

        qs = Notification.objects.filter(
            Q(recipient=user) | Q(role_target=role)
        ).filter(is_archived=False)

        # Filters
        ntype = self.request.query_params.get('type')
        if ntype:
            qs = qs.filter(notification_type=ntype)

        is_read = self.request.query_params.get('is_read')
        if is_read == 'true':
            qs = qs.filter(is_read=True)
        elif is_read == 'false':
            qs = qs.filter(is_read=False)

        priority = self.request.query_params.get('priority')
        if priority:
            qs = qs.filter(priority=priority)

        category = self.request.query_params.get('category')
        if category == 'certificates':
            qs = qs.filter(notification_type__in=[
                'certificate_issued', 'certificate_revoked',
                'certificate_reactivated', 'bulk_issuance_complete',
                'blockchain_confirmed', 'blockchain_failed',
            ])
        elif category == 'security':
            qs = qs.filter(notification_type__in=[
                'suspicious_verification', 'new_device_login',
                'password_reset',
            ])
        elif category == 'system':
            qs = qs.filter(notification_type__in=[
                'config_changed', 'system', 'admin_created',
                'template_locked', 'template_updated',
            ])

        return qs


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_read(request, pk):
    """Mark a single notification as read."""
    try:
        notification = Notification.objects.get(
            Q(recipient=request.user) | Q(role_target=getattr(getattr(request.user, 'profile', None), 'role', '')),
            id=pk,
        )
    except Notification.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)

    notification.is_read = True
    notification.save(update_fields=['is_read'])
    return Response(NotificationSerializer(notification).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_all_read(request):
    """Mark all of the user's unread notifications as read."""
    user = request.user
    role = getattr(getattr(user, 'profile', None), 'role', '')

    count = Notification.objects.filter(
        Q(recipient=user) | Q(role_target=role),
        is_read=False,
    ).update(is_read=True)

    return Response({'marked': count})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def archive_notification(request, pk):
    """Archive a notification."""
    try:
        notification = Notification.objects.get(
            Q(recipient=request.user) | Q(role_target=getattr(getattr(request.user, 'profile', None), 'role', '')),
            id=pk,
        )
    except Notification.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)

    notification.is_archived = True
    notification.save(update_fields=['is_archived'])
    return Response({'status': 'archived'})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def unread_count(request):
    """Return count of unread notifications."""
    user = request.user
    role = getattr(getattr(user, 'profile', None), 'role', '')

    count = Notification.objects.filter(
        Q(recipient=user) | Q(role_target=role),
        is_read=False, is_archived=False,
    ).count()

    return Response({'count': count})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def clear_all_notifications(request):
    """Permanently delete all notifications for the authenticated user (and role-targeted)."""
    user = request.user
    role = getattr(getattr(user, 'profile', None), 'role', '')

    qs = Notification.objects.filter(
        Q(recipient=user) | Q(role_target=role)
    )
    deleted_count, _ = qs.delete()

    return Response({'deleted': deleted_count})


class NotificationPreferenceView(generics.RetrieveUpdateAPIView):
    """Get or update the authenticated user's notification preferences."""
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        obj, _ = NotificationPreference.objects.get_or_create(user=self.request.user)
        return obj
