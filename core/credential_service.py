"""
Credential delivery service for the provisioning system.

Generates one-time login links and sends credential delivery emails.
The Super Admin never sees the credential — it goes directly to the user.
"""

import hashlib
import secrets
import logging
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger('core.credentials')


def generate_credential(user):
    """
    Generate a one-time setup token for a provisioned account.

    Returns the raw token (for the email link). Only the SHA-256 hash
    is stored in the database.
    """
    raw_token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
    expires_at = timezone.now() + timedelta(hours=24)

    profile = user.profile
    profile.credential_token_hash = token_hash
    profile.credential_expires_at = expires_at
    profile.credential_status = 'delivered'
    profile.save(update_fields=[
        'credential_token_hash', 'credential_expires_at', 'credential_status',
    ])

    return raw_token


def send_credential_email(user, raw_token):
    """
    Send the credential delivery email with the one-time setup link.

    Email content follows the spec:
    - Greeting with full name
    - Statement about institutional authorisation
    - One-time login link with 24hr expiry
    - Instruction to set password
    - Statement about head-in-charge authority
    - Support contact
    - NO permissions or account type disclosed
    """
    setup_url = f"{settings.FRONTEND_URL}/setup-account/{raw_token}"
    full_name = user.get_full_name() or user.username

    subject = 'Your UEW CerTiFyHub Account Has Been Created'
    message = (
        f"Dear {full_name},\n\n"
        f"An account has been created for you on UEW CerTiFyHub under "
        f"institutional authorisation.\n\n"
        f"To activate your account, please click the link below and set your "
        f"password:\n\n"
        f"    {setup_url}\n\n"
        f"This link will expire in 24 hours. You must set a new password "
        f"immediately on first login before accessing any system function.\n\n"
        f"This account was provisioned under the authority of the head in "
        f"charge who approved your system access request, in accordance with "
        f"institutional policy.\n\n"
        f"If you did not expect this email or believe it was sent in error, "
        f"please contact the system administrator at "
        f"{getattr(settings, 'SUPPORT_EMAIL', settings.DEFAULT_FROM_EMAIL)}.\n\n"
        f"Best regards,\n"
        f"UEW CerTiFyHub System"
    )

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        logger.error(f'Failed to send credential email to {user.email}: {e}')
        return False


def validate_setup_token(raw_token):
    """
    Validate a one-time setup token.

    Returns the User if valid, or None if invalid/expired.
    """
    from .models import UserProfile

    token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

    try:
        profile = UserProfile.objects.select_related('user').get(
            credential_token_hash=token_hash,
            credential_status='delivered',
        )
    except UserProfile.DoesNotExist:
        return None

    if profile.credential_expires_at and profile.credential_expires_at < timezone.now():
        return None

    return profile.user


def complete_setup(user, new_password):
    """
    Complete the first-login process: set password, invalidate token,
    mark account as active.
    """
    user.set_password(new_password)
    user.is_active = True
    user.save(update_fields=['password', 'is_active'])

    profile = user.profile
    profile.credential_token_hash = ''
    profile.credential_expires_at = None
    profile.credential_status = 'completed'
    profile.first_login_completed = True
    profile.save(update_fields=[
        'credential_token_hash', 'credential_expires_at',
        'credential_status', 'first_login_completed',
    ])


def regenerate_credential(user):
    """
    Generate a new one-time token and send it. Used when the original
    credential expired without the user completing first login.
    """
    raw_token = generate_credential(user)
    email_sent = send_credential_email(user, raw_token)
    return raw_token, email_sent


def check_password_breached(password):
    """
    Check password against HaveIBeenPwned Passwords API using k-anonymity.

    Returns True if password is found in breach dataset, False if clean.
    Returns None if the API is unreachable (fail-open).
    """
    import hashlib
    import requests

    sha1 = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()
    prefix = sha1[:5]
    suffix = sha1[5:]

    try:
        resp = requests.get(
            f'https://api.pwnedpasswords.com/range/{prefix}',
            timeout=5,
            headers={'Add-Padding': 'true'},
        )
        if resp.status_code != 200:
            logger.warning(f'HIBP API returned status {resp.status_code}')
            return None

        for line in resp.text.splitlines():
            hash_suffix, count = line.split(':')
            if hash_suffix.strip() == suffix:
                return True
        return False
    except Exception as e:
        logger.warning(f'HIBP API check failed: {e}')
        return None
