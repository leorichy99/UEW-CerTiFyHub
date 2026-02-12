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
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./components/ToastContainer";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import {
  AnalyticsFallback,
  AuthPageFallback,
  BulkIssueFallback,
  CertificatesFallback,
  DashboardFallback,
  StudentsFallback,
  TemplatesFallback,
} from "./components/RouteFallbacks";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const VerificationPage = lazy(() => import("./pages/VerificationPage"));
const CertificatesPage = lazy(() => import("./pages/CertificatesPage"));
const StudentsPage = lazy(() => import("./pages/StudentsPage"));
const TemplatesPage = lazy(() => import("./pages/TemplatesPage"));
const BulkIssuePage = lazy(() => import("./pages/BulkIssuePage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const CertificateForm = lazy(() => import("./components/CertificateForm"));
const SuperAdminUsersPage = lazy(() => import("./pages/SuperAdminUsersPage"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const SystemSettings = lazy(() => import("./pages/SystemSettings"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const GlobalAnalytics = lazy(() => import("./pages/GlobalAnalytics"));

function DashboardLayout({ children }) {
  return <Layout>{children}</Layout>;
}

function CertificateFormWrapper() {
  const navigate = useNavigate();
  return <CertificateForm onSuccess={() => navigate("/certificates")} />;
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function RouteShell({ children, fallback }) {
  return (
    <Suspense fallback={fallback || <div className="p-6 text-sm text-slate-600">Loading...</div>}>
      {children}
    </Suspense>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/login"
          element={
            <PageTransition>
              <RouteShell fallback={<AuthPageFallback />}>
                <Login />
              </RouteShell>
            </PageTransition>
          }
        />
        <Route
          path="/register"
          element={
            <PageTransition>
              <RouteShell fallback={<AuthPageFallback />}>
                <Register />
              </RouteShell>
            </PageTransition>
          }
        />
        <Route
          path="/verify"
          element={
            <PageTransition>
              <RouteShell fallback={<AuthPageFallback />}>
                <VerificationPage />
              </RouteShell>
            </PageTransition>
          }
        />
        <Route
          path="/verify/:id"
          element={
            <PageTransition>
              <RouteShell fallback={<AuthPageFallback />}>
                <VerificationPage />
              </RouteShell>
            </PageTransition>
          }
        />

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
            <ProtectedRoute roles={["ADMIN"]}>
              <DashboardLayout>
                <RouteShell fallback={<DashboardFallback />}>
                  <DashboardPage />
                </RouteShell>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <DashboardLayout>
                <RouteShell fallback={<AnalyticsFallback />}>
                  <AnalyticsPage />
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
                <RouteShell fallback={<CertificatesFallback />}>
                  <CertificatesPage />
                </RouteShell>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/certificates/create"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <DashboardLayout>
                <RouteShell fallback={<CertificatesFallback />}>
                  <CertificateFormWrapper />
                </RouteShell>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/certificates/bulk"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <DashboardLayout>
                <RouteShell fallback={<BulkIssueFallback />}>
                  <BulkIssuePage />
                </RouteShell>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/students"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <DashboardLayout>
                <RouteShell fallback={<StudentsFallback />}>
                  <StudentsPage />
                </RouteShell>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/templates"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <DashboardLayout>
                <RouteShell fallback={<TemplatesFallback />}>
                  <TemplatesPage />
                </RouteShell>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute roles={["SUPER_ADMIN"]}>
              <DashboardLayout>
                <RouteShell fallback={<StudentsFallback />}>
                  <SuperAdminUsersPage />
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
                <RouteShell fallback={<DashboardFallback />}>
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
                <RouteShell fallback={<DashboardFallback />}>
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
                <RouteShell fallback={<DashboardFallback />}>
                  <AuditLogs />
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
                <RouteShell fallback={<AnalyticsFallback />}>
                  <GlobalAnalytics />
                </RouteShell>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AnimatedRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
