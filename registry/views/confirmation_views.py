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
            'full_name': record.full_name,
            'first_name': record.first_name,
            'other_names': record.other_names,
            'last_name': record.last_name,
            'name_order': record.name_order or ['first_name', 'other_names', 'last_name'],
            'institutional_email': record.institutional_email,
            'programme': record.programme,
            'class_of_degree': record.class_of_degree,
            'date_of_completion': record.date_of_completion.isoformat() if record.date_of_completion else None,
            'faculty_name': record.faculty.name if record.faculty_id else None,
            'department_name': record.department.name if record.department_id else None,
            'confirmation_status': record.confirmation_status,
            'confirmed_at': record.confirmed_at.isoformat() if record.confirmed_at else None,
            'dispute_submitted_at': record.dispute_submitted_at.isoformat() if record.dispute_submitted_at else None,
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

        name_order = request.data.get('name_order')
        try:
            service.confirm(
                record, name_order=name_order, ip=_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )
        except AlreadyFinalised as e:
            return Response({'detail': str(e), 'code': 'already_finalised'},
                            status=status.HTTP_409_CONFLICT)
        return Response(_serialise_record(record))


class PublicDisputeView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        token = request.data.get('token', '')
        index = request.data.get('index_number', '')
        note = request.data.get('note', '')
        disputes = request.data.get('disputes', [])
        if not token or not index:
            return Response(
                {'detail': 'token and index_number are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Support both old simple note and new structured disputes
        if not note and not disputes:
            return Response(
                {'detail': 'note or disputes are required.'},
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
            service.dispute(
                record, note=note, disputes=disputes, ip=_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )
        except ValueError as e:
            return Response({'detail': str(e)},
                            status=status.HTTP_400_BAD_REQUEST)
        except AlreadyFinalised as e:
            return Response({'detail': str(e), 'code': 'already_finalised'},
                            status=status.HTTP_409_CONFLICT)
        return Response(_serialise_record(record))


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
