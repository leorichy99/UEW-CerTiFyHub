from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('registry', '0011_enforce_reference_name_constraints'),
    ]

    operations = [
        migrations.RenameField(
            model_name='studentrecord',
            old_name='other_names',
            new_name='middle_name',
        ),
    ]
