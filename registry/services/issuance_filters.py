"""
Filter expressions for ``IssuanceRun``.

Filters are deliberately stored as a JSON dict on the run so the API can
evolve without schema migrations. ``apply_batch_filters()`` is the *only*
place that translates that dict into a queryset filter — keeping the
translation in one place stops divergence between the validation in views
and the execution in services.

Supported keys (all optional; an empty dict targets every confirmed record):

    faculty_ids:          list[UUID-str]    StudentRecord.faculty_id IN ...
    department_ids:       list[UUID-str]    StudentRecord.department_id IN ...
    honors:               list[str]         Map raw class_of_degree → bucket
                                            via certificates' regex patterns,
                                            then match.
    index_number_prefix:  str               StudentRecord.index_number
                                            STARTSWITH ...
    record_ids:           list[UUID-str]    Explicit record selection.
    retry_failed:         bool              Include ISSUE_FAILED records.
                                            Default: False (only NOT_ISSUED).
"""

from registry.models import StudentRecord
from registry.services.issuance_service import _map_honors


class FilterValidationError(ValueError):
    """Raised when an incoming filter dict is malformed."""


def validate_filter_criteria(criteria):
    """Type-check the filter dict; return a normalised copy.

    Unknown keys are rejected loudly rather than silently dropped — this
    prevents typos from quietly issuing too many certificates.
    """
    if criteria is None:
        return {}
    if not isinstance(criteria, dict):
        raise FilterValidationError('filter_criteria must be a JSON object.')

    allowed = {
        'faculty_ids', 'department_ids', 'honors',
        'index_number_prefix', 'record_ids', 'retry_failed',
    }
    unknown = set(criteria) - allowed
    if unknown:
        raise FilterValidationError(
            f'Unknown filter key(s): {sorted(unknown)}. '
            f'Allowed: {sorted(allowed)}.'
        )

    out = {}
    for key in ('faculty_ids', 'department_ids', 'record_ids', 'honors'):
        value = criteria.get(key)
        if value is None:
            continue
        if not isinstance(value, list):
            raise FilterValidationError(f'{key} must be a list.')
        if any(not isinstance(v, str) or not v.strip() for v in value):
            raise FilterValidationError(
                f'{key} entries must be non-empty strings.'
            )
        out[key] = [v.strip() for v in value]

    prefix = criteria.get('index_number_prefix')
    if prefix is not None:
        if not isinstance(prefix, str):
            raise FilterValidationError('index_number_prefix must be a string.')
        prefix = prefix.strip()
        if prefix:
            out['index_number_prefix'] = prefix

    retry = criteria.get('retry_failed')
    if retry is not None:
        if not isinstance(retry, bool):
            raise FilterValidationError('retry_failed must be a boolean.')
        out['retry_failed'] = retry

    return out


def apply_batch_filters(queryset, criteria):
    """Apply the validated filter dict to a StudentRecord queryset.

    Caller is responsible for the base queryset (typically ``batch``-scoped
    and restricted to CONF_CONFIRMED). This helper only adds filter clauses.
    """
    if criteria.get('faculty_ids'):
        queryset = queryset.filter(faculty_id__in=criteria['faculty_ids'])
    if criteria.get('department_ids'):
        queryset = queryset.filter(department_id__in=criteria['department_ids'])
    if criteria.get('record_ids'):
        queryset = queryset.filter(id__in=criteria['record_ids'])
    if criteria.get('index_number_prefix'):
        queryset = queryset.filter(
            index_number__istartswith=criteria['index_number_prefix']
        )
    if criteria.get('honors'):
        # The dataset stores free-text class_of_degree; we materialise the
        # mapping here. For datasets larger than a few thousand records this
        # could be denormalised, but at batch scale (<10k) it's fine.
        wanted = set(criteria['honors'])
        ids = [
            r.id for r in queryset.only('id', 'class_of_degree')
            if _map_honors(r.class_of_degree) in wanted
        ]
        queryset = queryset.filter(id__in=ids)
    return queryset


def issuable_records_for_batch(batch, criteria):
    """Return the StudentRecord queryset a run will operate on.

    By default we target only records that are CONFIRMED and not yet ISSUED.
    With ``retry_failed=True`` we also include records that previously
    failed — useful when re-running after a template fix.
    """
    base = StudentRecord.objects.filter(
        batch=batch,
        confirmation_status=StudentRecord.CONF_CONFIRMED,
    )
    if criteria.get('retry_failed'):
        base = base.filter(
            issuance_status__in=[
                StudentRecord.ISSUE_NOT_ISSUED,
                StudentRecord.ISSUE_QUEUED,
                StudentRecord.ISSUE_FAILED,
            ],
        )
    else:
        base = base.filter(
            issuance_status__in=[
                StudentRecord.ISSUE_NOT_ISSUED,
                StudentRecord.ISSUE_QUEUED,
            ],
        )
    return apply_batch_filters(base, criteria)
