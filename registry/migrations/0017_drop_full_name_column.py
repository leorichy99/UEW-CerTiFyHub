from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('registry', '0016_backfill_name_components'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='studentrecord',
            name='full_name',
        ),
    ]
