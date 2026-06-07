from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes as perm_classes
from rest_framework.response import Response
from .models import CertificateTemplate
from .serializers import CertificateTemplateSerializer
from notifications.services import notify
from core.permissions import HasPermission, IsActiveAccount


_cached_system_fonts = None


@api_view(['GET'])
@perm_classes([permissions.IsAuthenticated, IsActiveAccount])
def system_fonts_view(request):
    """Return a sorted list of unique font family names installed on the server."""
    global _cached_system_fonts
    if _cached_system_fonts is None:
        try:
            from matplotlib.font_manager import fontManager
            families = set()
            for f in fontManager.ttflist:
                name = getattr(f, 'name', None)
                if name:
                    families.add(name)
            _cached_system_fonts = sorted(families, key=str.lower)
        except Exception:
            _cached_system_fonts = []
    return Response(_cached_system_fonts)


class CertificateTemplateViewSet(viewsets.ModelViewSet):
    queryset = CertificateTemplate.objects.select_related('created_by').all().order_by('-updated_at')
    serializer_class = CertificateTemplateSerializer
    permission_classes = [permissions.IsAuthenticated, IsActiveAccount]
    pagination_class = None

    def get_permissions(self):
        """Require templates.manage for write operations."""
        write_actions = ('create', 'update', 'partial_update', 'destroy', 'lock', 'unlock')
        if self.action in write_actions:
            return [
                permissions.IsAuthenticated(),
                IsActiveAccount(),
                HasPermission.of('templates.manage')(),
            ]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.is_locked and not _is_super_admin(self.request.user):
            raise permissions.PermissionDenied('This template is locked. Only Super Admins can edit locked templates.')
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    def perform_destroy(self, instance):
        if instance.is_locked and not _is_super_admin(self.request.user):
            raise permissions.PermissionDenied('This template is locked. Only Super Admins can delete locked templates.')
        instance.delete()

    @action(detail=True, methods=['post'], url_path='lock')
    def lock(self, request, pk=None):
        template = self.get_object()
        template.is_locked = True
        template.status = 'official'
        template.save(update_fields=['is_locked', 'status'])

        notify(
            role_target='ADMIN',
            title='Template Locked',
            message=f'Template "{template.name}" has been locked by {request.user.username}',
            notification_type='template_locked',
            priority='info',
            related_object_id=str(template.id),
            related_object_type='template',
            request=request,
        )

        return Response(CertificateTemplateSerializer(template).data)

    @action(detail=True, methods=['post'], url_path='unlock')
    def unlock(self, request, pk=None):
        template = self.get_object()
        template.is_locked = False
        template.save(update_fields=['is_locked'])

        notify(
            role_target='ADMIN',
            title='Template Unlocked',
            message=f'Template "{template.name}" has been unlocked by {request.user.username}',
            notification_type='template_updated',
            priority='info',
            related_object_id=str(template.id),
            related_object_type='template',
            request=request,
        )

        return Response(CertificateTemplateSerializer(template).data)
