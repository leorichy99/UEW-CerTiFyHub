"""
Celery tasks for notification delivery.
"""

import logging
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger('notifications')


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_notification_email(self, notification_id):
    """Send email for a notification."""
    from .models import Notification

    try:
        notification = Notification.objects.select_related('recipient').get(id=notification_id)
    except Notification.DoesNotExist:
        logger.error(f'Notification {notification_id} not found for email delivery')
        return

    if not notification.recipient or not notification.recipient.email:
        logger.info(f'No email recipient for notification {notification_id}')
        return

    try:
        send_mail(
            subject=f'[UEW CerTiFyHub] {notification.title}',
            message=notification.message or notification.title,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[notification.recipient.email],
            fail_silently=False,
        )
        logger.info(f'Email sent for notification {notification_id}')
    except Exception as exc:
        logger.error(f'Email failed for notification {notification_id}: {exc}')
        raise self.retry(exc=exc)


@shared_task
def send_daily_digest():
    """Send daily digest emails to users who prefer it."""
    from .models import Notification, NotificationPreference
    from django.contrib.auth.models import User

    prefs = NotificationPreference.objects.filter(
        digest_mode='daily_digest', email_enabled=True
    ).select_related('user')

    for pref in prefs:
        unread = Notification.objects.filter(
            recipient=pref.user, is_read=False, is_archived=False
        ).order_by('-created_at')[:20]

        if not unread.exists():
            continue

        lines = [f'- [{n.get_priority_display()}] {n.title}' for n in unread]
        body = (
            f'Hi {pref.user.first_name or pref.user.username},\n\n'
            f'You have {unread.count()} unread notifications:\n\n'
            + '\n'.join(lines)
            + '\n\nLog in to view details: '
            + settings.FRONTEND_URL
        )

        try:
            send_mail(
                subject=f'[UEW CerTiFyHub] Daily Notification Digest',
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[pref.user.email],
                fail_silently=False,
            )
        except Exception as exc:
            logger.error(f'Daily digest email failed for {pref.user.username}: {exc}')


@shared_task
def cleanup_old_notifications():
    """Archive notifications older than 90 days."""
    from .models import Notification
    from django.utils import timezone
    from datetime import timedelta

    cutoff = timezone.now() - timedelta(days=90)
    count = Notification.objects.filter(
        created_at__lt=cutoff, is_archived=False
    ).update(is_archived=True)
    logger.info(f'Archived {count} old notifications')


@shared_task
def check_expired_credentials():
    """Mark unclaimed credential tokens as expired after their expiry window."""
    from core.models import UserProfile
    from django.utils import timezone

    expired = UserProfile.objects.filter(
        credential_status='delivered',
        credential_expires_at__lt=timezone.now(),
    ).update(
        credential_status='expired',
        credential_token_hash='',
    )
    if expired:
        logger.info(f'Expired {expired} unclaimed credential tokens')


@shared_task
def check_temporary_account_expiry():
    """Deactivate temporary accounts past their expiry date and notify SA."""
    from core.models import UserProfile
    from django.utils import timezone
    from analytics.utils import log_audit

    expired_profiles = UserProfile.objects.filter(
        account_type='temporary',
        account_expires_at__lt=timezone.now(),
        user__is_active=True,
    ).select_related('user')

    count = 0
    for profile in expired_profiles:
        profile.user.is_active = False
        profile.user.save(update_fields=['is_active'])
        count += 1

        log_audit(
            request=None,
            user=profile.user,
            action='Temporary account expired and deactivated',
            target=profile.user.email,
            details=f'Expired at {profile.account_expires_at}',
            status='success',
            category='provisioning',
        )

        from notifications.services import notify
        notify(
            role_target='SUPER_ADMIN',
            title='Temporary Account Expired',
            message=f'Account for {profile.user.get_full_name() or profile.user.email} '
                    f'has been automatically deactivated (temporary access expired).',
            notification_type='system',
            priority='warning',
        )

    if count:
        logger.info(f'Deactivated {count} expired temporary accounts')


@shared_task
def verify_audit_chain_integrity():
    """Verify the SHA-256 hash chain of the audit log for tampering detection."""
    import hashlib
    from analytics.models import AuditLog

    logs = AuditLog.objects.order_by('id')
    previous_hash = ''
    broken_at = None

    for log_entry in logs.iterator(chunk_size=500):
        payload = (
            f'{log_entry.id}|{log_entry.timestamp.isoformat()}|'
            f'{log_entry.action}|{log_entry.user_id}|{log_entry.target}|'
            f'{previous_hash}'
        )
        expected_hash = hashlib.sha256(payload.encode('utf-8')).hexdigest()

        if log_entry.integrity_hash and log_entry.integrity_hash != expected_hash:
            broken_at = log_entry.id
            break

        previous_hash = log_entry.integrity_hash or expected_hash

    if broken_at:
        logger.critical(f'AUDIT CHAIN BROKEN at log entry {broken_at}')
        from notifications.services import notify
        notify(
            role_target='SUPER_ADMIN',
            title='Audit Log Integrity Alert',
            message=f'Hash chain verification failed at audit entry #{broken_at}. '
                    f'This may indicate tampering. Investigate immediately.',
            notification_type='system',
            priority='critical',
        )
    else:
        logger.info('Audit chain integrity verified — no tampering detected')


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_password_reset_email(self, email, otp, first_name=''):
    """Send a password reset OTP email asynchronously."""
    subject = 'Your Password Reset Code - UEW CerTiFyHub'
    message = (
        f'Hello {first_name or ""},\n\n'
        f'Your password reset verification code is:\n\n'
        f'    {otp}\n\n'
        f'This code will expire in 15 minutes.\n\n'
        f'If you did not request this, please ignore this email.\n\n'
        f'Best regards,\n'
        f'UEW CerTiFyHub Team'
    )

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        logger.info(f'Password reset email sent to {email}')
    except Exception as exc:
        logger.error(f'Password reset email failed for {email}: {exc}')
        if not self.request.is_eager:
            raise self.retry(exc=exc)
        else:
            raise
