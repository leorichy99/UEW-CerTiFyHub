import React, { useMemo, useCallback, useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LogOut,
  AwardIcon,
  FileArchive,
  BarChart3,
  Settings,
  Users,
  LayoutDashboard,
  Brush,
  Shield,
  FileText,
  ShieldCheck,
  FilePlus,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  User,
} from "lucide-react";
import NotificationBell from "./NotificationBell";
import { confirmDialog } from "./ConfirmDialog";
import uewLogo from "../assets/uew-logo.svg";

const SIDEBAR_KEY = "sidebar_collapsed";

function SidebarTooltip({ label, collapsed, children }) {
  if (!collapsed) return children;
  return (
    <div className="group/tip relative">
      {children}
      <div
        role="tooltip"
        className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100"
      >
        {label}
        <span className="absolute -left-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
      </div>
    </div>
  );
}

export default React.memo(function Layout({ children }) {
  const { user, logout, hasPermission, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_KEY) === "true"; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_KEY, String(collapsed)); } catch { /* ignore */ }
  }, [collapsed]);

  const handleLogout = useCallback(async () => {
    const confirmed = await confirmDialog({
      title: "Log Out",
      message: "Are you sure you want to log out of your account?",
      confirmLabel: "Logout",
      variant: "danger",
    });
    if (!confirmed) return;
    logout();
    navigate("/login");
  }, [logout, navigate]);

  const PAGE_TITLES = useMemo(() => ({
    "/dashboard": "Dashboard",
    "/certificates": "Certificates",
    "/students": "Student Management",
    "/templates": "Templates",
    "/bulk-issue": "Bulk Upload & Field Mapping",
    "/create-certificate": "Create Certificate",
    "/certificates/create": "Create Certificate",
    "/certificates/bulk": "Bulk Upload & Field Mapping",
    "/admin/dashboard": "Dashboard",
    "/admin/certificates": "Certificates Management",
    "/admin/users": "User Management",
    "/admin/templates": "Template Repository",
    "/admin/analytics": "Analytics",
    "/admin/audit": "Audit Logs",
    "/admin/settings": "Settings",
    "/admin/invitations": "Admin Invitations",
    "/admin/accounts": "Account Management",
    "/admin/authorisations": "Authorisation Letters",
  }), []);

  const pageTitle = PAGE_TITLES[location.pathname] || "Dashboard";

  const displayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.first_name || user?.username || "User";

  const initials = useMemo(() => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return (user?.username?.[0] || "U").toUpperCase();
  }, [user]);

  const roleLabel = useMemo(() => {
    const role = user?.profile?.role;
    if (role === "SUPER_ADMIN") return "Super Admin";
    if (role === "ADMIN") return "Admin";
    if (role === "STUDENT") return "Student";
    if (role === "EMPLOYER") return "Employer";
    return "";
  }, [user]);

  const linkClass = useCallback(
    ({ isActive }) =>
      `relative w-full text-left transition-all duration-200 flex items-center text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
        collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5 gap-3"
      } ${
        isActive
          ? "bg-[#3b3b89] text-white after:content-[''] after:absolute after:right-0 after:top-0 after:h-full after:w-1 after:bg-red-600 after:rounded-l"
          : "text-white/80 hover:bg-[#3b3b89] hover:text-white"
      }`,
    [collapsed],
  );

  const sidebarWidth = collapsed ? "w-[72px]" : "w-54";

  const renderNavItem = (to, Icon, label) => (
    <li>
      <SidebarTooltip label={label} collapsed={collapsed}>
        <NavLink to={to} className={linkClass} tabIndex={0}>
          <Icon size={20} className="shrink-0" />
          {!collapsed && <span className="truncate">{label}</span>}
        </NavLink>
      </SidebarTooltip>
    </li>
  );

  const renderSectionDivider = (label) =>
    collapsed ? (
      <li aria-hidden className="my-2 mx-3 border-t border-white/10" />
    ) : (
      <li className="pt-4 pb-1 px-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40">
          {label}
        </span>
      </li>
    );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <a href="#main-content" className="sr-skip-link">Skip to content</a>

      {/* Sidebar */}
      <aside
        className={`${sidebarWidth} h-screen bg-(--color-brand-dark) flex flex-col text-white transition-all duration-300 ease-in-out shrink-0`}
      >
        {/* Toggle + Logo */}
        <div className={`flex items-center border-b border-white/10 ${collapsed ? "justify-center p-3" : "justify-between p-4"}`}>
          {!collapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <img src={uewLogo} alt="UEW" className="h-8 w-8 shrink-0" loading="lazy" decoding="async" />
              <span className="font-bold text-white truncate">CerTiFyHub</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed((p) => !p)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-[#3b3b89] hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white/40 outline-none"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto overflow-x-hidden ${collapsed ? "py-3" : "py-4"} space-y-0.5`}>
          <ul className="space-y-0.5">
            {/* Non-SA users: regular dashboard */}
            {!isSuperAdmin && (
              <>
                {renderNavItem("/dashboard", LayoutDashboard, "Dashboard")}
                {hasPermission('certificates.view_all') && renderNavItem("/certificates", FileArchive, "Certificates")}
              </>
            )}

            {/* Permission-gated management section for non-SA */}
            {!isSuperAdmin && (hasPermission('students.view') || hasPermission('certificates.issue')) && (
              <>
                {renderSectionDivider("Management")}
                {hasPermission('students.view') && renderNavItem("/students", Users, "Student Management")}
                {hasPermission('certificates.issue') && (
                  <>
                    {renderSectionDivider("Actions")}
                    {renderNavItem("/create-certificate", FilePlus, "Create Certificate")}
                  </>
                )}
              </>
            )}

            {/* Super Admin navigation */}
            {isSuperAdmin && (
              <>
                {renderNavItem("/admin/dashboard", LayoutDashboard, "Dashboard")}
                {renderSectionDivider("Certificates")}
                {renderNavItem("/admin/certificates", AwardIcon, "Certificates")}
                {renderNavItem("/admin/templates", Brush, "Templates")}
                {renderSectionDivider("Users")}
                {renderNavItem("/admin/accounts", User, "Accounts")}
                {renderNavItem("/admin/authorisations", ShieldCheck, "Authorisations")}
                {renderSectionDivider("Insights")}
                {renderNavItem("/admin/analytics", BarChart3, "Analytics")}
                {renderNavItem("/admin/audit", FileText, "Audit Logs")}
                {renderSectionDivider("Settings")}
                {renderNavItem("/admin/settings", Settings, "Settings")}
              </>
            )}
          </ul>
        </nav>

        {/* Profile footer */}
        <div className={`border-t border-white/10 bg-[#1e1f5f] ${collapsed ? "p-2" : "p-4"}`}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <SidebarTooltip label={`${displayName} (${roleLabel})`} collapsed>
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-[#242576] text-sm font-bold cursor-default"
                  tabIndex={0}
                  role="img"
                  aria-label={`${displayName} (${roleLabel})`}
                >
                  {initials}
                </div>
              </SidebarTooltip>
              <SidebarTooltip label="Log out" collapsed>
                <button
                  onClick={handleLogout}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:text-red-400 hover:bg-white/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  aria-label="Log out"
                  tabIndex={0}
                >
                  <LogOut size={18} />
                </button>
              </SidebarTooltip>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#242576] text-sm font-bold">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white leading-tight truncate">{displayName}</p>
                  {roleLabel && (
                    <p className="text-xs text-white/60 leading-tight truncate">{roleLabel}</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="hover:text-red-400 hover:cursor-pointer text-white/70 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg p-1"
                aria-label="Log out"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <main id="main-content" className="flex-1 h-screen bg-(--color-bg-page) flex flex-col overflow-hidden min-w-0">
        {/* Header bar */}
        <header className="sticky top-0 z-10 flex items-center justify-between bg-white border-b border-slate-200 px-8 py-3 shadow-sm">
          <h1 className="text-lg font-bold text-slate-800 whitespace-nowrap">
            {pageTitle}
          </h1>

          {(location.pathname === "/dashboard" || location.pathname === "/admin/dashboard") ? (
            <div className="relative w-full max-w-md mx-6">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search students, certificates, templates..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
              />
            </div>
          ) : <div className="flex-1" />}

          <div className="flex items-center gap-4 whitespace-nowrap">
            <NotificationBell />
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto transition-all duration-300">
          <div className="mx-auto px-2 md:px-6 py-4">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
});
