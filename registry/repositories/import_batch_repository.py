"""Repository for ImportBatch."""

from registry.models import ImportBatch


class ImportBatchRepository:
    def for_session(self, session_id):
        return ImportBatch.objects.filter(session_id=session_id).order_by('-uploaded_at')

    def get(self, batch_id):
        return ImportBatch.objects.filter(pk=batch_id).select_related(
            'session', 'uploaded_by'
        ).first()

    def create(self, **fields):
        return ImportBatch.objects.create(**fields)

    def update(self, batch_id, **fields):
        ImportBatch.objects.filter(pk=batch_id).update(**fields)
        return self.get(batch_id)
