from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('registry', '0012_rename_other_names_to_middle_name'),
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Dispute',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('dispute_type', models.CharField(choices=[('name_incorrect', 'Name is incorrect'), ('programme_incorrect', 'Programme is incorrect'), ('class_of_degree_incorrect', 'Class of degree is incorrect'), ('other', 'Other')], help_text='Type of dispute being raised', max_length=30)),
                ('claimed_first_name', models.CharField(blank=True, max_length=100, null=True)),
                ('claimed_middle_name', models.CharField(blank=True, max_length=100, null=True)),
                ('claimed_last_name', models.CharField(blank=True, max_length=100, null=True)),
                ('claimed_value', models.CharField(blank=True, max_length=500, null=True)),
                ('dispute_note', models.TextField(blank=True)),
                ('supporting_document', models.FileField(blank=True, help_text='ID proof document for name disputes', null=True, upload_to='dispute_documents/')),
                ('supporting_document_filename', models.CharField(blank=True, help_text='Original filename for display', max_length=255, null=True)),
                ('is_pending', models.BooleanField(default=True, help_text='True until resolved')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('resolved_at', models.DateTimeField(blank=True, null=True)),
                ('resolution_note', models.TextField(blank=True)),
                ('resolved_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='resolved_disputes', to='auth.user')),
                ('student_record', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='disputes', to='registry.studentrecord')),
            ],
            options={
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['student_record', 'is_pending'], name='registry_d_student__is_pe_idx'),
                    models.Index(fields=['dispute_type', 'is_pending'], name='registry_d_dispute__is_pe_idx'),
                ],
            },
        ),
    ]
