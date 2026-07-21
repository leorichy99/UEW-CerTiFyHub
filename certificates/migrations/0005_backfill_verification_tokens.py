# Generated data migration for verification token backfill

from django.db import migrations
import secrets


def backfill_verification_tokens(apps, schema_editor):
    """Generate verification_token for all existing certificates."""
    Certificate = apps.get_model('certificates', 'Certificate')
    
    # Get all certificates without a verification_token
    certs_without_token = Certificate.objects.filter(verification_token__isnull=True)
    
    for cert in certs_without_token:
        # Generate unique token with collision handling
        max_attempts = 10
        for attempt in range(max_attempts):
            token = secrets.token_urlsafe(32)
            if not Certificate.objects.filter(verification_token=token).exists():
                cert.verification_token = token
                cert.save(update_fields=['verification_token'])
                break
        else:
            # Log warning if we couldn't generate a unique token after max attempts
            print(f"Warning: Could not generate unique token for certificate {cert.id}")


class Migration(migrations.Migration):

    dependencies = [
        ('certificates', '0004_add_verification_token'),
    ]

    operations = [
        migrations.RunPython(backfill_verification_tokens, migrations.RunPython.noop),
    ]
