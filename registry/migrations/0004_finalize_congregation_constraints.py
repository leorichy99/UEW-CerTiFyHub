"""Slice 1 step 3/3 — make Congregation FKs non-null and add uniqueness constraints."""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('registry', '0003_backfill_congregation_data'),
    ]

    operations = [
        # CongregationSession.congregation: nullable → non-null.
        migrations.AlterField(
            model_name='congregationsession',
            name='congregation',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='sessions', to='registry.congregation',
                help_text='Parent congregation. Backfilled and made non-null by migrations 0002-0004.'),
        ),
        # StudentRecord.congregation: keep nullable (some legacy / SET_NULL flows
        # rely on this) but ensure values are populated by the backfill step.
        # Index for query performance.
        migrations.AddIndex(
            model_name='congregationsession',
            index=models.Index(fields=['congregation'], name='registry_co_congreg_c83aef_idx'),
        ),
        migrations.AddConstraint(
            model_name='congregationsession',
            constraint=models.UniqueConstraint(
                fields=['congregation', 'session_number'],
                name='registry_session_unique_number_per_congregation',
            ),
        ),
        migrations.AddConstraint(
            model_name='congregationsession',
            constraint=models.UniqueConstraint(
                fields=['congregation', 'name'],
                name='registry_session_unique_name_per_congregation',
            ),
        ),
    ]
