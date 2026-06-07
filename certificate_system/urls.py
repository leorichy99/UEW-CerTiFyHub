from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from core.urls import admin_urlpatterns

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('certificates.urls')),
    path('api/auth/', include('core.urls')),
    path('api/templates/', include('templates.urls')),
    path('api/registry/', include('registry.urls')),
    # Slice 1: dual-mount alias for the spec's `/api/admin/` namespace.
    # The same router is reachable under both prefixes; we will deprecate
    # `/api/registry/` once the frontend has fully migrated.
    path('api/admin/', include(('registry.urls', 'registry'), namespace='admin_registry')),
    path('api/verify/', include('verification.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/users/', include(admin_urlpatterns)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)