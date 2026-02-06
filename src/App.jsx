/* eslint-disable react/prop-types */
import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Layout from "./components/Layout";
import CertificateForm from "./components/CertificateForm";
import CertificatesPage from "./pages/CertificatesPage";
import StudentsPage from "./pages/StudentsPage";
import TemplatesPage from "./pages/TemplatesPage";
import VerificationPage from "./pages/VerificationPage";
import BulkIssuePage from "./pages/BulkIssuePage";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

function DashboardLayout({ children }) {
  return <Layout>{children}</Layout>;
}

function CertificateFormWrapper() {
  const navigate = useNavigate();
  return <CertificateForm onSuccess={() => navigate("/certificates")} />;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (user?.profile?.role === "ADMIN" || user?.is_superuser) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/certificates" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<VerificationPage />} />
          <Route path="/verify/:id" element={<VerificationPage />} />

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
                  <AdminDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/certificates"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CertificatesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/certificates/create"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <DashboardLayout>
                  <CertificateFormWrapper />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/certificates/bulk"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <DashboardLayout>
                  <BulkIssuePage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/students"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <DashboardLayout>
                  <StudentsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/templates"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <DashboardLayout>
                  <TemplatesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
