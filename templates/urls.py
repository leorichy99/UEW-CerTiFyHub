from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import CertificateTemplateViewSet, system_fonts_view

router = DefaultRouter()
router.register(r'', CertificateTemplateViewSet, basename='template')

urlpatterns = [
    path('system-fonts/', system_fonts_view, name='system_fonts'),
] + router.urls
