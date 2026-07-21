# Generated data migration for reference_name backfill

from django.db import migrations


def backfill_reference_names(apps, schema_editor):
    """Generate reference_name for all existing IssuanceBatch records."""
    IssuanceBatch = apps.get_model('registry', 'IssuanceBatch')
    
    # Get all batches without a reference_name
    batches_without_ref = IssuanceBatch.objects.filter(reference_name__isnull=True).filter(reference_name='')
    
    # Group by year and assign sequential numbers
    for batch in batches_without_ref:
        year = batch.year if batch.year else (batch.confirmation_deadline.year if batch.confirmation_deadline else 2026)
        prefix = f'BATCH-{year}-'
        
        # Get the last reference_name for this year
        last = (
            IssuanceBatch.objects
            .filter(reference_name__startswith=prefix)
            .order_by('-reference_name')
            .values_list('reference_name', flat=True)
            .first()
        )
        
        next_seq = 1
        if last:
            try:
                next_seq = int(last.rsplit('-', 1)[1]) + 1
            except (ValueError, IndexError):
                next_seq = 1
        
        batch.reference_name = f'{prefix}{next_seq:04d}'
        batch.save(update_fields=['reference_name'])


class Migration(migrations.Migration):

    dependencies = [
        ('registry', '0009_update_reference_name_max_length'),
    ]

    operations = [
        migrations.RunPython(backfill_reference_names, migrations.RunPython.noop),
    ]
