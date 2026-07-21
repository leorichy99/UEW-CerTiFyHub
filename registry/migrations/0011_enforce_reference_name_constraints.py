# Generated migration to enforce reference_name constraints

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('registry', '0010_backfill_reference_names'),
    ]

    operations = [
        # Enforce not-null on reference_name
        migrations.AlterField(
            model_name='issuancebatch',
            name='reference_name',
            field=models.CharField(
                max_length=20,
                unique=True,
                blank=False,
                db_index=True,
                help_text='Human-friendly reference, auto-generated as BATCH-{year}-{NNNN}.'
            ),
        ),
    ]
