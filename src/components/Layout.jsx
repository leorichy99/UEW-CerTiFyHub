import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  LogOut,
  PlusCircle,
  FileArchive,
  BarChart3,
  Settings,
  Users,
  Layout as LayoutIcon,
  Brush,
  Sparkles,
  Shield,
} from "lucide-react";
import uewLogo from "../assets/uew-logo.svg";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const linkClass = ({ isActive }) =>
    `relative w-full text-left px-3 py-2.5 rounded-md transition flex items-center gap-3 text-sm font-medium ${
      isActive
        ? "bg-slate-100 text-slate-900 after:content-[''] after:absolute after:right-0 after:top-0 after:h-full after:w-1 after:bg-blue-600 after:rounded-l"
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    }`;

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      {/* Left fixed column (header + sidebar) */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-white text-slate-700 border-r border-slate-200 shadow-sm flex flex-col z-10 transition-all duration-300">
        <div className="flex items-center gap-3 px-5 py-6 border-b border-slate-200 bg-white">
          <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <img src={uewLogo} alt="UEW-logo" className="h-6 w-6 object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold tracking-wide text-slate-900 truncate">
              UEW CerTiFyHub
            </h1>
            <p className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase">
              {user?.profile?.role || "Guest"}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 overflow-auto py-4 bg-white">
          <ul className="space-y-1">
            {(user?.profile?.role === "ADMIN" || user?.is_superuser) && (
              <>
                <li>
                  <NavLink to="/dashboard" className={linkClass}>
                    <LayoutIcon size={20} />
                    <span>Dashboard</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/analytics" className={linkClass}>
                    <BarChart3 size={20} />
                    <span>Analytics</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/certificates/create" className={linkClass}>
                    <PlusCircle size={20} />
                    <span>Create Certificate</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/certificates/bulk" className={linkClass}>
                    <Sparkles size={20} />
                    <span>Bulk Issuance</span>
                  </NavLink>
                </li>
              </>
            )}
            <li>
              <NavLink to="/certificates" end className={linkClass}>
                <FileArchive size={20} />
                <span>All Certificates</span>
              </NavLink>
            </li>

            {(user?.profile?.role === "ADMIN" || user?.is_superuser) && (
              <>
                <li>
                  <NavLink to="/students" className={linkClass}>
                    <Users size={20} />
                    <span>Student Management</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/templates" className={linkClass}>
                    <Brush size={20} />
                    <span>Templates</span>
                  </NavLink>
                </li>
                {user?.profile?.role === "SUPER_ADMIN" && (
                  <>
                    <li>
                      <NavLink to="/admin/dashboard" className={linkClass}>
                        <LayoutIcon size={20} />
                        <span>Super Admin Dashboard</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to="/admin/users" className={linkClass}>
                        <Shield size={20} />
                        <span>Admin Management</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to="/admin/analytics" className={linkClass}>
                        <BarChart3 size={20} />
                        <span>Global Analytics</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to="/admin/audit" className={linkClass}>
                        <FileText size={20} />
                        <span>Audit Logs</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to="/admin/settings" className={linkClass}>
                        <Settings size={20} />
                        <span>System Settings</span>
                      </NavLink>
                    </li>
                  </>
                )}
              </>
            )}

            <li className="pt-4 mt-3 border-t border-slate-200">
              <button
                disabled
                className="w-full text-left px-3 py-2.5 rounded-md flex items-center gap-3 transition opacity-50 cursor-not-allowed text-sm font-medium"
              >
                <Settings size={20} />
                <span className="text-sm">Settings</span>
              </button>
            </li>
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-200 bg-white">

          {/* user details */}
          {/* <div className="mb-3 flex items-center gap-3 px-3 py-3 rounded-lg border border-slate-200 bg-white">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700">
              {user?.username?.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate text-slate-900">
                {user?.username}
              </p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div> */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#E6232B] hover:bg-[#CE3744] text-white text-sm transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="ml-64 h-dvh transition-all duration-300 bg-[#F8FAFC]">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-7xl mx-auto px-8 py-10"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
