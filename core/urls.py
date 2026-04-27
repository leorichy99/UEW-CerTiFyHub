from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    AuditTokenObtainPairView, CurrentUserView,
    PasswordResetRequestView, VerifyResetTokenView, PasswordResetConfirmView,
    AuthorisationReferenceListCreateView, AuthorisationReferenceDetailView,
    AccountListCreateView, AccountDetailView,
    AccountPermissionUpdateView, AccountDeactivateView, AccountReactivateView,
    AccountUnlockView, AccountRegenerateCredentialView,
    SADeactivationConfirmView, SetupAccountView, PermissionConstantsView,
)

urlpatterns = [
    path('token/', AuditTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset/verify/', VerifyResetTokenView.as_view(), name='password_reset_verify'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('setup-account/', SetupAccountView.as_view(), name='setup_account'),
]

admin_urlpatterns = [
    path('authorisations/', AuthorisationReferenceListCreateView.as_view(), name='authorisation_list_create'),
    path('authorisations/<int:pk>/', AuthorisationReferenceDetailView.as_view(), name='authorisation_detail'),
    path('accounts/', AccountListCreateView.as_view(), name='account_list_create'),
    path('accounts/<int:pk>/', AccountDetailView.as_view(), name='account_detail'),
    path('accounts/<int:pk>/permissions/', AccountPermissionUpdateView.as_view(), name='account_permissions'),
    path('accounts/<int:pk>/deactivate/', AccountDeactivateView.as_view(), name='account_deactivate'),
    path('accounts/<int:pk>/reactivate/', AccountReactivateView.as_view(), name='account_reactivate'),
    path('accounts/<int:pk>/unlock/', AccountUnlockView.as_view(), name='account_unlock'),
    path('accounts/<int:pk>/regenerate-credential/', AccountRegenerateCredentialView.as_view(), name='account_regenerate_credential'),
    path('sa-deactivation/<str:token>/', SADeactivationConfirmView.as_view(), name='sa_deactivation_confirm'),
    path('permissions/', PermissionConstantsView.as_view(), name='permission_constants'),
]
