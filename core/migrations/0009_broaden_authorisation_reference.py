from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def migrate_provisioned_to_used(apps, schema_editor):
    """Convert existing 'provisioned' status values to 'used'."""
    AuthorisationReference = apps.get_model('core', 'AuthorisationReference')
    AuthorisationReference.objects.filter(status='provisioned').update(status='used')


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('core', '0008_loginattempttracker_superadmindeactivationrequest_and_more'),
    ]

    operations = [
        # 1. Add 'purpose' field
        migrations.AddField(
            model_name='authorisationreference',
            name='purpose',
            field=models.CharField(
                choices=[('provision', 'Account Provisioning'), ('permission_change', 'Permission Change')],
                default='provision',
                help_text='What this authorisation letter is for',
                max_length=30,
            ),
        ),
        # 2. Rename provisioning_status → status
        migrations.RenameField(
            model_name='authorisationreference',
            old_name='provisioning_status',
            new_name='status',
        ),
        # 3. Migrate existing 'provisioned' → 'used'
        migrations.RunPython(migrate_provisioned_to_used, migrations.RunPython.noop),
        # 4. Update status choices (provisioned → used)
        migrations.AlterField(
            model_name='authorisationreference',
            name='status',
            field=models.CharField(
                choices=[('pending', 'Pending'), ('used', 'Used'), ('cancelled', 'Cancelled')],
                default='pending',
                max_length=20,
            ),
        ),
        # 4. Rename provisioned_account → linked_account and change OneToOne → ForeignKey
        migrations.RemoveField(
            model_name='authorisationreference',
            name='provisioned_account',
        ),
        migrations.AddField(
            model_name='authorisationreference',
            name='linked_account',
            field=models.ForeignKey(
                blank=True,
                help_text='Account this reference was used for',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='authorisation_references',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        # 5. Remove old index on provisioning_status and add new indexes
        migrations.RemoveIndex(
            model_name='authorisationreference',
            name='core_author_provisi_5f0152_idx',
        ),
        migrations.AddIndex(
            model_name='authorisationreference',
            index=models.Index(fields=['status', '-created_at'], name='core_author_status_idx'),
        ),
        migrations.AddIndex(
            model_name='authorisationreference',
            index=models.Index(fields=['purpose'], name='core_author_purpose_idx'),
        ),
    ]
