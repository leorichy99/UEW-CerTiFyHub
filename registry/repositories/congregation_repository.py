"""Repository for Congregation reads."""

from django.db.models import Q

from registry.models import Congregation


class CongregationRepository:
    def list(self, *, year=None, search=None):
        qs = Congregation.objects.select_related('created_by')
        if year:
            qs = qs.filter(year=year)
        if search:
            qs = qs.filter(Q(name__icontains=search))
        return qs.order_by('-year')

    def get(self, congregation_id):
        return (
            Congregation.objects
            .select_related('created_by', 'sourced_from_congregation')
            .filter(pk=congregation_id)
            .first()
        )

    def get_by_year(self, year):
        return Congregation.objects.filter(year=year).first()
