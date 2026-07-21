# Generated migration for verification token refactor

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('registry', '0008_disputeattachment'),
    ]

    operations = [
        # Change reference_name max_length from 32 to 20
        migrations.AlterField(
            model_name='issuancebatch',
            name='reference_name',
            field=models.CharField(
                max_length=20,
                unique=True,
                blank=True,
                db_index=True,
                help_text='Human-friendly reference, auto-generated as BATCH-{year}-{NNNN}.'
            ),
        ),
    ]
