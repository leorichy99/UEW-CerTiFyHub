from rest_framework.routers import DefaultRouter
from .views import CertificateTemplateViewSet

router = DefaultRouter()
router.register(r'', CertificateTemplateViewSet, basename='template')

urlpatterns = router.urls
