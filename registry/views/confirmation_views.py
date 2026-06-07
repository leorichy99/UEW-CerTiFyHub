"""Unauthenticated public confirmation endpoints."""

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from registry.services import (
    ConfirmationService, TokenInvalid, TokenExpired, SessionNotAccepting,
)


def _client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def _serialise_record(record):
    return {
        'session': {
            'id': str(record.session.id),
            'name': record.session.name,
            'academic_year': record.session.academic_year,
            'confirmation_deadline': record.session.confirmation_deadline.isoformat(),
            'status': record.session.status,
        },
        'record': {
            'id': str(record.id),
            'index_number': record.index_number,
            'full_name': record.full_name,
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
        except SessionNotAccepting as e:
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
        except SessionNotAccepting as e:
            return Response({'detail': str(e), 'code': 'closed'},
                            status=status.HTTP_409_CONFLICT)

        service.confirm(
            record, ip=_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
        return Response(_serialise_record(record))


class PublicDisputeView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        token = request.data.get('token', '')
        index = request.data.get('index_number', '')
        note = request.data.get('note', '')
        if not token or not index or not note:
            return Response(
                {'detail': 'token, index_number and note are required.'},
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
        except SessionNotAccepting as e:
            return Response({'detail': str(e), 'code': 'closed'},
                            status=status.HTTP_409_CONFLICT)

        try:
            service.dispute(
                record, note=note, ip=_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )
        except ValueError as e:
            return Response({'detail': str(e)},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response(_serialise_record(record))
