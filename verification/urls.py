from django.urls import path
from .views import TokenVerificationView, CertificateNumberLookupView

urlpatterns = [
    path('v/<str:token>/', TokenVerificationView.as_view(), name='verify_token'),
    path('lookup/', CertificateNumberLookupView.as_view(), name='verify_lookup'),
]
