# Generated manually — removes ceremony fields from Congregation and CongregationSession.

from django.db import migrations, models


def delete_all_sessions(apps, schema_editor):
    """Delete all sessions (and their dependent records) before dropping ceremony fields."""
    CongregationSession = apps.get_model('registry', 'CongregationSession')
    CongregationSession.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('registry', '0009_finalize_ceremony_dates'),
    ]

    operations = [
        migrations.RunPython(delete_all_sessions),
        migrations.RemoveField(
            model_name='congregation',
            name='ceremony_month',
        ),
        migrations.RemoveField(
            model_name='congregationsession',
            name='ceremony_start_date',
        ),
        migrations.RemoveField(
            model_name='congregationsession',
            name='ceremony_end_date',
        ),
        migrations.RemoveIndex(
            model_name='congregationsession',
            name='registry_co_ceremon_9f6ba4_idx',
        ),
        migrations.RemoveIndex(
            model_name='congregationsession',
            name='registry_co_ceremon_348540_idx',
        ),
    ]
