"""Slice 1 step 2/3 — backfill Congregation rows from existing sessions.

Strategy:
  - Group existing CongregationSession rows by academic_year.
  - For each distinct year, derive an integer year (first 4 chars of academic_year).
  - Create one Congregation per integer year, named "{academic_year} Congregation".
  - ceremony_month := the first day of the earliest ceremony_date in the group.
  - created_by := the created_by of the earliest session in the group.
  - Assign session_number ordered by (ceremony_date, created_at) within each group.
  - Set confirmation_deadline_original := confirmation_deadline for every session.
  - Set student_record.congregation := session.congregation.

Reverse is a no-op — we don't drop backfilled data on rollback because dropping
Congregations would break FK references that 0002 added.
"""

from collections import defaultdict

from django.db import migrations


def _coerce_year(academic_year: str) -> int:
    """Best-effort integer year from a string like '2024/2025' or '2024'."""
    if not academic_year:
        return 0
    head = academic_year.strip()[:4]
    try:
        return int(head)
    except ValueError:
        return 0


def backfill(apps, schema_editor):
    Congregation = apps.get_model('registry', 'Congregation')
    CongregationSession = apps.get_model('registry', 'CongregationSession')
    StudentRecord = apps.get_model('registry', 'StudentRecord')

    sessions_by_year = defaultdict(list)
    for session in CongregationSession.objects.all().order_by('ceremony_date', 'created_at'):
        year_int = _coerce_year(session.academic_year)
        sessions_by_year[(year_int, session.academic_year)].append(session)

    for (year_int, academic_year), sessions in sessions_by_year.items():
        if not sessions:
            continue
        # If a Congregation already exists for this integer year (e.g. partial
        # re-runs), reuse it rather than violating the unique constraint.
        existing = Congregation.objects.filter(year=year_int).first()
        if existing:
            congregation = existing
        else:
            earliest = sessions[0]
            ceremony_month = earliest.ceremony_date.replace(day=1)
            congregation = Congregation.objects.create(
                name=f'{academic_year} Congregation',
                year=year_int,
                ceremony_month=ceremony_month,
                description='Backfilled from legacy sessions during Slice 1 migration.',
                created_by=earliest.created_by,
            )

        for ordinal, session in enumerate(sessions, start=1):
            session.congregation = congregation
            session.session_number = ordinal
            if session.confirmation_deadline_original is None:
                session.confirmation_deadline_original = session.confirmation_deadline
            session.save(update_fields=[
                'congregation', 'session_number', 'confirmation_deadline_original',
            ])

        # Denormalise to student records.
        StudentRecord.objects.filter(session__in=sessions).update(
            congregation=congregation,
        )


def noop_reverse(apps, schema_editor):
    """Intentionally a no-op — see module docstring."""


class Migration(migrations.Migration):

    dependencies = [
        ('registry', '0002_congregation_and_session_fields'),
    ]

    operations = [
        migrations.RunPython(backfill, reverse_code=noop_reverse),
    ]
