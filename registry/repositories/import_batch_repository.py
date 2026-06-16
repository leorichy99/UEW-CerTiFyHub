"""Repository for ImportBatch."""

from registry.models import ImportBatch


class ImportBatchRepository:
    def for_batch(self, batch_id):
        return ImportBatch.objects.filter(batch_id=batch_id).order_by('-uploaded_at')

    def get(self, batch_id):
        return ImportBatch.objects.filter(pk=batch_id).select_related(
            'batch', 'uploaded_by'
        ).first()

    def create(self, **fields):
        return ImportBatch.objects.create(**fields)

    def update(self, batch_id, **fields):
        ImportBatch.objects.filter(pk=batch_id).update(**fields)
        return self.get(batch_id)
