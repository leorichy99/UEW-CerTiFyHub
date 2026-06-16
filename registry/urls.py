from django.urls import path
from rest_framework.routers import DefaultRouter

from registry.views import (
    FacultyViewSet, DepartmentViewSet,
    IssuanceBatchViewSet, StudentRecordViewSet, ImportBatchViewSet,
    IssuanceRunViewSet,
    PublicConfirmationLookupView, PublicConfirmView, PublicDisputeView,
    BatchDisputesView, ResolveDisputeView,
)
from registry.sse_views import (
    batch_progress_stream, email_delivery_stream, import_progress_stream,
)


router = DefaultRouter()
router.register(r'faculties', FacultyViewSet, basename='faculty')
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'batches', IssuanceBatchViewSet, basename='batch')


_record_list = StudentRecordViewSet.as_view({'get': 'list', 'post': 'create'})
_record_detail = StudentRecordViewSet.as_view({
    'get': 'retrieve', 'patch': 'partial_update',
    'put': 'update', 'delete': 'destroy',
})
_record_resend = StudentRecordViewSet.as_view({'post': 'resend_confirmation'})
_import_list = ImportBatchViewSet.as_view({'get': 'list'})
_import_detail = ImportBatchViewSet.as_view({'get': 'retrieve'})
_import_upload = ImportBatchViewSet.as_view({'post': 'upload'})
_import_upload_file = ImportBatchViewSet.as_view({'post': 'upload_file'})
_import_preview = ImportBatchViewSet.as_view({'post': 'preview'})
_import_confirm = ImportBatchViewSet.as_view({'post': 'confirm'})

_issuance_run_list = IssuanceRunViewSet.as_view({'get': 'list', 'post': 'create'})
_issuance_run_detail = IssuanceRunViewSet.as_view({'get': 'retrieve'})


urlpatterns = router.urls + [
    path('batches/<uuid:batch_pk>/records/', _record_list,
         name='batch-records-list'),
    path('batches/<uuid:batch_pk>/issuance-runs/', _issuance_run_list,
         name='batch-issuance-runs-list'),
    path('batches/<uuid:batch_pk>/issuance-runs/<uuid:pk>/',
         _issuance_run_detail, name='batch-issuance-runs-detail'),
    path('batches/<uuid:batch_pk>/records/<uuid:pk>/', _record_detail,
         name='batch-records-detail'),
    path('batches/<uuid:batch_pk>/records/<uuid:pk>/resend-confirmation/',
         _record_resend, name='batch-record-resend'),
    path('batches/<uuid:batch_pk>/imports/', _import_list,
         name='batch-imports-list'),
    path('batches/<uuid:batch_pk>/imports/<uuid:pk>/', _import_detail,
         name='batch-imports-detail'),
    path('batches/<uuid:batch_pk>/imports/upload/', _import_upload,
         name='batch-imports-upload'),

    # 4-step import wizard
    path('batches/<uuid:batch_pk>/import/upload-file/', _import_upload_file,
         name='batch-import-upload-file'),
    path('batches/<uuid:batch_pk>/import/preview/', _import_preview,
         name='batch-import-preview'),
    path('batches/<uuid:batch_pk>/import/confirm/', _import_confirm,
         name='batch-import-confirm'),

    # Live import progress (SSE)
    path('batches/<uuid:batch_id>/import/<uuid:import_batch_id>/stream/',
         import_progress_stream, name='import-progress-stream'),

    # Disputes
    path('batches/<uuid:batch_pk>/disputes/', BatchDisputesView.as_view(),
         name='batch-disputes'),
    path('batches/<uuid:batch_pk>/records/<uuid:record_pk>/resolve-dispute/',
         ResolveDisputeView.as_view(), name='resolve-dispute'),

    # Live batch progress (SSE)
    path('batches/<uuid:batch_id>/progress/stream/', batch_progress_stream,
         name='batch-progress-stream'),

    # Live email delivery progress (SSE)
    path('batches/<uuid:batch_id>/email-delivery/stream/', email_delivery_stream,
         name='email-delivery-stream'),

    # Public (unauthenticated) confirmation endpoints
    path('public/confirm/lookup/', PublicConfirmationLookupView.as_view(),
         name='public-confirm-lookup'),
    path('public/confirm/confirm/', PublicConfirmView.as_view(),
         name='public-confirm-confirm'),
    path('public/confirm/dispute/', PublicDisputeView.as_view(),
         name='public-confirm-dispute'),
]
