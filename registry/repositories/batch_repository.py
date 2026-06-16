"""Repository for IssuanceBatch."""

from registry.models import IssuanceBatch, BatchStatusTransition


class IssuanceBatchRepository:
    def list(self, *, year=None, status=None, search=None):
        qs = IssuanceBatch.objects.select_related(
            'certificate_template', 'created_by'
        ).order_by('-created_at')
        if year:
            qs = qs.filter(year=year)
        if status:
            qs = qs.filter(status=status)
        if search:
            qs = qs.filter(name__icontains=search)
        return qs

    def get(self, batch_id):
        return (
            IssuanceBatch.objects
            .select_related('certificate_template', 'created_by')
            .filter(pk=batch_id)
            .first()
        )

    def get_by_year(self, year):
        return IssuanceBatch.objects.filter(year=year).order_by('-created_at')

    def record_transition(self, *, batch, from_status, to_status, actor=None, note=''):
        return BatchStatusTransition.objects.create(
            batch=batch,
            from_status=from_status,
            to_status=to_status,
            actor=actor,
            note=note or '',
        )
