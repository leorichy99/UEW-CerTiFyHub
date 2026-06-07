"""
Student record import service.

Accepts a CSV or XLSX file in-memory, validates each row against the
session's scope rules, and creates StudentRecord rows in a Draft session.
Runs synchronously in-request for the first cut; Slice 6 will move this
to a Celery task without changing the public interface.
"""

import csv
import io
from datetime import date, datetime
from typing import Iterable

from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from registry.models import (
    CongregationSession, StudentRecord, ImportBatch,
    Faculty, Department,
)
from registry.repositories import ImportBatchRepository
from registry.services.session_lifecycle_service import SessionLifecycleService


REQUIRED_COLUMNS = [
    'index_number', 'full_name', 'institutional_email',
    'programme', 'class_of_degree', 'date_of_completion',
]
OPTIONAL_COLUMNS = [
    'gender', 'date_of_admission', 'faculty_code', 'department_code',
]


class ImportRejected(Exception):
    """Raised when the entire file is rejected (e.g. unreadable, missing headers)."""


class ImportService:
    def __init__(self, batch_repo=None, lifecycle=None):
        self.batch_repo = batch_repo or ImportBatchRepository()
        self.lifecycle = lifecycle or SessionLifecycleService()

    # ── Public API ───────────────────────────────────────────────────────

    @transaction.atomic
    def process_upload(self, *, session, uploaded_by, file_name, raw_bytes):
        """Parse + validate + persist a student-records file in one transaction."""
        if not self.lifecycle.can_edit_records(session):
            raise ImportRejected(
                'Student records can only be uploaded to a Draft session.'
            )

        rows = list(self._parse_rows(file_name, raw_bytes))
        if not rows:
            raise ImportRejected('File is empty or unreadable.')

        # Header validation: rows is list of dicts; first row dictates columns
        missing = [c for c in REQUIRED_COLUMNS if c not in rows[0]]
        if missing:
            raise ImportRejected(
                f"Missing required column(s): {', '.join(missing)}"
            )

        batch = self.batch_repo.create(
            session=session, uploaded_by=uploaded_by,
            file_name=file_name or 'upload',
            total_rows=len(rows),
            status=ImportBatch.STATUS_PROCESSING,
        )

        success = 0
        skipped = 0
        errors = []

        # Cache faculty / department lookups to avoid per-row queries
        faculty_by_code = {f.code: f for f in Faculty.objects.all()}
        department_by_code = {d.code: d for d in Department.objects.all()}

        # Track index numbers seen *within this file* for duplicate detection
        seen_indices = set()
        existing_indices = set(
            StudentRecord.objects
            .filter(session=session)
            .values_list('index_number', flat=True)
        )

        for line_no, raw in enumerate(rows, start=2):  # row 1 = header
            try:
                cleaned = self._clean_row(raw, faculty_by_code, department_by_code)
                self._enforce_scope(session, cleaned)
            except ValidationError as e:
                errors.append({
                    'row': line_no,
                    'field': getattr(e, 'field', '') or '',
                    'message': '; '.join(e.messages) if hasattr(e, 'messages') else str(e),
                })
                continue

            idx = cleaned['index_number']
            if idx in seen_indices:
                errors.append({'row': line_no, 'field': 'index_number',
                               'message': f"Duplicate index number {idx} in file."})
                continue
            if idx in existing_indices:
                errors.append({'row': line_no, 'field': 'index_number',
                               'message': f"Index number {idx} already exists in this session."})
                skipped += 1
                continue
            seen_indices.add(idx)

            StudentRecord.objects.create(
                session=session, import_batch=batch, **cleaned,
            )
            success += 1

        batch_status = (
            ImportBatch.STATUS_COMPLETED if not errors
            else ImportBatch.STATUS_COMPLETED_WITH_ERRORS
        )
        ImportBatch.objects.filter(pk=batch.pk).update(
            success_count=success,
            skipped_count=skipped,
            error_count=len(errors),
            error_log=errors,
            status=batch_status,
            completed_at=timezone.now(),
        )
        batch.refresh_from_db()
        return batch

    # ── Parsing ──────────────────────────────────────────────────────────

    def _parse_rows(self, file_name, raw_bytes) -> Iterable[dict]:
        name = (file_name or '').lower()
        if name.endswith('.xlsx') or name.endswith('.xls'):
            yield from self._parse_xlsx(raw_bytes)
        else:
            yield from self._parse_csv(raw_bytes)

    def _parse_csv(self, raw_bytes):
        try:
            text = raw_bytes.decode('utf-8-sig')
        except UnicodeDecodeError:
            text = raw_bytes.decode('latin-1', errors='replace')
        reader = csv.DictReader(io.StringIO(text))
        for row in reader:
            yield {k.strip().lower().replace(' ', '_'): (v or '').strip()
                   for k, v in row.items() if k}

    def _parse_xlsx(self, raw_bytes):
        try:
            from openpyxl import load_workbook  # type: ignore
        except ImportError as e:
            raise ImportRejected('XLSX support requires openpyxl.') from e
        wb = load_workbook(io.BytesIO(raw_bytes), read_only=True, data_only=True)
        ws = wb.active
        rows_iter = ws.iter_rows(values_only=True)
        try:
            header = next(rows_iter)
        except StopIteration:
            return
        keys = [str(h).strip().lower().replace(' ', '_') if h else '' for h in header]
        for raw_row in rows_iter:
            if not any(c is not None and str(c).strip() for c in raw_row):
                continue
            yield {k: (str(v).strip() if v is not None else '')
                   for k, v in zip(keys, raw_row) if k}

    # ── Per-row cleaning ─────────────────────────────────────────────────

    def _clean_row(self, raw, faculty_by_code, department_by_code):
        for col in REQUIRED_COLUMNS:
            if not raw.get(col):
                err = ValidationError(f"Missing required value: {col}")
                err.field = col
                raise err

        email = raw['institutional_email']
        try:
            validate_email(email)
        except ValidationError as e:
            err = ValidationError(f"Invalid email: {email}")
            err.field = 'institutional_email'
            raise err from e

        completion = self._parse_date(raw['date_of_completion'])
        if completion is None:
            err = ValidationError(f"Invalid date_of_completion: {raw['date_of_completion']}")
            err.field = 'date_of_completion'
            raise err

        admission = self._parse_date(raw.get('date_of_admission')) if raw.get('date_of_admission') else None

        cleaned = {
            'index_number': raw['index_number'],
            'full_name': raw['full_name'],
            'gender': (raw.get('gender') or '').upper(),
            'institutional_email': email,
            'programme': raw['programme'],
            'class_of_degree': raw['class_of_degree'],
            'date_of_completion': completion,
            'date_of_admission': admission,
            'faculty': None,
            'department': None,
            'extra_fields': {},
        }

        if cleaned['gender'] and cleaned['gender'] not in {'MALE', 'FEMALE', 'OTHER'}:
            cleaned['gender'] = ''  # silently drop unknowns

        fac_code = raw.get('faculty_code')
        if fac_code:
            faculty = faculty_by_code.get(fac_code)
            if not faculty:
                err = ValidationError(f"Unknown faculty code: {fac_code}")
                err.field = 'faculty_code'
                raise err
            cleaned['faculty'] = faculty

        dept_code = raw.get('department_code')
        if dept_code:
            department = department_by_code.get(dept_code)
            if not department:
                err = ValidationError(f"Unknown department code: {dept_code}")
                err.field = 'department_code'
                raise err
            cleaned['department'] = department
            if cleaned['faculty'] is None:
                cleaned['faculty'] = department.faculty

        # Stash any unknown columns into extra_fields
        known = set(REQUIRED_COLUMNS) | set(OPTIONAL_COLUMNS)
        extra = {k: v for k, v in raw.items() if k not in known and k}
        if extra:
            cleaned['extra_fields'] = extra

        return cleaned

    @staticmethod
    def _parse_date(s):
        if not s:
            return None
        if isinstance(s, (date, datetime)):
            return s.date() if isinstance(s, datetime) else s
        for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y'):
            try:
                return datetime.strptime(s, fmt).date()
            except ValueError:
                continue
        return None

    # ── Scope enforcement ────────────────────────────────────────────────

    @staticmethod
    def _enforce_scope(session, cleaned):
        if session.scope_type == CongregationSession.SCOPE_FACULTY:
            if cleaned['faculty'] and cleaned['faculty'].pk != session.faculty_id:
                err = ValidationError(
                    f"Faculty {cleaned['faculty'].code} is outside the session faculty."
                )
                err.field = 'faculty_code'
                raise err
            cleaned['faculty'] = cleaned['faculty'] or session.faculty
        elif session.scope_type == CongregationSession.SCOPE_DEPARTMENT:
            if cleaned['department'] and cleaned['department'].pk != session.department_id:
                err = ValidationError(
                    f"Department {cleaned['department'].code} is outside the session department."
                )
                err.field = 'department_code'
                raise err
            cleaned['department'] = cleaned['department'] or session.department
            cleaned['faculty'] = cleaned['faculty'] or session.faculty
