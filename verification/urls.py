from django.urls import path
from .views import VerifyCertificateView

urlpatterns = [
    path('<uuid:id>/', VerifyCertificateView.as_view(), name='verify_certificate'),
]
