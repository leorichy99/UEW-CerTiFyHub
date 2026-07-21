from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from certificates.models import Certificate
from certificates.serializers import CertificateSerializer
from analytics.utils import log_audit
from notifications.services import notify


class TokenVerificationView(generics.RetrieveAPIView):
    """Primary verification path using verification_token (QR code scans)."""
    queryset = Certificate.objects.all()
    serializer_class = CertificateSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'verification_token'

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
        except Exception:
            # Log verification attempt (without token value)
            log_audit(
                request=request, user=None,
                action='certificate.verification_attempted',
                target='verification_token',
                details='Token lookup - certificate not found',
                category='verification',
                metadata={
                    'lookup_path': 'token',
                    'result': 'not_found',
                    'ip_address': self._get_client_ip(request),
                    'user_agent': request.META.get('HTTP_USER_AGENT', '')[:200],
                }
            )
            return Response({
                'status': 'INVALID',
                'message': 'Certificate not found or invalid verification token.'
            }, status=status.HTTP_404_NOT_FOUND)

        if instance.status == 'REVOKED':
            # Log verification attempt (without token value)
            log_audit(
                request=request, user=None,
                action='certificate.verification_attempted',
                target=f'{instance.student_name} - {instance.certificate_number}',
                details='Token lookup - certificate is revoked',
                category='verification',
                metadata={
                    'lookup_path': 'token',
                    'result': 'revoked',
                    'ip_address': self._get_client_ip(request),
                    'user_agent': request.META.get('HTTP_USER_AGENT', '')[:200],
                }
            )
            # Alert super admins of revoked cert verification attempt
            notify(
                role_target='SUPER_ADMIN',
                title='Revoked Certificate Verification Attempt',
                message=f'Someone attempted to verify revoked certificate {instance.certificate_number} via token',
                notification_type='suspicious_verification',
                priority='warning',
                related_object_id=str(instance.id),
                related_object_type='certificate',
            )
            # Return minimal data for revoked certificates (no name or other details)
            return Response({
                'status': 'REVOKED',
                'message': 'This certificate has been revoked and is no longer valid for official use.',
            }, status=status.HTTP_200_OK)
        
        # Log successful verification (without token value)
        log_audit(
            request=request, user=None,
            action='certificate.verification_attempted',
            target=f'{instance.student_name} - {instance.certificate_number}',
            details='Token lookup - verified successfully',
            category='verification',
            metadata={
                'lookup_path': 'token',
                'result': 'verified',
                'ip_address': self._get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', '')[:200],
            }
        )

        # Notify the issuing admin of a verification attempt
        if instance.created_by:
            notify(
                recipient=instance.created_by,
                title='Certificate Verified',
                message=f'Certificate {instance.certificate_number} ({instance.student_name}) was verified via token',
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

    def _get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


@method_decorator(ratelimit(key='ip', rate='10/h', method='GET'), name='get')
class CertificateNumberLookupView(APIView):
    """Secondary verification path using certificate_number (manual entry)."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.utils import timezone
        import time
        
        q = request.query_params.get('q', '').strip()
        
        # Start timing for response consistency
        start_time = time.time()
        
        if not q:
            log_audit(
                request=request, user=None,
                action='certificate.verification_attempted',
                target='certificate_number',
                details='Number lookup - empty query',
                category='verification',
                metadata={
                    'lookup_path': 'certificate_number',
                    'result': 'invalid_query',
                    'ip_address': self._get_client_ip(request),
                    'user_agent': request.META.get('HTTP_USER_AGENT', '')[:200],
                }
            )
            return Response({
                'status': 'INVALID',
                'message': 'Certificate number is required.'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            instance = Certificate.objects.get(certificate_number=q, status='ISSUED')
            
            # Log successful verification
            log_audit(
                request=request, user=None,
                action='certificate.verification_attempted',
                target=f'{instance.student_name} - {instance.certificate_number}',
                details='Number lookup - verified successfully',
                category='verification',
                metadata={
                    'lookup_path': 'certificate_number',
                    'result': 'verified',
                    'ip_address': self._get_client_ip(request),
                    'user_agent': request.META.get('HTTP_USER_AGENT', '')[:200],
                }
            )
            
            # Return limited response (no class of degree, date of completion, date issued)
            return Response({
                'status': 'VALID',
                'certificate': {
                    'student_name': instance.student_name,
                    'program': instance.program,
                    'certificate_number': instance.certificate_number,
                    'note': 'For full certificate details, scan the QR code on the certificate.',
                }
            })
        
        except Certificate.DoesNotExist:
            # Log failed verification
            log_audit(
                request=request, user=None,
                action='certificate.verification_attempted',
                target=q,
                details='Number lookup - certificate not found',
                category='verification',
                metadata={
                    'lookup_path': 'certificate_number',
                    'result': 'not_found',
                    'ip_address': self._get_client_ip(request),
                    'user_agent': request.META.get('HTTP_USER_AGENT', '')[:200],
                }
            )
            
            # Ensure consistent timing (add artificial delay if lookup was too fast)
            elapsed = time.time() - start_time
            if elapsed < 0.1:
                time.sleep(0.1 - elapsed)
            
            return Response({
                'status': 'INVALID',
                'message': f'Certificate number "{q}" not found or invalid.'
            }, status=status.HTTP_404_NOT_FOUND)

    def _get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
