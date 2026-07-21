from django.db import migrations
import json


def migrate_disputes(apps, schema_editor):
    """Migrate existing dispute data from StudentRecord to Dispute model."""
    StudentRecord = apps.get_model('registry', 'StudentRecord')
    Dispute = apps.get_model('registry', 'Dispute')

    # Find all records with dispute data
    records_with_disputes = StudentRecord.objects.filter(
        dispute_note__isnull=False
    ).exclude(dispute_note='')

    for record in records_with_disputes:
        try:
            # Try to parse dispute_note as JSON (current structured format)
            dispute_data = json.loads(record.dispute_note)
        except (json.JSONDecodeError, TypeError):
            # If not valid JSON, treat as plain text (legacy format)
            dispute_data = None

        # Create Dispute record
        dispute = Dispute(
            student_record=record,
            dispute_type=Dispute.OTHER,  # Default to OTHER for legacy disputes
            dispute_note=record.dispute_note if not dispute_data else dispute_data.get('note', record.dispute_note),
            created_at=record.dispute_submitted_at,
            is_pending=record.confirmation_status == StudentRecord.CONF_DISPUTED,
        )

        # If structured data exists, try to extract dispute type
        if dispute_data and isinstance(dispute_data, dict):
            disputes_list = dispute_data.get('disputes', [])
            if disputes_list and isinstance(disputes_list, list) and len(disputes_list) > 0:
                first_dispute = disputes_list[0]
                if isinstance(first_dispute, dict):
                    field = first_dispute.get('field')
                    if field == 'full_name':
                        dispute.dispute_type = Dispute.NAME_INCORRECT
                    elif field == 'programme':
                        dispute.dispute_type = Dispute.PROGRAMME_INCORRECT
                    elif field == 'class_of_degree':
                        dispute.dispute_type = Dispute.CLASS_OF_DEGREE_INCORRECT

        dispute.save()


def reverse_migrate_disputes(apps, schema_editor):
    """Reverse: delete all Dispute records created by this migration."""
    Dispute = apps.get_model('registry', 'Dispute')
    Dispute.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('registry', '0013_create_dispute_model'),
    ]

    operations = [
        migrations.RunPython(migrate_disputes, reverse_migrate_disputes),
    ]
