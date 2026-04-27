import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles = [], requiredPermission }) {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect users who haven't completed first-login setup
  if (user.profile && !user.profile.first_login_completed && !location.pathname.startsWith('/setup-account')) {
    return <Navigate to="/login" replace />;
  }

  // Role-based gating (legacy compat + SA-only routes)
  if (roles.length > 0 && !roles.includes(user.profile?.role)) {
    const userRole = user?.profile?.role;
    
    if (userRole === "SUPER_ADMIN") {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (userRole === "ADMIN") {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/certificates" replace />;
  }

  // Granular permission gating
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
