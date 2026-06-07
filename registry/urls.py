from django.urls import path
from rest_framework.routers import DefaultRouter

from registry.views import (
    FacultyViewSet, DepartmentViewSet,
    CongregationViewSet, CongregationTemplateViewSet,
    CongregationSessionViewSet, StudentRecordViewSet, ImportBatchViewSet,
    IssuanceBatchViewSet,
    PublicConfirmationLookupView, PublicConfirmView, PublicDisputeView,
    SessionDisputesView, ResolveDisputeView,
)
from registry.sse_views import session_progress_stream


router = DefaultRouter()
router.register(r'faculties', FacultyViewSet, basename='faculty')
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'congregations', CongregationViewSet, basename='congregation')
router.register(
    r'congregation-templates', CongregationTemplateViewSet,
    basename='congregation-template',
)
router.register(r'sessions', CongregationSessionViewSet, basename='session')


_record_list = StudentRecordViewSet.as_view({'get': 'list', 'post': 'create'})
_record_detail = StudentRecordViewSet.as_view({
    'get': 'retrieve', 'patch': 'partial_update',
    'put': 'update', 'delete': 'destroy',
})
_batch_list = ImportBatchViewSet.as_view({'get': 'list'})
_batch_detail = ImportBatchViewSet.as_view({'get': 'retrieve'})
_batch_upload = ImportBatchViewSet.as_view({'post': 'upload'})

_issuance_batch_list = IssuanceBatchViewSet.as_view({'get': 'list', 'post': 'create'})
_issuance_batch_detail = IssuanceBatchViewSet.as_view({'get': 'retrieve'})


urlpatterns = router.urls + [
    path('sessions/<uuid:session_pk>/records/', _record_list,
         name='session-records-list'),
    path('sessions/<uuid:session_pk>/issuance-batches/', _issuance_batch_list,
         name='session-issuance-batches-list'),
    path('sessions/<uuid:session_pk>/issuance-batches/<uuid:pk>/',
         _issuance_batch_detail, name='session-issuance-batches-detail'),
    path('sessions/<uuid:session_pk>/records/<uuid:pk>/', _record_detail,
         name='session-records-detail'),
    path('sessions/<uuid:session_pk>/imports/', _batch_list,
         name='session-imports-list'),
    path('sessions/<uuid:session_pk>/imports/<uuid:pk>/', _batch_detail,
         name='session-imports-detail'),
    path('sessions/<uuid:session_pk>/imports/upload/', _batch_upload,
         name='session-imports-upload'),

    # Disputes
    path('sessions/<uuid:session_pk>/disputes/', SessionDisputesView.as_view(),
         name='session-disputes'),
    path('sessions/<uuid:session_pk>/records/<uuid:record_pk>/resolve-dispute/',
         ResolveDisputeView.as_view(), name='resolve-dispute'),

    # Live session progress (SSE)
    path('sessions/<uuid:session_id>/progress/stream/', session_progress_stream,
         name='session-progress-stream'),

    # Public (unauthenticated) confirmation endpoints
    path('public/confirm/lookup/', PublicConfirmationLookupView.as_view(),
         name='public-confirm-lookup'),
    path('public/confirm/confirm/', PublicConfirmView.as_view(),
         name='public-confirm-confirm'),
    path('public/confirm/dispute/', PublicDisputeView.as_view(),
         name='public-confirm-dispute'),
]
