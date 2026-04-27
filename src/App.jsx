/* eslint-disable react/prop-types */
import React, { Suspense, lazy } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  Loader2
} from "lucide-react"

import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ToastProvider } from "./components/ToastContainer";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";

const Login = lazy(() => import("./pages/Login"));
const VerificationPage = lazy(() => import("./pages/VerificationPage"));
const SetupAccountPage = lazy(() => import("./pages/SetupAccountPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const VerifyResetPage = lazy(() => import("./pages/VerifyResetPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const CertificatesPage = lazy(() => import("./pages/CertificatesPage"));
const StudentsPage = lazy(() => import("./pages/StudentsPage"));
const TemplatesPage = lazy(() => import("./pages/TemplatesPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const CertificateForm = lazy(() => import("./components/CertificateForm"));
const AccountManagementPage = lazy(() => import("./pages/AccountManagementPage"));
const AuthorisationLettersPage = lazy(() => import("./pages/AuthorisationLettersPage"));
const SuperAdminCertificatesPage = lazy(() => import("./pages/SuperAdminCertificatesPage"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const SystemSettings = lazy(() => import("./pages/SystemSettings"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const GlobalAnalytics = lazy(() => import("./pages/GlobalAnalytics"));
const SuperAdminTemplatesPage = lazy(() => import("./pages/SuperAdminTemplatesPage"));
const TemplateEditorPage = lazy(() => import("./pages/TemplateEditorPage"));

function DashboardLayout({ children }) {
  return <Layout>{children}</Layout>;
}

function CertificateFormWrapper() {
  const navigate = useNavigate();
  return <CertificateForm onSuccess={() => navigate("/certificates")} />;
}

function CertificateFormWrapperWithRefresh({ onCertificateCreated }) {
  return <CertificateForm onSuccess={onCertificateCreated} />;
}

function HomeRedirect() {
  const { user } = useAuth();
  
  if (user?.profile?.role === "SUPER_ADMIN") {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (user?.profile?.role === "ADMIN" || user?.is_superuser) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/certificates" replace />;
}

function PageTransition({ children }) {
  return <div>{children}</div>;
}

function RouteShell({ children, fallback }) {
  return (
    <Suspense fallback={fallback || <div className="flex items-center justify-center h-32">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
    </div>}>
      {children}
    </Suspense>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <Routes location={location} key={location.pathname}>
      <Route
        path="/login"
        element={
          <RouteShell fallback={      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>}>
            <Login />
          </RouteShell>
        }
      />
      <Route
        path="/setup-account/:token"
        element={
          <RouteShell fallback={<div className="min-h-[60vh] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>}>
            <SetupAccountPage />
          </RouteShell>
        }
      />
      <Route
        path="/verify"
        element={
          <RouteShell fallback={      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>}>
            <VerificationPage />
          </RouteShell>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <RouteShell fallback={      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>}>
            <ForgotPasswordPage />
          </RouteShell>
        }
      />
      <Route
        path="/forgot-password/verify"
        element={
          <RouteShell fallback={      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>}>
            <VerifyResetPage />
          </RouteShell>
        }
      />
      <Route
        path="/forgot-password/reset"
        element={
          <RouteShell fallback={      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>}>
            <ResetPasswordPage />
          </RouteShell>
        }
      />
      <Route
        path="/verify/:id"
        element={
          <RouteShell fallback={      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>}>
            <VerificationPage />
          </RouteShell>
        }
      />
      {/* Legacy activation route — redirect to login */}
      <Route path="/activate-admin/:token" element={<Navigate to="/login" replace />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomeRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}>
            <DashboardLayout>
              <RouteShell fallback={      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>}>
                <DashboardPage />
              </RouteShell>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/create-certificate"
        element={
          <ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]} requiredPermission="certificates.issue">
            <DashboardLayout>
              <RouteShell fallback={      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>}>
                <CertificateFormWrapper />
              </RouteShell>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/certificates"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <RouteShell fallback={      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>}>
                <CertificatesPage />
              </RouteShell>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/certificates/create"
        element={
          <ProtectedRoute requiredPermission="certificates.issue">
            <DashboardLayout>
              <RouteShell fallback={      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>}>
                <CertificateFormWrapper />
              </RouteShell>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/students"
        element={
          <ProtectedRoute requiredPermission="students.view">
            <DashboardLayout>
              <RouteShell fallback={      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>}>
                <StudentsPage />
              </RouteShell>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/templates"
        element={
          <ProtectedRoute requiredPermission="templates.manage">
            <DashboardLayout>
              <RouteShell fallback={      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>}>
                <TemplatesPage />
              </RouteShell>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/templates/new"
        element={
          <ProtectedRoute requiredPermission="templates.manage">
            <RouteShell fallback={<div className="p-6 text-center text-sm text-slate-600">Loading editor...</div>}>
              <TemplateEditorPage />
            </RouteShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/templates/:id/edit"
        element={
          <ProtectedRoute requiredPermission="templates.manage">
            <RouteShell fallback={<div className="p-6 text-center text-sm text-slate-600">Loading editor...</div>}>
              <TemplateEditorPage />
            </RouteShell>
          </ProtectedRoute>
        }
      />

      {/* New provisioning pages */}
      <Route
        path="/admin/accounts"
        element={
          <ProtectedRoute roles={["SUPER_ADMIN"]}>
            <DashboardLayout>
              <RouteShell fallback={<div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>}>
                <AccountManagementPage />
              </RouteShell>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/authorisations"
        element={
          <ProtectedRoute roles={["SUPER_ADMIN"]}>
            <DashboardLayout>
              <RouteShell fallback={<div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>}>
                <AuthorisationLettersPage />
              </RouteShell>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Legacy routes — redirect to new equivalents */}
      <Route path="/admin/users" element={<Navigate to="/admin/accounts" replace />} />

      <Route
        path="/admin/certificates"
        element={
          <ProtectedRoute roles={["SUPER_ADMIN"]}>
            <DashboardLayout>
              <RouteShell fallback={      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>}>
                <SuperAdminCertificatesPage />
              </RouteShell>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute roles={["SUPER_ADMIN"]}>
            <DashboardLayout>
              <RouteShell fallback={      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>}>
                <SuperAdminDashboard />
              </RouteShell>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute roles={["SUPER_ADMIN"]}>
            <DashboardLayout>
              <RouteShell fallback={      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>}>
                <SystemSettings />
              </RouteShell>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/audit"
        element={
          <ProtectedRoute roles={["SUPER_ADMIN"]}>
            <DashboardLayout>
              <RouteShell fallback={      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>}>
                <AuditLogs />
              </RouteShell>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route path="/admin/invitations" element={<Navigate to="/admin/accounts" replace />} />

      <Route
        path="/admin/templates"
        element={
          <ProtectedRoute roles={["SUPER_ADMIN"]}>
            <DashboardLayout>
              <RouteShell fallback={      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>}>
                <SuperAdminTemplatesPage />
              </RouteShell>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute roles={["SUPER_ADMIN"]}>
            <DashboardLayout>
              <RouteShell fallback={      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>}>
                <GlobalAnalytics />
              </RouteShell>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            <ErrorBoundary>
              <AnimatedRoutes />
            </ErrorBoundary>
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
