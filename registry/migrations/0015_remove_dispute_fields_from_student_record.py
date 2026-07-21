from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('registry', '0014_migrate_disputes_to_model'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='studentrecord',
            name='dispute_note',
        ),
        migrations.RemoveField(
            model_name='studentrecord',
            name='dispute_submitted_at',
        ),
        migrations.RemoveField(
            model_name='studentrecord',
            name='dispute_resolved_at',
        ),
        migrations.RemoveField(
            model_name='studentrecord',
            name='dispute_resolved_by',
        ),
        migrations.RemoveField(
            model_name='studentrecord',
            name='dispute_resolution_note',
        ),
    ]
