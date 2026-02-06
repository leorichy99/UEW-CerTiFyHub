from rest_framework import viewsets, permissions
from .models import CertificateTemplate
from .serializers import CertificateTemplateSerializer

class CertificateTemplateViewSet(viewsets.ModelViewSet):
    queryset = CertificateTemplate.objects.all()
    serializer_class = CertificateTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
