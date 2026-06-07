"""
CongregationTemplate service — snapshot + instantiate session schedules.

A template captures the *shape* of a multi-session congregation so the same
schedule can be replayed each year. Two flows live here:

  - ``snapshot_from_congregation()`` — read an existing congregation's
    sessions and persist them as a template (offsets computed against the
    parent congregation's ceremony_month).
  - ``apply_to_congregation()`` — instantiate template session defs as
    new DRAFT sessions inside a target congregation.

Session creation goes through ``SessionLifecycleService.create`` so all the
usual validation (per-congregation cap, original-deadline snapshot, etc.)
still runs.
"""

from datetime import datetime, time, timedelta

from django.db import transaction
from django.utils import timezone

from registry.models import (
    Congregation, CongregationSession, CongregationTemplate,
    CongregationTemplateSessionDef, Faculty, Department,
)
from templates.models import CertificateTemplate
from registry.services.session_lifecycle_service import (
    SessionLifecycleService, SessionLifecycleError,
)


class CongregationTemplateError(Exception):
    """Raised when a template create/apply operation is rejected."""


def _render_name(pattern: str, *, year: int, session_number: int,
                 fallback: str) -> str:
    """Expand `{year}` / `{n}` placeholders. Fall back if pattern is blank."""
    if not pattern:
        return fallback
    try:
        return pattern.format(year=year, n=session_number)
    except (KeyError, IndexError, ValueError):
        # Pattern referenced an unsupported placeholder — return verbatim.
        return pattern


def _compute_ceremony_start_date(ceremony_month, offset_days):
    """Return ceremony_month (day 1) + offset_days as a date."""
    return ceremony_month + timedelta(days=int(offset_days))


def _compute_deadline(ceremony_start_date, window_days):
    """End-of-day datetime, `window_days` before ``ceremony_start_date``."""
    deadline_date = ceremony_start_date - timedelta(days=int(window_days))
    naive = datetime.combine(deadline_date, time(23, 59, 0))
    tz = timezone.get_current_timezone()
    return timezone.make_aware(naive, tz)


class CongregationTemplateService:
    def __init__(self, lifecycle=None):
        self.lifecycle = lifecycle or SessionLifecycleService()

    # ── Pure CRUD ────────────────────────────────────────────────────────

    @transaction.atomic
    def create(self, *, name, description, created_by, session_defs):
        """Build a template + its session defs from a Python list.

        ``session_defs`` is a list of dicts; see
        ``CongregationTemplateSessionDef`` for the field set.
        """
        if not name or not name.strip():
            raise CongregationTemplateError('name is required.')
        if not session_defs:
            raise CongregationTemplateError(
                'A template needs at least one session definition.'
            )

        template = CongregationTemplate.objects.create(
            name=name.strip(),
            description=(description or '').strip()[:500],
            created_by=created_by,
        )
        self._replace_session_defs(template, session_defs)
        return template

    @transaction.atomic
    def update(self, template, *, name=None, description=None,
               is_active=None, session_defs=None):
        if name is not None:
            template.name = name.strip()
        if description is not None:
            template.description = (description or '').strip()[:500]
        if is_active is not None:
            template.is_active = bool(is_active)
        template.save(update_fields=['name', 'description', 'is_active', 'updated_at'])
        if session_defs is not None:
            self._replace_session_defs(template, session_defs)
        return template

    def _replace_session_defs(self, template, session_defs):
        # Replace wholesale — simpler and safer than diffing for a small list.
        template.session_defs.all().delete()
        numbers_seen = set()
        for raw in session_defs:
            number = int(raw.get('session_number') or 0)
            if number <= 0:
                raise CongregationTemplateError(
                    'session_number must be a positive integer.'
                )
            if number in numbers_seen:
                raise CongregationTemplateError(
                    f'Duplicate session_number {number} in template.'
                )
            numbers_seen.add(number)

            CongregationTemplateSessionDef.objects.create(
                template=template,
                session_number=number,
                name_pattern=(raw.get('name_pattern') or '').strip(),
                scope_type=raw['scope_type'],
                ceremony_day_offset=int(raw.get('ceremony_day_offset') or 0),
                confirmation_window_days=int(raw.get('confirmation_window_days') or 14),
                issuance_instructions=(raw.get('issuance_instructions') or '').strip(),
                default_faculty_id=raw.get('default_faculty') or None,
                default_department_id=raw.get('default_department') or None,
                default_certificate_template_id=(
                    raw.get('default_certificate_template') or None
                ),
            )

    # ── Snapshot ─────────────────────────────────────────────────────────

    @transaction.atomic
    def snapshot_from_congregation(self, congregation, *, name, description,
                                   created_by):
        """Capture an existing congregation's sessions as a template.

        The offsets are computed as ``session.ceremony_start_date - congregation
        .ceremony_month``, so applying the template back to a congregation
        with the same ceremony_month produces identical dates.
        """
        sessions = list(
            CongregationSession.objects
            .filter(congregation=congregation)
            .order_by('session_number')
        )
        if not sessions:
            raise CongregationTemplateError(
                'Cannot snapshot a congregation with no sessions.'
            )

        session_defs = []
        for s in sessions:
            offset = (s.ceremony_start_date - congregation.ceremony_month).days
            # Confirmation window: days between deadline date and ceremony_start_date.
            window = (s.ceremony_start_date - s.confirmation_deadline.date()).days
            session_defs.append({
                'session_number': s.session_number,
                'name_pattern': s.name,  # verbatim; client can edit later
                'scope_type': s.scope_type,
                'ceremony_day_offset': offset,
                'confirmation_window_days': max(window, 0),
                'issuance_instructions': s.issuance_instructions or '',
                'default_faculty': s.faculty_id,
                'default_department': s.department_id,
                'default_certificate_template': s.certificate_template_id,
            })

        template = self.create(
            name=name, description=description,
            created_by=created_by, session_defs=session_defs,
        )
        template.sourced_from_congregation = congregation
        template.save(update_fields=['sourced_from_congregation'])
        return template

    # ── Apply ────────────────────────────────────────────────────────────

    @transaction.atomic
    def apply_to_congregation(self, template, congregation, *, actor,
                              overrides=None):
        """Instantiate the template's session defs into ``congregation``.

        Refuses to apply if the target congregation already has any
        sessions, to avoid silently merging two schedules. If the operator
        needs a partial apply, they can delete the rogue session first or
        clone a new congregation.

        ``overrides`` is an optional dict keyed by session_number with the
        same shape as a session def — useful for last-minute date tweaks.
        """
        if CongregationSession.objects.filter(congregation=congregation).exists():
            raise CongregationTemplateError(
                'Target congregation already has sessions. '
                'Apply only to empty congregations.'
            )

        defs = list(template.session_defs.all().order_by('session_number'))
        if not defs:
            raise CongregationTemplateError('Template has no session defs.')

        overrides = overrides or {}
        created = []
        academic_year = f'{congregation.year}/{congregation.year + 1}'

        for sd in defs:
            ov = overrides.get(sd.session_number, {})
            ceremony_start_date = _compute_ceremony_start_date(
                congregation.ceremony_month,
                ov.get('ceremony_day_offset', sd.ceremony_day_offset),
            )
            # Templates currently create single-day sessions.
            ceremony_end_date = ceremony_start_date
            deadline = _compute_deadline(
                ceremony_start_date,
                ov.get('confirmation_window_days', sd.confirmation_window_days),
            )
            cert_template_id = (
                ov.get('certificate_template')
                or sd.default_certificate_template_id
            )
            if not cert_template_id:
                raise CongregationTemplateError(
                    f'session {sd.session_number}: certificate_template is '
                    f'required (set a default on the template or pass an '
                    f'override).'
                )
            cert_template = CertificateTemplate.objects.filter(
                pk=cert_template_id,
            ).first()
            if not cert_template:
                raise CongregationTemplateError(
                    f'session {sd.session_number}: certificate_template '
                    f'{cert_template_id} not found.'
                )

            faculty_id = ov.get('faculty') or sd.default_faculty_id
            department_id = ov.get('department') or sd.default_department_id
            faculty = (
                Faculty.objects.filter(pk=faculty_id).first()
                if faculty_id else None
            )
            department = (
                Department.objects.filter(pk=department_id).first()
                if department_id else None
            )

            try:
                session = self.lifecycle.create(
                    congregation=congregation,
                    session_number=sd.session_number,
                    name=_render_name(
                        sd.name_pattern,
                        year=congregation.year,
                        session_number=sd.session_number,
                        fallback=f'{congregation.name} · Session {sd.session_number}',
                    ),
                    academic_year=academic_year,
                    ceremony_start_date=ceremony_start_date,
                    ceremony_end_date=ceremony_end_date,
                    scope_type=sd.scope_type,
                    confirmation_deadline=deadline,
                    certificate_template=cert_template,
                    created_by=actor,
                    faculty=faculty,
                    department=department,
                    issuance_instructions=(
                        ov.get('issuance_instructions')
                        or sd.issuance_instructions or ''
                    ),
                )
            except SessionLifecycleError as e:
                raise CongregationTemplateError(
                    f'session {sd.session_number}: {e}'
                )
            created.append(session)

        congregation.sourced_from_template = template
        congregation.save(update_fields=['sourced_from_template'])
        return created
