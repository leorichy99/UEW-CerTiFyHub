from django.db import migrations, models

import hashlib
import uuid


def forwards(apps, schema_editor):
    AdminInvitation = apps.get_model('core', 'AdminInvitation')
    # Backfill token_hash: prefer existing token column if present, otherwise generate
    for inv in AdminInvitation.objects.all():
        raw = None
        # Try to read an existing 'token' attribute if available (UUIDField from older schema)
        try:
            raw_val = getattr(inv, 'token', None)
            if raw_val:
                # raw_val may be a UUID instance or string
                raw = str(raw_val)
        except Exception:
            raw = None

        if not raw:
            raw = uuid.uuid4().hex

        token_hash = hashlib.sha256(raw.encode('utf-8')).hexdigest()
        inv.token_hash = token_hash
        # save without touching other fields
        inv.save(update_fields=['token_hash'])


def backwards(apps, schema_editor):
    # Cannot recover raw tokens from hashes; leave token_hash as-is on rollback
    return


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_add_admin_invitation'),
    ]

    operations = [
        migrations.AddField(
            model_name='admininvitation',
            name='token_hash',
            field=models.CharField(max_length=64, unique=True, editable=False, null=True),
        ),
        migrations.RunPython(forwards, backwards),
        migrations.AlterField(
            model_name='admininvitation',
            name='token_hash',
            field=models.CharField(max_length=64, unique=True, editable=False, null=False),
        ),
    ]
