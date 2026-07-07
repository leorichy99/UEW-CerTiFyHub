from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('registry', '0004_add_name_components'),
    ]

    operations = [
        migrations.AddField(
            model_name='importbatch',
            name='original_file_name',
            field=models.CharField(blank=True, default='', max_length=512),
        ),
    ]
