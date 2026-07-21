# Generated migration for verification token refactor

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('registry', '0008_disputeattachment'),
        ('certificates', '0003_certificate_revocation_reason_certificate_revoked_at_and_more'),
    ]

    operations = [
        # Add verification_token field as nullable initially
        migrations.AddField(
            model_name='certificate',
            name='verification_token',
            field=models.CharField(
                max_length=64,
                unique=False,  # Will enforce uniqueness in Migration 3
                db_index=True,
                null=True,
                blank=True,
                help_text='Cryptographic token for QR code-based verification'
            ),
        ),
        # Change issuance_batch on_delete from SET_NULL to PROTECT
        migrations.AlterField(
            model_name='certificate',
            name='issuance_batch',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='certificates',
                to='registry.issuancebatch',
                null=True,  # Will enforce not-null in Migration 3
                blank=True
            ),
        ),
        # issuance_run already has correct on_delete=SET_NULL, no change needed
    ]
