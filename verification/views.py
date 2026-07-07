from rest_framework import generics, permissions, status
from rest_framework.response import Response
from certificates.models import Certificate
from certificates.serializers import CertificateSerializer
from analytics.utils import log_audit
from notifications.services import notify

class VerifyCertificateView(generics.RetrieveAPIView):
    queryset = Certificate.objects.all()
    serializer_class = CertificateSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'id'

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
        except Exception:
            log_audit(request=request, user=None, action='Verification failed',
                      target=str(kwargs.get('id', '')),
                      details='Certificate not found or invalid ID',
                      status='failed', category='verification')
            return Response({
                'status': 'INVALID',
                'message': 'Certificate not found or invalid ID.'
            }, status=status.HTTP_404_NOT_FOUND)

        if instance.status == 'REVOKED':
            log_audit(request=request, user=None, action='Verified certificate (revoked)',
                      target=f'{instance.student_name} - {instance.certificate_number}',
                      details='API verification - certificate is revoked',
                      status='warning', category='verification')
            # Alert super admins of revoked cert verification attempt
            notify(
                role_target='SUPER_ADMIN',
                title='Revoked Certificate Verification Attempt',
                message=f'Someone attempted to verify revoked certificate {instance.certificate_number} ({instance.student_name})',
                notification_type='suspicious_verification',
                priority='warning',
                related_object_id=str(instance.id),
                related_object_type='certificate',
            )
            # Return minimal data for privacy
            return Response({
                'status': 'REVOKED',
                'message': 'This certificate has been revoked.',
                'certificate': {
                    'student_name': instance.student_name,
                    'certificate_number': instance.certificate_number,
                }
            }, status=status.HTTP_200_OK)
        
        log_audit(request=request, user=None, action='Verified certificate',
                  target=f'{instance.student_name} - {instance.certificate_number}',
                  details='API verification',
                  status='success', category='verification')

        # Notify the issuing admin of a verification attempt
        if instance.created_by:
            notify(
                recipient=instance.created_by,
                title='Certificate Verified',
                message=f'Certificate {instance.certificate_number} ({instance.student_name}) was verified',
                notification_type='verification_attempt',
                priority='info',
                related_object_id=str(instance.id),
                related_object_type='certificate',
            )

        serializer = self.get_serializer(instance)
        return Response({
            'status': 'VALID',
            'certificate': serializer.data
        })
