from django.db import migrations


def _heuristic_parse_name(full_name):
    """Best-effort split: first word = first_name, last word = last_name, middle = middle_name."""
    if not full_name:
        return '', '', ''
    parts = full_name.strip().split()
    if len(parts) == 1:
        return parts[0], '', ''  # Only first name, log for manual review
    elif len(parts) == 2:
        return parts[0], '', parts[1]  # First and last, no middle
    else:
        return parts[0], ' '.join(parts[1:-1]), parts[-1]  # First, middle, last


def backfill_name_components(apps, schema_editor):
    """Populate first_name, middle_name, last_name from existing full_name values."""
    StudentRecord = apps.get_model('registry', 'StudentRecord')

    # Find records with empty name components but non-empty full_name
    records_to_update = StudentRecord.objects.filter(
        full_name__isnull=False
    ).exclude(full_name='').filter(
        first_name=''
    ).filter(middle_name='').filter(last_name='')

    updated_count = 0
    single_name_records = []

    for record in records_to_update:
        first, middle, last = _heuristic_parse_name(record.full_name)
        record.first_name = first
        record.middle_name = middle
        record.last_name = last
        record.name_order = ['first_name', 'middle_name', 'last_name']
        record.save(update_fields=['first_name', 'middle_name', 'last_name', 'name_order'])
        updated_count += 1

        if not last:
            single_name_records.append(f"{record.index_number}: {record.full_name}")

    # Log single-name records for manual review
    if single_name_records:
        print(f"\n⚠️  {len(single_name_records)} records have only one name component (no last name):")
        for rec in single_name_records[:10]:  # Show first 10
            print(f"  - {rec}")
        if len(single_name_records) > 10:
            print(f"  ... and {len(single_name_records) - 10} more")

    print(f"\n✓ Backfilled name components for {updated_count} records.")


def reverse_backfill(apps, schema_editor):
    """Reverse: clear name components."""
    StudentRecord = apps.get_model('registry', 'StudentRecord')
    StudentRecord.objects.update(
        first_name='',
        middle_name='',
        last_name='',
        name_order=[]
    )


class Migration(migrations.Migration):

    dependencies = [
        ('registry', '0015_remove_dispute_fields_from_student_record'),
    ]

    operations = [
        migrations.RunPython(backfill_name_components, reverse_backfill),
    ]
