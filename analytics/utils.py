import hashlib
import logging
from .models import AuditLog

logger = logging.getLogger('analytics')


def get_client_ip(request):
    """Extract client IP from request, handling proxies."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def _compute_entry_hash(action, target, details, timestamp_str, previous_hash):
    """Compute SHA-256 hash for tamper-evident chain."""
    payload = f"{action}|{target}|{details}|{timestamp_str}|{previous_hash}"
    return hashlib.sha256(payload.encode('utf-8')).hexdigest()


def log_audit(request=None, user=None, action='', target='', details='',
              status='success', category='admin', ip_address=None,
              event_type='', letter_reference=''):
    """
    Create a tamper-evident AuditLog entry with hash chaining.

    Can be called with a request object (preferred) or with explicit user/ip.
    """
    if request and not user:
        user = request.user if hasattr(request, 'user') and request.user.is_authenticated else None
    if request and not ip_address:
        ip_address = get_client_ip(request)

    username = ''
    if user and hasattr(user, 'username'):
        username = user.username
    elif user:
        username = str(user)

    try:
        # Get the hash of the most recent entry for chaining
        last_entry = AuditLog.objects.order_by('-pk').values_list('entry_hash', flat=True).first()
        previous_hash = last_entry or ''

        from django.utils import timezone as tz
        now_str = tz.now().isoformat()
        entry_hash = _compute_entry_hash(action, target, details, now_str, previous_hash)

        AuditLog.objects.create(
            user=user if user and hasattr(user, 'pk') else None,
            username=username or 'System',
            action=action,
            target=target,
            details=details,
            ip_address=ip_address,
            status=status,
            category=category,
            event_type=event_type,
            letter_reference=letter_reference,
            previous_hash=previous_hash,
            entry_hash=entry_hash,
        )
    except Exception as e:
        # Never let audit logging break the main flow
        logger.error(f'Failed to create audit log: {e}')
