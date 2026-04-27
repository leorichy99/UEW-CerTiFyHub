from rest_framework.pagination import PageNumberPagination


class FlexiblePageNumberPagination(PageNumberPagination):
    """Allow clients to set page_size via query parameter, with a sensible max."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 200
