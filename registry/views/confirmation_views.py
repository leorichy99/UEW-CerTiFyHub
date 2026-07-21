"""Unauthenticated public confirmation endpoints."""

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

from registry.models import DisputeAttachment
from registry.services import (
    ConfirmationService, TokenInvalid, TokenExpired, BatchNotAccepting,
    AlreadyFinalised,
)


def _client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def _serialise_record(record):
    return {
        'batch': {
            'id': str(record.batch.id),
            'name': record.batch.name,
            'year': record.batch.year,
            'confirmation_deadline': record.batch.confirmation_deadline.isoformat(),
            'status': record.batch.status,
        },
        'record': {
            'id': str(record.id),
            'index_number': record.index_number,
            'first_name': record.first_name,
            'middle_name': record.middle_name,
            'last_name': record.last_name,
            'name_order': record.name_order or ['first_name', 'middle_name', 'last_name'],
            'institutional_email': record.institutional_email,
            'programme': record.programme,
            'class_of_degree': record.class_of_degree,
            'date_of_completion': record.date_of_completion.isoformat() if record.date_of_completion else None,
            'faculty_name': record.faculty.name if record.faculty_id else None,
            'department_name': record.department.name if record.department_id else None,
            'confirmation_status': record.confirmation_status,
            'confirmed_at': record.confirmed_at.isoformat() if record.confirmed_at else None,
            'has_pending_dispute': record.disputes.filter(is_pending=True).exists(),
        },
    }


class PublicConfirmationLookupView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        token = request.query_params.get('token', '')
        index = request.query_params.get('index_number', '') or request.query_params.get('ix', '')
        if not token or not index:
            return Response(
                {'detail': 'token and index_number are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        service = ConfirmationService()
        try:
            record = service.resolve(
                token, index, ip=_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )
        except TokenInvalid as e:
            return Response({'detail': str(e), 'code': 'invalid'},
                            status=status.HTTP_404_NOT_FOUND)
        except TokenExpired as e:
            return Response({'detail': str(e), 'code': 'expired'},
                            status=status.HTTP_410_GONE)
        except BatchNotAccepting as e:
            return Response({'detail': str(e), 'code': 'closed'},
                            status=status.HTTP_409_CONFLICT)
        return Response(_serialise_record(record))


class PublicConfirmView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        token = request.data.get('token', '')
        index = request.data.get('index_number', '')
        if not token or not index:
            return Response(
                {'detail': 'token and index_number are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        service = ConfirmationService()
        try:
            record = service.resolve(
                token, index, ip=_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )
        except TokenInvalid as e:
            return Response({'detail': str(e), 'code': 'invalid'},
                            status=status.HTTP_404_NOT_FOUND)
        except TokenExpired as e:
            return Response({'detail': str(e), 'code': 'expired'},
                            status=status.HTTP_410_GONE)
        except BatchNotAccepting as e:
            return Response({'detail': str(e), 'code': 'closed'},
                            status=status.HTTP_409_CONFLICT)

        try:
            service.confirm(
                record, ip=_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )
        except AlreadyFinalised as e:
            return Response({'detail': str(e), 'code': 'already_finalised'},
                            status=status.HTTP_409_CONFLICT)
        return Response(_serialise_record(record))


class PublicDisputeView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    parser_classes = [MultiPartParser, FormParser]

    ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

    def post(self, request):
        token = request.data.get('token', '')
        index = request.data.get('index_number', '')
        dispute_type = request.data.get('dispute_type', '')
        
        if not token or not index:
            return Response(
                {'detail': 'token and index_number are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        if not dispute_type:
            return Response(
                {'detail': 'dispute_type is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = ConfirmationService()
        try:
            record = service.resolve(
                token, index, ip=_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )
        except TokenInvalid as e:
            return Response({'detail': str(e), 'code': 'invalid'},
                            status=status.HTTP_404_NOT_FOUND)
        except TokenExpired as e:
            return Response({'detail': str(e), 'code': 'expired'},
                            status=status.HTTP_410_GONE)
        except BatchNotAccepting as e:
            return Response({'detail': str(e), 'code': 'closed'},
                            status=status.HTTP_409_CONFLICT)

        # Validate dispute_type
        valid_types = ['name_incorrect', 'programme_incorrect', 'class_of_degree_incorrect', 'other']
        if dispute_type not in valid_types:
            return Response(
                {'detail': f'Invalid dispute_type. Must be one of: {", ".join(valid_types)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate based on dispute_type
        claimed_first_name = request.data.get('claimed_first_name', '').strip()
        claimed_middle_name = request.data.get('claimed_middle_name', '').strip()
        claimed_last_name = request.data.get('claimed_last_name', '').strip()
        claimed_value = request.data.get('claimed_value', '').strip()
        dispute_note = request.data.get('dispute_note', '').strip()
        supporting_document = request.FILES.get('supporting_document')

        if dispute_type == 'name_incorrect':
            # At least one claimed name field must be populated
            if not any([claimed_first_name, claimed_middle_name, claimed_last_name]):
                return Response(
                    {'detail': 'At least one claimed name field is required for name disputes.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Supporting document is required
            if not supporting_document:
                return Response(
                    {'detail': 'Supporting document is required for name disputes.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Validate file
            if supporting_document.size > self.MAX_FILE_SIZE:
                return Response(
                    {'detail': f'File size exceeds {self.MAX_FILE_SIZE / (1024 * 1024)}MB limit.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if supporting_document.content_type not in self.ALLOWED_FILE_TYPES:
                return Response(
                    {'detail': f'Unsupported file type. Allowed types: {", ".join(self.ALLOWED_FILE_TYPES)}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        elif dispute_type in ['programme_incorrect', 'class_of_degree_incorrect']:
            # claimed_value is required
            if not claimed_value or len(claimed_value) < 10:
                return Response(
                    {'detail': 'claimed_value is required and must be at least 10 characters.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        elif dispute_type == 'other':
            # dispute_note is required
            if not dispute_note or len(dispute_note) < 20:
                return Response(
                    {'detail': 'dispute_note is required and must be at least 20 characters.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            from registry.models import Dispute
            dispute = Dispute(
                student_record=record,
                dispute_type=dispute_type,
                claimed_first_name=claimed_first_name if claimed_first_name else None,
                claimed_middle_name=claimed_middle_name if claimed_middle_name else None,
                claimed_last_name=claimed_last_name if claimed_last_name else None,
                claimed_value=claimed_value if claimed_value else None,
                dispute_note=dispute_note if dispute_note else None,
                supporting_document=supporting_document if supporting_document else None,
                supporting_document_filename=supporting_document.name if supporting_document else None,
                is_pending=True,
            )
            dispute.save()

            record.confirmation_status = StudentRecord.CONF_DISPUTED
            record.save(update_fields=['confirmation_status'])

            # Send acknowledgement email
            from registry.services import notifier
            notifier.dispute_raised(record.batch, record)

        except ValueError as e:
            return Response({'detail': str(e)},
                            status=status.HTTP_400_BAD_REQUEST)
        except AlreadyFinalised as e:
            return Response({'detail': str(e), 'code': 'already_finalised'},
                            status=status.HTTP_409_CONFLICT)

        return Response({
            'dispute_id': str(dispute.id),
            'dispute_type': dispute.dispute_type,
            'created_at': dispute.created_at.isoformat(),
            'record': _serialise_record(record),
        }, status=status.HTTP_201_CREATED)


class PublicDisputeUploadView(APIView):
    """Upload ID proof files for disputes."""
    permission_classes = [AllowAny]
    authentication_classes = []
    parser_classes = [MultiPartParser, FormParser]

    ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

    def post(self, request):
        token = request.data.get('token', '')
        index = request.data.get('index_number', '')
        file = request.FILES.get('file')

        if not token or not index or not file:
            return Response(
                {'detail': 'token, index_number and file are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file type
        if file.content_type not in self.ALLOWED_FILE_TYPES:
            return Response(
                {'detail': f'Invalid file type. Allowed: {", ".join(self.ALLOWED_FILE_TYPES)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file size
        if file.size > self.MAX_FILE_SIZE:
            return Response(
                {'detail': f'File too large. Maximum size is 5MB.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify token and get record (don't finalize yet)
        service = ConfirmationService()
        try:
            record = service.resolve(
                token, index, ip=_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )
        except (TokenInvalid, TokenExpired, BatchNotAccepting) as e:
            return Response({'detail': str(e), 'code': getattr(e, 'code', 'invalid')},
                            status=status.HTTP_400_BAD_REQUEST)

        # Create attachment record
        attachment = DisputeAttachment.objects.create(
            record=record,
            file=file,
            file_type=file.content_type,
        )

        return Response({
            'file_id': str(attachment.id),
            'file_name': file.name,
            'file_type': file.content_type,
        })
