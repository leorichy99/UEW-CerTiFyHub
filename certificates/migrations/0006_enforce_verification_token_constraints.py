# Generated migration to enforce verification_token constraints

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('certificates', '0005_backfill_verification_tokens'),
    ]

    operations = [
        # Enforce unique constraint on verification_token
        migrations.AlterField(
            model_name='certificate',
            name='verification_token',
            field=models.CharField(
                max_length=64,
                unique=True,
                db_index=True,
                null=False,  # Now not-null
                blank=False,
                help_text='Cryptographic token for QR code-based verification'
            ),
        ),
        # Enforce not-null on issuance_batch
        migrations.AlterField(
            model_name='certificate',
            name='issuance_batch',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='certificates',
                to='registry.issuancebatch',
                null=False,  # Now not-null
                blank=False
            ),
        ),
    ]
