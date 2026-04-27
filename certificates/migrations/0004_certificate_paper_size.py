from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('certificates', '0003_certificate_status_certificate_student_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='certificate',
            name='paper_size',
            field=models.CharField(
                blank=True,
                choices=[('A4', 'A4 (210 × 297 mm)'), ('LETTER', 'Letter (8.5 × 11 in)'), ('A3', 'A3 (297 × 420 mm)')],
                default='A4',
                max_length=10,
            ),
        ),
    ]
