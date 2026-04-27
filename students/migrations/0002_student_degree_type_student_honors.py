# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='student',
            name='degree_type',
            field=models.CharField(
                blank=True,
                choices=[
                    ('BED', 'Bachelor of Education'),
                    ('BA', 'Bachelor of Arts'),
                    ('BSC', 'Bachelor of Science'),
                    ('BBA', 'Bachelor of Business Administration'),
                    ('MPHIL', 'Master of Philosophy'),
                    ('MED', 'Master of Education'),
                    ('MBA', 'Master of Business Administration'),
                    ('MA', 'Master of Arts'),
                    ('PHD', 'Doctor of Philosophy'),
                ],
                default='BSC',
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='student',
            name='honors',
            field=models.CharField(
                blank=True,
                choices=[
                    ('FIRST', 'FIRST CLASS HONOURS'),
                    ('SECOND_UPPER', 'SECOND CLASS HONOURS (Upper Division)'),
                    ('SECOND_LOWER', 'SECOND CLASS HONOURS (Lower Division)'),
                    ('THIRD', 'THIRD CLASS HONOURS'),
                    ('PASS', 'PASS'),
                ],
                default='PASS',
                max_length=20,
            ),
        ),
    ]
