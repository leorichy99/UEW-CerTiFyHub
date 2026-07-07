import re
from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import AuthenticationFailed
from .models import UserProfile, AuthorisationReference
from .permission_constants import (
    GRANTABLE_PERMISSIONS, ALL_GRANTABLE_KEYS, PERMISSION_CATEGORIES,
    build_default_permissions,
)

UserModel = get_user_model()


# ── Profile & User Serializers ───────────────────────────────────────────

class UserProfileSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'role', 'phone_number', 'organization', 'staff_id', 'department',
            'account_type', 'access_duration', 'access_end_date',
            'permissions', 'is_legacy', 'first_login_completed',
            'credential_status', 'avatar',
        ]

    def get_avatar(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile']


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating current user's profile."""
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'username', 'email', 'avatar']
        read_only_fields = ['email']

    def update(self, instance, validated_data):
        profile_data = {}
        if 'avatar' in self.initial_data:
            profile_data['avatar'] = self.initial_data.get('avatar')

        for attr in ['first_name', 'last_name', 'username']:
            if attr in validated_data:
                setattr(instance, attr, validated_data[attr])
        instance.save()

        if profile_data and hasattr(instance, 'profile'):
            if profile_data.get('avatar'):
                instance.profile.avatar = profile_data['avatar']
            instance.profile.save()

        return instance


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for changing user password."""
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value


# ── Authorisation Reference Serializers ──────────────────────────────────

class AuthorisationReferenceSerializer(serializers.ModelSerializer):
    logged_by_name = serializers.SerializerMethodField()
    linked_account_email = serializers.SerializerMethodField()

    class Meta:
        model = AuthorisationReference
        fields = [
            'id', 'reference_number', 'requester_name', 'requester_staff_id',
            'authorising_head_name', 'authorising_head_title',
            'authorising_head_department', 'approval_date', 'intake_date',
            'scanned_letter', 'purpose', 'status', 'linked_account',
            'linked_account_email', 'logged_by_name', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'intake_date', 'logged_by_name', 'created_at', 'updated_at',
            'linked_account', 'linked_account_email',
        ]

    def get_logged_by_name(self, obj):
        if obj.logged_by:
            return obj.logged_by.get_full_name() or obj.logged_by.username
        return ''

    def get_linked_account_email(self, obj):
        if obj.linked_account:
            return obj.linked_account.email
        return None


class AuthorisationReferenceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuthorisationReference
        fields = [
            'reference_number', 'requester_name', 'requester_staff_id',
            'authorising_head_name', 'authorising_head_title',
            'authorising_head_department', 'approval_date',
            'scanned_letter', 'purpose', 'notes',
        ]

    def validate_reference_number(self, value):
        # Validate format: CERT-YYYY-STAFFID
        if not re.match(r'^CERT-\d{4}-.+$', value):
            raise serializers.ValidationError(
                "Reference number must follow format: CERT-YYYY-STAFFID (e.g. CERT-2025-AB1234)"
            )
        return value


# ── Account Provisioning Serializers ─────────────────────────────────────

class AccountProvisionSerializer(serializers.Serializer):
    """Validates account creation data from the Super Admin."""
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    staff_id = serializers.CharField(max_length=50)
    department = serializers.CharField(max_length=255)
    account_type = serializers.ChoiceField(choices=UserProfile.ACCOUNT_TYPE_CHOICES)
    access_duration = serializers.ChoiceField(choices=UserProfile.ACCESS_DURATION_CHOICES)
    access_end_date = serializers.DateField(required=False, allow_null=True)
    permissions = serializers.DictField(child=serializers.BooleanField(), required=True)

    def validate_email(self, value):
        # TODO: Re-enable for production
        # if not value.lower().endswith('@uew.edu.gh'):
        #     raise serializers.ValidationError(
        #         "Institutional email must be an @uew.edu.gh address."
        #     )
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )
        return value.lower()

    def validate_staff_id(self, value):
        if UserProfile.objects.filter(staff_id=value).exclude(staff_id='').exists():
            raise serializers.ValidationError(
                "An active account with this staff ID already exists."
            )
        return value

    def validate_permissions(self, value):
        # Only grantable permissions allowed
        invalid_keys = set(value.keys()) - ALL_GRANTABLE_KEYS
        if invalid_keys:
            raise serializers.ValidationError(
                f"Invalid permission keys: {', '.join(invalid_keys)}"
            )
        # At least one permission must be enabled
        if not any(value.values()):
            raise serializers.ValidationError(
                "At least one permission must be enabled."
            )
        return value

    def validate(self, data):
        if data.get('access_duration') == 'time_limited':
            if not data.get('access_end_date'):
                raise serializers.ValidationError({
                    'access_end_date': 'End date is required for time-limited access.'
                })
            from django.utils import timezone
            if data['access_end_date'] <= timezone.now().date():
                raise serializers.ValidationError({
                    'access_end_date': 'End date must be in the future.'
                })
        return data


class AccountDetailSerializer(serializers.ModelSerializer):
    """Full account detail for the management interface."""
    full_name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(read_only=True)
    staff_id = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    account_type = serializers.SerializerMethodField()
    access_duration = serializers.SerializerMethodField()
    access_end_date = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    permission_history = serializers.SerializerMethodField()
    is_legacy = serializers.SerializerMethodField()
    first_login_completed = serializers.SerializerMethodField()
    credential_status = serializers.SerializerMethodField()
    letter_reference_number = serializers.SerializerMethodField()
    authorisation_references = serializers.SerializerMethodField()
    is_locked = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'full_name', 'email', 'role', 'is_active', 'date_joined',
            'staff_id', 'department', 'account_type', 'access_duration',
            'access_end_date', 'permissions', 'permission_history',
            'is_legacy', 'first_login_completed', 'credential_status',
            'letter_reference_number', 'authorisation_references', 'is_locked',
        ]

    def _profile(self, obj):
        return getattr(obj, 'profile', None)

    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name or obj.username

    def get_role(self, obj):
        p = self._profile(obj)
        return p.role if p else ('SUPER_ADMIN' if obj.is_superuser else 'ADMIN')

    def get_staff_id(self, obj):
        p = self._profile(obj)
        return p.staff_id if p else ''

    def get_department(self, obj):
        p = self._profile(obj)
        return p.department if p else ''

    def get_account_type(self, obj):
        p = self._profile(obj)
        return p.account_type if p else 'STAFF'

    def get_access_duration(self, obj):
        p = self._profile(obj)
        return p.access_duration if p else 'permanent'

    def get_access_end_date(self, obj):
        p = self._profile(obj)
        return p.access_end_date if p else None

    def get_permissions(self, obj):
        p = self._profile(obj)
        return p.permissions if p else build_default_permissions()

    def get_permission_history(self, obj):
        p = self._profile(obj)
        return p.permission_history if p else []

    def get_is_legacy(self, obj):
        p = self._profile(obj)
        return p.is_legacy if p else True

    def get_first_login_completed(self, obj):
        p = self._profile(obj)
        return p.first_login_completed if p else True

    def get_credential_status(self, obj):
        p = self._profile(obj)
        return p.credential_status if p else 'completed'

    def get_letter_reference_number(self, obj):
        p = self._profile(obj)
        if p and p.letter_reference:
            return p.letter_reference.reference_number
        return None

    def get_authorisation_references(self, obj):
        refs = obj.authorisation_references.all()
        return AuthorisationReferenceSerializer(refs, many=True).data if refs.exists() else []

    def get_is_locked(self, obj):
        from .models import LoginAttemptTracker
        try:
            email_hash = LoginAttemptTracker.hash_email(obj.email)
            tracker = LoginAttemptTracker.objects.get(email_hash=email_hash)
            return tracker.is_locked()
        except LoginAttemptTracker.DoesNotExist:
            return False


class PermissionUpdateSerializer(serializers.Serializer):
    """Validates permission changes (add/remove)."""
    permissions = serializers.DictField(child=serializers.BooleanField())
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate_permissions(self, value):
        invalid_keys = set(value.keys()) - ALL_GRANTABLE_KEYS
        if invalid_keys:
            raise serializers.ValidationError(
                f"Invalid permission keys: {', '.join(invalid_keys)}"
            )
        return value


# ── Setup Account (First Login) Serializer ───────────────────────────────

class SetupAccountSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=12)
    password_confirm = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords do not match.")

        password = data['password']
        # Enforce: uppercase, lowercase, number, special char
        if not re.search(r'[A-Z]', password):
            raise serializers.ValidationError(
                "Password must contain at least one uppercase letter."
            )
        if not re.search(r'[a-z]', password):
            raise serializers.ValidationError(
                "Password must contain at least one lowercase letter."
            )
        if not re.search(r'\d', password):
            raise serializers.ValidationError(
                "Password must contain at least one number."
            )
        if not re.search(r'[^A-Za-z0-9]', password):
            raise serializers.ValidationError(
                "Password must contain at least one special character."
            )
        return data

    def validate_token(self, value):
        from .credential_service import validate_setup_token
        user = validate_setup_token(value)
        if not user:
            raise serializers.ValidationError(
                "Invalid or expired setup token. Please contact your administrator."
            )
        return value


# ── JWT Serializer (with lockout integration) ────────────────────────────

class EmailOrUsernameTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Allow users to authenticate using either username or email in the 'username' field."""

    def validate(self, attrs):
        username = attrs.get('username')
        if username and '@' in username:
            try:
                user = UserModel.objects.get(email__iexact=username)
                if not user.is_active:
                    raise AuthenticationFailed("Invalid credentials.")
                attrs['username'] = user.username
            except UserModel.DoesNotExist:
                pass
        else:
            try:
                user = UserModel.objects.get(username=username)
                if not user.is_active:
                    raise AuthenticationFailed("Invalid credentials.")
            except UserModel.DoesNotExist:
                pass
        return super().validate(attrs)
