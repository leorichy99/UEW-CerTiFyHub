"""
Celery tasks for the registry pipeline.

The "happy path" for each is identical to the synchronous version that
already lives in the service layer; the task is a thin wrapper that
delegates to the service so we don't fork business logic between the two.

Tasks fall back to eager execution when ``REDIS_URL`` is unset (settings
forces ``CELERY_TASK_ALWAYS_EAGER = True`` in that case), so the rest of
the test suite continues to work without a running broker.
"""

import logging

from celery import shared_task

from registry.models import StudentRecord, IssuanceBatch

logger = logging.getLogger(__name__)


@shared_task(name='registry.send_confirmation_invitation',
             autoretry_for=(Exception,), retry_backoff=True,
             max_retries=3, retry_jitter=True)
def send_confirmation_invitation(record_id, raw_token):
    """Dispatch the publication-time invitation email for a single record.

    ``raw_token`` is the plaintext (URL-safe) token; it is never persisted.
    The hash is already on the record.
    """
    from registry.services.publication_service import PublicationService

    record = (
        StudentRecord.objects
        .select_related('batch')
        .filter(pk=record_id)
        .first()
    )
    if not record:
        logger.warning('send_confirmation_invitation: record %s not found', record_id)
        return None
    PublicationService()._dispatch_invitation(record.batch, record, raw_token)
    return str(record.id)


@shared_task(name='registry.issue_certificate_for_record',
             autoretry_for=(Exception,), retry_backoff=True,
             max_retries=2, retry_jitter=True)
def issue_certificate_for_record(record_id, actor_id):
    """Issue a single certificate. See IssuanceService._issue_one."""
    from django.contrib.auth.models import User
    from registry.services.issuance_service import IssuanceService

    record = (
        StudentRecord.objects
        .select_related('batch', 'batch__certificate_template')
        .filter(pk=record_id)
        .first()
    )
    if not record:
        logger.warning('issue_certificate_for_record: record %s not found', record_id)
        return None
    actor = User.objects.filter(pk=actor_id).first() if actor_id else None
    IssuanceService()._issue_one(record, actor=actor)
    return str(record.id)


@shared_task(name='registry.auto_close_expired_confirmation_windows')
def auto_close_expired_confirmation_windows():
    """Periodic sweep: close batches whose confirmation deadline has passed.

    Runs from Celery Beat (see ``CELERY_BEAT_SCHEDULE``). For each batch
    in ``PUBLISHED`` or ``CONFIRMATION_OPEN`` whose ``confirmation_deadline``
    is in the past, drives ``IssuanceService.close_confirmation`` which
    flags still-pending records and transitions the batch.
    """
    from django.utils import timezone
    from registry.services.issuance_service import IssuanceService, IssuanceError

    today = timezone.localdate()
    candidates = IssuanceBatch.objects.filter(
        status__in=[
            IssuanceBatch.STATUS_PUBLISHED,
            IssuanceBatch.STATUS_CONFIRMATION_OPEN,
        ],
        confirmation_deadline__lt=today,
    )
    closed = 0
    for batch in candidates:
        try:
            IssuanceService().close_confirmation(batch, actor=None)
            closed += 1
        except IssuanceError as exc:
            logger.warning(
                'auto_close: batch %s skipped: %s', batch.id, exc,
            )
    return {'closed': closed}


@shared_task(name='registry.complete_batch_if_done')
def complete_batch_if_done(batch_id, actor_id):
    """Auto-complete a batch once all issuance jobs have settled."""
    from django.contrib.auth.models import User
    from registry.services.issuance_service import IssuanceService, IssuanceError

    batch = IssuanceBatch.objects.filter(pk=batch_id).first()
    if not batch:
        return None
    actor = User.objects.filter(pk=actor_id).first() if actor_id else None
    try:
        IssuanceService().complete(batch, actor=actor)
        return 'completed'
    except IssuanceError:
        return 'still-outstanding'


@shared_task(name='registry.on_batch_emails_complete')
def on_batch_emails_complete(batch_id, actor_id):
    """Chord callback: fires once all confirmation emails for a batch finish.

    Reads actual delivery counts, publishes the completion event, and
    notifies admins if any failures occurred.
    """
    from registry.models import EmailDeliveryLog
    from registry.services.delivery_events import publish_delivery_complete
    from registry.services.delivery_service import EmailDeliveryService
    from registry.services import notifier

    batch = IssuanceBatch.objects.filter(pk=batch_id).first()
    if not batch:
        logger.warning('on_batch_emails_complete: batch %s not found', batch_id)
        return None

    summary = EmailDeliveryService().get_summary(batch)
    publish_delivery_complete(batch_id)

    ConfirmationAuditLog.objects.create(
        batch=batch, event_type='BATCH_EMAILS_COMPLETE',
        metadata=summary,
    )

    if summary['failed'] + summary['bounced'] > 0:
        notifier.delivery_failures_detected(
            batch,
            sent=summary['sent'],
            failed=summary['failed'],
            bounced=summary['bounced'],
        )

    return summary


@shared_task(name='registry.process_import_batch')
def process_import_batch(import_batch_id, temp_file_id, mapping, skip_invalid=False):
    """Celery task: process a full import file with field mapping."""
    import os
    from django.conf import settings
    from django.core.files.storage import default_storage
    from django.contrib.auth.models import User
    from registry.models import ImportBatch, IssuanceBatch
    from registry.services.import_service import ImportService, ImportRejected

    logger.info('Starting import_batch %s', import_batch_id)

    import_batch = ImportBatch.objects.filter(pk=import_batch_id).first()
    if not import_batch:
        logger.warning('process_import_batch: import_batch %s not found', import_batch_id)
        return None

    batch = import_batch.batch
    uploaded_by = import_batch.uploaded_by

    # Find temp file
    temp_path = None
    try:
        for fname in default_storage.listdir('temp_imports')[1]:
            if fname.startswith(temp_file_id):
                temp_path = f"temp_imports/{fname}"
                break
    except Exception:
        pass

    if not temp_path or not default_storage.exists(temp_path):
        ImportBatch.objects.filter(pk=import_batch_id).update(
            status=ImportBatch.STATUS_FAILED,
            error_log=[{'row': 0, 'field': '', 'message': 'Temporary file not found or expired.'}],
        )
        return None

    raw = default_storage.open(temp_path).read()
    file_name = os.path.basename(temp_path)

    def progress_callback(*, processed, total, valid, skipped, errors):
        from registry.services.import_events import publish_import_progress
        percent = int((processed / total) * 100) if total else 0
        publish_import_progress(
            import_batch_id,
            {
                'processed': processed,
                'total': total,
                'valid': valid,
                'skipped': skipped,
                'errors': errors,
                'percent': percent,
            },
        )

    try:
        ImportService().process_async(
            import_batch_id=import_batch_id,
            batch=batch,
            uploaded_by=uploaded_by,
            file_name=file_name,
            raw_bytes=raw,
            mapping=mapping,
            skip_invalid=skip_invalid,
            progress_callback=progress_callback,
        )
    except ImportRejected as e:
        ImportBatch.objects.filter(pk=import_batch_id).update(
            status=ImportBatch.STATUS_FAILED,
            error_log=[{'row': 0, 'field': '', 'message': str(e)}],
        )
        logger.warning('process_import_batch %s rejected: %s', import_batch_id, e)
        return None
    except Exception as e:
        ImportBatch.objects.filter(pk=import_batch_id).update(
            status=ImportBatch.STATUS_FAILED,
            error_log=[{'row': 0, 'field': '', 'message': str(e)}],
        )
        logger.exception('process_import_batch %s failed: %s', import_batch_id, e)
        return None
    finally:
        # Clean up temp file
        try:
            if default_storage.exists(temp_path):
                default_storage.delete(temp_path)
        except Exception:
            pass

    # Emit completion event
    from registry.services.import_events import publish_import_complete
    import_batch.refresh_from_db()
    publish_import_complete(import_batch_id, {
        'status': import_batch.status,
        'total_rows': import_batch.total_rows,
        'success_count': import_batch.success_count,
        'skipped_count': import_batch.skipped_count,
        'error_count': import_batch.error_count,
    })

    logger.info('Finished import_batch %s', import_batch_id)
    return import_batch_id


@shared_task(name='registry.cleanup_temp_imports')
def cleanup_temp_imports():
    """Periodic cleanup: remove temp import files older than 2 hours."""
    import os
    import time
    from django.conf import settings
    from django.core.files.storage import default_storage

    cutoff = time.time() - (2 * 3600)
    removed = 0
    try:
        _, files = default_storage.listdir('temp_imports')
        for fname in files:
            path = f"temp_imports/{fname}"
            try:
                mtime = default_storage.get_modified_time(path).timestamp()
                if mtime < cutoff:
                    default_storage.delete(path)
                    removed += 1
            except Exception:
                pass
    except Exception:
        pass

    logger.info('cleanup_temp_imports: removed %s files', removed)
    return {'removed': removed}
