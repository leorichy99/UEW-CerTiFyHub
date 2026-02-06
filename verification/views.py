from rest_framework import generics, permissions, status
from rest_framework.response import Response
from certificates.models import Certificate
from certificates.serializers import CertificateSerializer

class VerifyCertificateView(generics.RetrieveAPIView):
    queryset = Certificate.objects.all()
    serializer_class = CertificateSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'id'

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
        except Exception:
            return Response({
                'status': 'INVALID',
                'message': 'Certificate not found or invalid ID.'
            }, status=status.HTTP_404_NOT_FOUND)

        if instance.status == 'REVOKED':
            return Response({
                'status': 'REVOKED',
                'message': 'This certificate has been revoked.'
            }, status=status.HTTP_200_OK) # Return 200 but with Revoked status
        
        serializer = self.get_serializer(instance)
        return Response({
            'status': 'VALID',
            'certificate': serializer.data
        })
