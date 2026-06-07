"""Slice 1 step 1/3 — add Congregation table and nullable session/record fields."""

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('registry', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Congregation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False,
                                        primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('year', models.PositiveIntegerField(
                    unique=True,
                    help_text='Academic/calendar year of the congregation. Only one per year.')),
                ('ceremony_month', models.DateField(
                    help_text='Calendar month of the ceremony. Day component is normalised to 1.')),
                ('description', models.CharField(blank=True, max_length=500)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='created_congregations',
                    to=settings.AUTH_USER_MODEL)),
                ('sourced_from_congregation', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='derived_congregations',
                    to='registry.congregation',
                    help_text='Populated when this congregation was created from a template.')),
            ],
            options={
                'ordering': ['-year'],
            },
        ),
        migrations.AddIndex(
            model_name='congregation',
            index=models.Index(fields=['year'], name='registry_co_year_00c214_idx'),
        ),
        # ── CongregationSession: new fields (all nullable for backfill phase) ─
        migrations.AddField(
            model_name='congregationsession',
            name='congregation',
            field=models.ForeignKey(
                null=True, blank=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='sessions', to='registry.congregation',
                help_text='Parent congregation. Non-null after migration 0004.'),
        ),
        migrations.AddField(
            model_name='congregationsession',
            name='session_number',
            field=models.PositiveSmallIntegerField(
                default=1,
                help_text='Ordinal position of this session within its congregation.'),
        ),
        migrations.AddField(
            model_name='congregationsession',
            name='confirmation_deadline_original',
            field=models.DateTimeField(
                null=True, blank=True,
                help_text='Original confirmation deadline at creation. Never updated after first extension.'),
        ),
        migrations.AddField(
            model_name='congregationsession',
            name='confirmation_deadline_extended_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='congregationsession',
            name='confirmation_deadline_extended_by',
            field=models.ForeignKey(
                null=True, blank=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='extended_session_deadlines',
                to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='congregationsession',
            name='confirmation_deadline_extension_count',
            field=models.PositiveSmallIntegerField(default=0),
        ),
        # ── StudentRecord: denormalised congregation FK (nullable for backfill) ─
        migrations.AddField(
            model_name='studentrecord',
            name='congregation',
            field=models.ForeignKey(
                null=True, blank=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='student_records', to='registry.congregation',
                help_text='Denormalised from session.congregation. Auto-set on save.'),
        ),
    ]
