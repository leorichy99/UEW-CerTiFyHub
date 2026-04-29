import hashlib
import json
import random
import secrets
import string
from datetime import timedelta

from rest_framework import generics, permissions, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Q
from django.utils import timezone

from .models import (
    UserProfile, PasswordResetToken,
    AuthorisationReference, LoginAttemptTracker, SuperAdminDeactivationRequest,
)
from .serializers import (
    UserSerializer, AccountDetailSerializer,
    AuthorisationReferenceSerializer, AuthorisationReferenceCreateSerializer,
    AccountProvisionSerializer, PermissionUpdateSerializer,
    SetupAccountSerializer,
)
from .permissions import IsSuperAdmin
from .permission_constants import build_default_permissions, GRANTABLE_PERMISSIONS
from . import credential_service
from analytics.utils import log_audit
from notifications.services import notify

User = get_user_model()


# ═══════════════════════════════════════════════════════════════════════════
#  UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def mask_email(email):
    """Mask email for privacy: k***@uew.edu.gh"""
    parts = email.split('@')
    if len(parts) != 2:
        return '***'
    name = parts[0]
    if len(name) <= 1:
        masked = '*'
    else:
        masked = name[0] + '*' * (len(name) - 1)
    return f"{masked}@{parts[1]}"


def apply_admin_role(user, role):
    if role == 'SUPER_ADMIN':
        user.is_staff = True
        user.is_superuser = True
    elif role == 'ADMIN':
        user.is_staff = True
        user.is_superuser = False

    user.save(update_fields=['is_staff', 'is_superuser'])

    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.role = role
    profile.save(update_fields=['role'])
    return profile


def _derive_username(email):
    """Derive a unique username from an email address."""
    username = email.split('@')[0]
    base_username = username
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username}{counter}"
        counter += 1
    return username


# ═══════════════════════════════════════════════════════════════════════════
#  AUTHENTICATION — JWT LOGIN WITH LOCKOUT
# ═══════════════════════════════════════════════════════════════════════════

class AuditTokenObtainPairView(TokenObtainPairView):
    """JWT login with audit logging and lockout integration."""
    from .serializers import EmailOrUsernameTokenObtainPairSerializer
    serializer_class = EmailOrUsernameTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        username_input = request.data.get('username', '')

        # Determine the email for lockout tracking
        email_for_tracking = username_input
        if '@' not in username_input:
            try:
                email_for_tracking = User.objects.get(username=username_input).email
            except User.DoesNotExist:
                email_for_tracking = username_input

        # Check lockout
        email_hash = LoginAttemptTracker.hash_email(email_for_tracking)
        tracker, _ = LoginAttemptTracker.objects.get_or_create(email_hash=email_hash)

        if tracker.is_locked():
            if tracker.is_permanently_locked():
                detail = 'Account locked. Contact your system administrator.'
            else:
                remaining = int((tracker.locked_until - timezone.now()).total_seconds())
                detail = f'Account temporarily locked. Try again in {remaining // 60 + 1} minutes.'
            log_audit(
                request=request, user=None, action='Login blocked (locked)',
                target=username_input, details=detail,
                status='failed', category='login', event_type='login.blocked',
            )
            return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            tracker.record_successful_login()
            try:
                user = User.objects.get(
                    Q(username=username_input) | Q(email__iexact=username_input)
                )
            except User.DoesNotExist:
                user = None
            log_audit(
                request=request, user=user, action='Login successful',
                target='Dashboard', details='Session initiated',
                status='success', category='login', event_type='login.success',
            )
        return response

    def handle_exception(self, exc):
        response = super().handle_exception(exc)
        username_input = self.request.data.get('username', '')

        email_for_tracking = username_input
        if '@' not in username_input:
            try:
                email_for_tracking = User.objects.get(username=username_input).email
            except User.DoesNotExist:
                email_for_tracking = username_input

        email_hash = LoginAttemptTracker.hash_email(email_for_tracking)
        tracker, _ = LoginAttemptTracker.objects.get_or_create(email_hash=email_hash)
        tracker.record_failed_attempt()

        log_audit(
            request=self.request, user=None, action='Login failed',
            target=username_input, details='Invalid credentials',
            status='failed', category='login', event_type='login.failed',
        )

        # Notify on lockout
        if tracker.is_locked():
            notify(
                role_target='SUPER_ADMIN',
                title='Account Locked',
                message=f'Account for {mask_email(email_for_tracking)} was locked after repeated failed login attempts.',
                notification_type='system',
                priority='warning',
                request=self.request,
            )
            log_audit(
                request=self.request, user=None, action='Account locked',
                target=username_input,
                details=f'Lockout #{tracker.lockout_count_24h} in 24h',
                status='warning', category='security', event_type='account.locked',
            )

        return response


# ═══════════════════════════════════════════════════════════════════════════
#  CURRENT USER
# ═══════════════════════════════════════════════════════════════════════════

class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_active:
            return Response({'error': 'This account has been deactivated.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


# ═══════════════════════════════════════════════════════════════════════════
#  AUTHORISATION REFERENCE MANAGEMENT  (Super Admin only)
# ═══════════════════════════════════════════════════════════════════════════

class AuthorisationReferenceListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        qs = AuthorisationReference.objects.select_related('logged_by', 'linked_account').all()
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        purpose_filter = request.query_params.get('purpose')
        if purpose_filter:
            qs = qs.filter(purpose=purpose_filter)
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(reference_number__icontains=search) |
                Q(requester_name__icontains=search) |
                Q(requester_staff_id__icontains=search)
            )
        serializer = AuthorisationReferenceSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = AuthorisationReferenceCreateSerializer(data=request.data)
        if serializer.is_valid():
            ref = serializer.save(logged_by=request.user)
            log_audit(
                request=request, user=request.user,
                action='Authorisation reference logged',
                target=ref.reference_number,
                details=f'Requester: {ref.requester_name} (Staff ID: {ref.requester_staff_id})',
                status='success', category='provisioning',
                event_type='authorisation.logged',
                letter_reference=ref.reference_number,
            )
            return Response(
                AuthorisationReferenceSerializer(ref).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AuthorisationReferenceDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]

    def get(self, request, pk):
        try:
            ref = AuthorisationReference.objects.select_related(
                'logged_by', 'linked_account'
            ).get(pk=pk)
        except AuthorisationReference.DoesNotExist:
            return Response({'error': 'Reference not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(AuthorisationReferenceSerializer(ref).data)

    def patch(self, request, pk):
        """Cancel a pending authorisation reference."""
        try:
            ref = AuthorisationReference.objects.get(pk=pk)
        except AuthorisationReference.DoesNotExist:
            return Response({'error': 'Reference not found.'}, status=status.HTTP_404_NOT_FOUND)

        if ref.status != 'pending':
            return Response(
                {'error': f'Cannot modify reference with status "{ref.status}".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_status = request.data.get('status', request.data.get('provisioning_status'))
        if new_status == 'cancelled':
            ref.status = 'cancelled'
            ref.save(update_fields=['status'])
            log_audit(
                request=request, user=request.user,
                action='Authorisation reference cancelled',
                target=ref.reference_number,
                details=f'Requester: {ref.requester_name}',
                status='success', category='provisioning',
                event_type='authorisation.cancelled',
                letter_reference=ref.reference_number,
            )
            return Response(AuthorisationReferenceSerializer(ref).data)

        return Response({'error': 'Only cancellation is allowed.'}, status=status.HTTP_400_BAD_REQUEST)


# ═══════════════════════════════════════════════════════════════════════════
#  ACCOUNT PROVISIONING  (Super Admin only)
# ═══════════════════════════════════════════════════════════════════════════

class AccountListCreateView(APIView):
    """
    GET:  List all provisioned accounts (admins/staff).
    POST: Provision a new account linked to an authorisation reference.
    """
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        qs = User.objects.filter(
            Q(profile__role__in=['ADMIN', 'SUPER_ADMIN']) | Q(is_superuser=True)
        ).select_related('profile', 'profile__letter_reference').distinct().order_by('-date_joined')

        # Filters
        status_filter = request.query_params.get('status')
        if status_filter == 'active':
            qs = qs.filter(is_active=True)
        elif status_filter == 'inactive':
            qs = qs.filter(is_active=False)

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) | Q(last_name__icontains=search) |
                Q(email__icontains=search) | Q(profile__staff_id__icontains=search)
            )

        serializer = AccountDetailSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = AccountProvisionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        ref = AuthorisationReference.objects.get(reference_number=data['letter_reference_number'])

        # Split full name
        name_parts = data['full_name'].split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ''

        # Create user (inactive until first login)
        username = _derive_username(data['email'])
        user = User.objects.create_user(
            username=username,
            email=data['email'],
            password=None,  # no usable password yet
            first_name=first_name,
            last_name=last_name,
            is_active=False,
        )

        # Build full permission dict (merge provided with defaults)
        full_perms = build_default_permissions()
        for key, val in data['permissions'].items():
            full_perms[key] = val

        # Update profile
        profile = user.profile
        profile.role = 'ADMIN'
        profile.staff_id = data['staff_id']
        profile.department = data['department']
        profile.account_type = data['account_type']
        profile.access_duration = data['access_duration']
        profile.access_end_date = data.get('access_end_date')
        profile.letter_reference = ref
        profile.permissions = full_perms
        profile.is_legacy = False
        profile.permission_history = [{
            'date': timezone.now().isoformat(),
            'action': 'initial_grant',
            'permissions_changed': {k: v for k, v in data['permissions'].items() if v},
            'letter_ref': ref.reference_number,
            'changed_by': request.user.username,
        }]
        profile.save()

        # Mark authorisation reference as used
        ref.status = 'used'
        ref.linked_account = user
        ref.save(update_fields=['status', 'linked_account'])

        # Generate and send credential
        raw_token = credential_service.generate_credential(user)
        email_sent = credential_service.send_credential_email(user, raw_token)

        # Audit
        log_audit(
            request=request, user=request.user,
            action='Account provisioned',
            target=data['email'],
            details=f"Name: {data['full_name']}, Staff ID: {data['staff_id']}, "
                    f"Permissions: {json.dumps({k: v for k, v in data['permissions'].items() if v})}",
            status='success', category='provisioning',
            event_type='account.created',
            letter_reference=ref.reference_number,
        )

        if email_sent:
            log_audit(
                request=request, user=request.user,
                action='Credential email delivered',
                target=data['email'],
                details=f'One-time setup link sent (expires in 24h)',
                status='success', category='credentials',
                event_type='credentials.delivered',
                letter_reference=ref.reference_number,
            )

        # Notify
        notify(
            role_target='SUPER_ADMIN',
            title='New Account Provisioned',
            message=f"{data['full_name']} ({data['email']}) provisioned by {request.user.username}, ref: {ref.reference_number}",
            notification_type='admin_created',
            priority='success',
            related_object_id=str(user.id),
            related_object_type='user',
            request=request,
        )

        response_data = AccountDetailSerializer(user).data
        response_data['credential_email_sent'] = email_sent
        if not email_sent:
            response_data['warning'] = 'Account created but credential email failed. Use regenerate credentials.'
        return Response(response_data, status=status.HTTP_201_CREATED)


class AccountDetailView(APIView):
    """GET/PATCH individual account. No DELETE — only deactivation."""
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]

    def get(self, request, pk):
        try:
            user = User.objects.select_related('profile', 'profile__letter_reference').get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(AccountDetailSerializer(user).data)


class AccountPermissionUpdateView(APIView):
    """Update permissions for an account (requires letter reference for additions)."""
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]

    def patch(self, request, pk):
        try:
            target_user = User.objects.select_related('profile').get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = PermissionUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        profile = target_user.profile
        old_perms = dict(profile.permissions)
        changes = {}

        for key, new_val in data['permissions'].items():
            if old_perms.get(key) != new_val:
                changes[key] = new_val
                old_perms[key] = new_val

        if not changes:
            return Response({'message': 'No changes detected.'})

        profile.permissions = old_perms

        # Record in permission history
        history_entry = {
            'date': timezone.now().isoformat(),
            'action': 'permission_update',
            'permissions_changed': changes,
            'letter_ref': data.get('letter_reference_number', ''),
            'reason': data.get('reason', ''),
            'changed_by': request.user.username,
        }
        history = list(profile.permission_history or [])
        history.append(history_entry)
        profile.permission_history = history
        profile.save(update_fields=['permissions', 'permission_history'])

        # Mark the authorisation reference as used and link it to this account
        ref_number = data.get('letter_reference_number', '')
        if ref_number:
            try:
                ref = AuthorisationReference.objects.get(reference_number=ref_number)
                if ref.status == 'pending':
                    ref.status = 'used'
                    ref.linked_account = target_user
                    ref.save(update_fields=['status', 'linked_account'])
            except AuthorisationReference.DoesNotExist:
                pass

        log_audit(
            request=request, user=request.user,
            action='Permissions updated',
            target=target_user.email,
            details=f'Changes: {json.dumps(changes)}',
            status='success', category='permissions',
            event_type='permission.updated',
            letter_reference=ref_number,
        )

        return Response(AccountDetailSerializer(target_user).data)


class AccountDeactivateView(APIView):
    """Deactivate an account. For SA accounts, initiates two-person flow."""
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]

    def post(self, request, pk):
        try:
            target_user = User.objects.select_related('profile').get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)

        if target_user.pk == request.user.pk:
            return Response({'error': 'Cannot deactivate your own account.'}, status=status.HTTP_400_BAD_REQUEST)

        reason = request.data.get('reason', '')
        profile = getattr(target_user, 'profile', None)

        # Super Admin accounts require two-person authorisation
        if profile and profile.role == 'SUPER_ADMIN':
            # Check minimum SA count
            active_sa_count = UserProfile.objects.filter(
                role='SUPER_ADMIN', user__is_active=True
            ).count()
            if active_sa_count <= 2:
                return Response(
                    {'error': 'Cannot deactivate: system requires at least 2 active Super Admin accounts.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Check for existing pending request
            pending = SuperAdminDeactivationRequest.objects.filter(
                target_account=target_user, status='pending'
            ).first()
            if pending:
                return Response(
                    {'error': 'A deactivation request is already pending for this account.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Create two-person deactivation request
            raw_token = secrets.token_urlsafe(48)
            token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

            deactivation = SuperAdminDeactivationRequest.objects.create(
                target_account=target_user,
                initiated_by=request.user,
                reason=reason,
                confirmation_token_hash=token_hash,
                confirmation_token_expires_at=timezone.now() + timedelta(hours=48),
            )

            # Find other active Super Admins to confirm
            other_sas = User.objects.filter(
                profile__role='SUPER_ADMIN', is_active=True
            ).exclude(pk__in=[request.user.pk, target_user.pk])

            # Send confirmation email to all other SAs
            confirm_url = f"{settings.FRONTEND_URL}/admin/confirm-deactivation/{raw_token}"
            for sa in other_sas:
                try:
                    send_mail(
                        subject='Super Admin Deactivation Confirmation Required',
                        message=(
                            f"Dear {sa.get_full_name() or sa.username},\n\n"
                            f"{request.user.get_full_name() or request.user.username} has requested "
                            f"deactivation of the Super Admin account for "
                            f"{target_user.get_full_name() or target_user.username} ({target_user.email}).\n\n"
                            f"Reason: {reason}\n\n"
                            f"To confirm or reject this request, click:\n{confirm_url}\n\n"
                            f"Or log in to the system and navigate to User Management.\n\n"
                            f"This request expires in 48 hours.\n\n"
                            f"UEW CerTiFyHub System"
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[sa.email],
                        fail_silently=True,
                    )
                except Exception:
                    pass

                notify(
                    recipient=sa,
                    title='SA Deactivation Confirmation Required',
                    message=f'{request.user.username} requested deactivation of {target_user.email}. Reason: {reason}',
                    notification_type='system',
                    priority='critical',
                    related_object_id=str(deactivation.id),
                    related_object_type='sa_deactivation',
                    request=request,
                )

            log_audit(
                request=request, user=request.user,
                action='SA deactivation initiated (pending confirmation)',
                target=target_user.email,
                details=f'Reason: {reason}',
                status='warning', category='security',
                event_type='sa.deactivation.initiated',
            )

            return Response({
                'message': 'Deactivation request created. Another Super Admin must confirm.',
                'deactivation_id': deactivation.id,
            })

        # Non-SA accounts: direct deactivation
        target_user.is_active = False
        target_user.save(update_fields=['is_active'])

        log_audit(
            request=request, user=request.user,
            action='Account deactivated',
            target=target_user.email,
            details=f'Reason: {reason}',
            status='success', category='provisioning',
            event_type='account.deactivated',
        )

        notify(
            role_target='SUPER_ADMIN',
            title='Account Deactivated',
            message=f'{target_user.email} deactivated by {request.user.username}. Reason: {reason}',
            notification_type='system', priority='warning',
            related_object_id=str(target_user.id),
            related_object_type='user',
            request=request,
        )

        return Response({'message': 'Account deactivated successfully.'})


class AccountReactivateView(APIView):
    """Reactivate a deactivated account."""
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]

    def post(self, request, pk):
        try:
            target_user = User.objects.select_related('profile').get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)

        target_user.is_active = True
        target_user.save(update_fields=['is_active'])

        log_audit(
            request=request, user=request.user,
            action='Account reactivated',
            target=target_user.email,
            status='success', category='provisioning',
            event_type='account.reactivated',
        )

        return Response(AccountDetailSerializer(target_user).data)


class AccountUnlockView(APIView):
    """Unlock a locked account (after repeated failed login attempts)."""
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]

    def post(self, request, pk):
        try:
            target_user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)

        email_hash = LoginAttemptTracker.hash_email(target_user.email)
        try:
            tracker = LoginAttemptTracker.objects.get(email_hash=email_hash)
            tracker.unlock()
        except LoginAttemptTracker.DoesNotExist:
            pass

        log_audit(
            request=request, user=request.user,
            action='Account unlocked',
            target=target_user.email,
            status='success', category='security',
            event_type='account.unlocked',
        )

        return Response({'message': f'Account {target_user.email} unlocked successfully.'})


class AccountRegenerateCredentialView(APIView):
    """Regenerate one-time credential link and resend email."""
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]

    def post(self, request, pk):
        try:
            target_user = User.objects.select_related('profile').get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)

        profile = target_user.profile
        if profile.first_login_completed:
            return Response(
                {'error': 'User has already completed first login. Use password reset instead.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        raw_token, email_sent = credential_service.regenerate_credential(target_user)

        log_audit(
            request=request, user=request.user,
            action='Credentials regenerated',
            target=target_user.email,
            details=f'Email sent: {email_sent}',
            status='success', category='credentials',
            event_type='credentials.regenerated',
        )

        response_data = {'message': 'Credential regenerated.', 'email_sent': email_sent}
        if not email_sent:
            response_data['warning'] = 'Token generated but email failed.'
        return Response(response_data)


# ═══════════════════════════════════════════════════════════════════════════
#  SA DEACTIVATION CONFIRMATION
# ═══════════════════════════════════════════════════════════════════════════

class SADeactivationConfirmView(APIView):
    """Validate and confirm/reject SA deactivation request via token."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        """Validate token and show request details."""
        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        try:
            deactivation = SuperAdminDeactivationRequest.objects.select_related(
                'target_account', 'initiated_by'
            ).get(confirmation_token_hash=token_hash, status='pending')
        except SuperAdminDeactivationRequest.DoesNotExist:
            return Response({'error': 'Invalid or expired confirmation token.'}, status=status.HTTP_400_BAD_REQUEST)

        if deactivation.is_expired():
            deactivation.status = 'expired'
            deactivation.save(update_fields=['status'])
            return Response({'error': 'This confirmation request has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'deactivation_id': deactivation.id,
            'target_email': deactivation.target_account.email,
            'target_name': deactivation.target_account.get_full_name(),
            'initiated_by': deactivation.initiated_by.get_full_name() or deactivation.initiated_by.username,
            'reason': deactivation.reason,
            'created_at': deactivation.created_at,
        })

    def post(self, request, token):
        """Confirm or reject the deactivation."""
        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        try:
            deactivation = SuperAdminDeactivationRequest.objects.select_related(
                'target_account', 'initiated_by'
            ).get(confirmation_token_hash=token_hash, status='pending')
        except SuperAdminDeactivationRequest.DoesNotExist:
            return Response({'error': 'Invalid or expired confirmation token.'}, status=status.HTTP_400_BAD_REQUEST)

        if deactivation.is_expired():
            deactivation.status = 'expired'
            deactivation.save(update_fields=['status'])
            return Response({'error': 'This request has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        action = request.data.get('action')  # 'confirm' or 'reject'
        confirming_user = request.user if request.user.is_authenticated else None

        if confirming_user and confirming_user.pk == deactivation.initiated_by.pk:
            return Response(
                {'error': 'The initiator cannot confirm their own deactivation request.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action == 'confirm':
            # Deactivate the target
            target = deactivation.target_account
            target.is_active = False
            target.save(update_fields=['is_active'])

            deactivation.status = 'confirmed'
            deactivation.confirmed_by = confirming_user
            deactivation.resolved_at = timezone.now()
            deactivation.save(update_fields=['status', 'confirmed_by', 'resolved_at'])

            log_audit(
                request=request, user=confirming_user,
                action='SA deactivation confirmed',
                target=target.email,
                details=f'Confirmed by: {confirming_user.username if confirming_user else "via token"}, '
                        f'Initiated by: {deactivation.initiated_by.username}',
                status='success', category='security',
                event_type='sa.deactivation.confirmed',
            )

            notify(
                role_target='SUPER_ADMIN',
                title='Super Admin Account Deactivated',
                message=f'{target.email} has been deactivated (two-person authorisation complete)',
                notification_type='system', priority='critical',
                related_object_id=str(target.id),
                related_object_type='user',
                request=request,
            )

            return Response({'message': 'Deactivation confirmed. Account has been deactivated.'})

        elif action == 'reject':
            deactivation.status = 'rejected'
            deactivation.confirmed_by = confirming_user
            deactivation.resolved_at = timezone.now()
            deactivation.save(update_fields=['status', 'confirmed_by', 'resolved_at'])

            log_audit(
                request=request, user=confirming_user,
                action='SA deactivation rejected',
                target=deactivation.target_account.email,
                details=f'Rejected by: {confirming_user.username if confirming_user else "via token"}',
                status='success', category='security',
                event_type='sa.deactivation.rejected',
            )

            return Response({'message': 'Deactivation request rejected.'})

        return Response({'error': 'action must be "confirm" or "reject".'}, status=status.HTTP_400_BAD_REQUEST)


# ═══════════════════════════════════════════════════════════════════════════
#  SETUP ACCOUNT — FIRST LOGIN (public endpoint)
# ═══════════════════════════════════════════════════════════════════════════

class SetupAccountView(APIView):
    """Handle first-login: validate token, set password."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Validate setup token and return user info."""
        token = request.query_params.get('token')
        if not token:
            return Response({'error': 'Token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = credential_service.validate_setup_token(token)
        if not user:
            return Response(
                {'error': 'Invalid or expired setup token. Please contact your administrator.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({
            'full_name': user.get_full_name(),
            'email': user.email,
        })

    def post(self, request):
        """Set password and complete first login."""
        serializer = SetupAccountSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token = serializer.validated_data['token']
        password = serializer.validated_data['password']

        # Breach check
        is_breached = credential_service.check_password_breached(password)
        if is_breached is True:
            return Response(
                {'error': 'This password has appeared in a data breach. Please choose a different password.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = credential_service.validate_setup_token(token)
        if not user:
            return Response(
                {'error': 'Token expired during setup. Please contact your administrator.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        credential_service.complete_setup(user, password)

        log_audit(
            request=request, user=user,
            action='First login completed',
            target=user.email,
            details='Password set and account activated',
            status='success', category='credentials',
            event_type='first.login.completed',
        )

        notify(
            role_target='SUPER_ADMIN',
            title='Account Setup Completed',
            message=f'{user.get_full_name()} ({user.email}) completed first login.',
            notification_type='system', priority='info',
            related_object_id=str(user.id),
            related_object_type='user',
            request=request,
        )

        return Response({
            'message': 'Password set successfully. You can now log in.',
            'email': user.email,
            'username': user.username,
        })


# ═══════════════════════════════════════════════════════════════════════════
#  PERMISSION CONSTANTS ENDPOINT (for frontend)
# ═══════════════════════════════════════════════════════════════════════════

class PermissionConstantsView(APIView):
    """Return permission definitions for the frontend UI."""
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        from .permission_constants import PERMISSION_CATEGORIES
        return Response({
            'grantable_permissions': GRANTABLE_PERMISSIONS,
            'categories': PERMISSION_CATEGORIES,
        })


# ═══════════════════════════════════════════════════════════════════════════
#  PASSWORD RESET (kept as-is)
# ═══════════════════════════════════════════════════════════════════════════

class PasswordResetRequestView(APIView):
    """Request OTP-based password reset via email."""
    permission_classes = [permissions.AllowAny]

    RESEND_COOLDOWN_SECONDS = 60

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({
                'message': 'If an account with this email exists, an OTP has been sent.',
                'masked_email': mask_email(email),
            }, status=status.HTTP_200_OK)

        # Resend cooldown: prevent spam
        existing = PasswordResetToken.objects.filter(user=user).first()
        if existing and (timezone.now() - existing.created_at).total_seconds() < self.RESEND_COOLDOWN_SECONDS:
            remaining = int(self.RESEND_COOLDOWN_SECONDS - (timezone.now() - existing.created_at).total_seconds())
            return Response({
                'error': f'Please wait {remaining} seconds before requesting a new code.',
                'cooldown': remaining,
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Generate 6-digit OTP
        otp = f"{random.randint(100000, 999999)}"
        expires_at = timezone.now() + timedelta(minutes=15)

        # Save or update token (reset attempts on new OTP)
        PasswordResetToken.objects.update_or_create(
            user=user,
            defaults={'token': otp, 'expires_at': expires_at, 'attempts': 0}
        )

        # Send OTP email (try Celery broker first, fall back to synchronous)
        email_sent = False
        try:
            from notifications.tasks import send_password_reset_email
            try:
                send_password_reset_email.delay(email, otp, user.get_full_name() or user.username)
                email_sent = True
            except Exception:
                send_password_reset_email.apply(args=[email, otp, user.get_full_name() or user.username])
                email_sent = True
        except Exception as e:
            log_audit(
                request=request, user=user,
                action='Password reset OTP email failed',
                target=email,
                details=f'Email delivery failed: {str(e)}',
                status='failed', category='security',
            )

        if email_sent:
            log_audit(
                request=request, user=user,
                action='Password reset OTP sent',
                target=email,
                details='6-digit OTP sent via email',
                status='success', category='security',
            )

        return Response({
            'message': 'If an account with this email exists, an OTP has been sent.',
            'masked_email': mask_email(email),
        }, status=status.HTTP_200_OK)


class VerifyResetTokenView(APIView):
    """Verify 6-digit OTP with brute-force protection."""
    permission_classes = [permissions.AllowAny]

    MAX_ATTEMPTS = 5

    def post(self, request):
        otp = request.data.get('token', '').strip()
        email = request.data.get('email', '').strip()

        if not otp or not email:
            return Response({'error': 'OTP and email are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            reset_token = PasswordResetToken.objects.get(user=user)
        except (User.DoesNotExist, PasswordResetToken.DoesNotExist):
            return Response({'error': 'Invalid verification code'}, status=status.HTTP_400_BAD_REQUEST)

        # Check expiration
        if reset_token.expires_at < timezone.now():
            reset_token.delete()
            return Response({'error': 'Verification code has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        # Brute-force protection
        if reset_token.attempts >= self.MAX_ATTEMPTS:
            reset_token.delete()
            return Response({'error': 'Too many failed attempts. Please request a new code.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Verify OTP
        if reset_token.token != otp:
            reset_token.attempts += 1
            reset_token.save(update_fields=['attempts'])
            remaining = self.MAX_ATTEMPTS - reset_token.attempts
            return Response({
                'error': f'Invalid verification code. {remaining} attempt(s) remaining.',
            }, status=status.HTTP_400_BAD_REQUEST)

        return Response({'valid': True}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    """Confirm password reset with OTP and new password."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        otp = request.data.get('token', '').strip()
        email = request.data.get('email', '').strip()
        new_password = request.data.get('new_password')

        if not all([otp, email, new_password]):
            return Response({'error': 'OTP, email, and new password are required'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({'error': 'Password must be at least 8 characters long'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            reset_token = PasswordResetToken.objects.get(user=user, token=otp)
        except (User.DoesNotExist, PasswordResetToken.DoesNotExist):
            return Response({'error': 'Invalid verification code'}, status=status.HTTP_400_BAD_REQUEST)

        if reset_token.expires_at < timezone.now():
            reset_token.delete()
            return Response({'error': 'Verification code has expired'}, status=status.HTTP_400_BAD_REQUEST)

        # Reset password
        user.set_password(new_password)
        user.save()

        # Delete the token
        reset_token.delete()

        log_audit(
            request=request, user=user,
            action='Password reset completed',
            target=email,
            details='Password successfully reset via OTP',
            status='success', category='security',
        )

        # Notify user that password was changed
        notify(
            recipient=user,
            title='Password Changed',
            message='Your password was successfully reset. If you did not do this, contact support immediately.',
            notification_type='password_reset',
            priority='warning',
            request=request,
        )

        return Response({'message': 'Password has been reset successfully'}, status=status.HTTP_200_OK)
