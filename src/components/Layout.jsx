import React, { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
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
  Building2,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  Bell,
  Menu,
  X,
} from "lucide-react";
import { useNotifications } from "../context/NotificationContext";
import { useToast } from "./ToastContainer";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import uewLogo from "../assets/uew-logo.svg";

const SIDEBAR_KEY = "sidebar_collapsed";
const NAV_SECTION_KEY = "nav_section_";

function AnimatedCollapse({ expanded, children }) {
  return (
    <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
      <div className="overflow-hidden">
        {children}
      </div>
    </div>
  );
}

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

export default React.memo(function Layout({ children, showSearch = true }) {
  const confirm = useConfirmDialog();
  const { user, logout, hasPermission, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_KEY) === "true"; } catch { return false; }
  });

  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState(() => {
    const path = window.location.pathname;
    const sections = {};
    if (path.startsWith('/admin/certificates') || path.startsWith('/admin/templates')) sections.certificates = true;
    if (path.startsWith('/admin/accounts') || path.startsWith('/admin/authorisations')) sections.users = true;
    if (path.startsWith('/admin/analytics') || path.startsWith('/admin/audit')) sections.insights = true;
    if (path.startsWith('/registry') || path.startsWith('/admin/batches') || path.startsWith('/settings/faculties')) sections.registry = true;
    if (path.startsWith('/admin/settings')) sections.settings = true;
    return sections;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const avatarRef = useRef(null);
  const mobileDrawerRef = useRef(null);

  const { unreadCount } = useNotifications();
  const toast = useToast();

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_KEY, String(collapsed)); } catch { /* ignore */ }
  }, [collapsed]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (avatarRef.current && !avatarRef.current.contains(event.target)) {
        setAvatarDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
      if (mobileOpen && mobileDrawerRef.current && !mobileDrawerRef.current.contains(event.target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileOpen]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Register toast for real-time notification toasts
  const { registerToast } = useNotifications();
  useEffect(() => {
    registerToast(toast);
  }, [toast, registerToast]);

  // Keyboard shortcut: Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (collapsed) {
          setCollapsed(false);
        } else {
          searchInputRef.current?.focus();
          setSearchOpen(true);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [collapsed]);

  // Focus search input after sidebar expands from collapsed state
  useEffect(() => {
    if (!collapsed && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }, 320); // slightly longer than sidebar transition (300ms)
      return () => clearTimeout(timer);
    }
  }, [collapsed]);

  // Auto-expand section matching current route so categories stay open on sub-nav click
  useEffect(() => {
    const path = location.pathname;
    const updates = {};
    if (path.startsWith('/admin/certificates') || path.startsWith('/admin/templates')) updates.certificates = true;
    if (path.startsWith('/admin/accounts') || path.startsWith('/admin/authorisations')) updates.users = true;
    if (path.startsWith('/admin/analytics') || path.startsWith('/admin/audit')) updates.insights = true;
    if (path.startsWith('/registry')) updates.registry = true;
    if (path.startsWith('/admin/settings')) updates.settings = true;
    if (Object.keys(updates).length > 0) {
      setExpandedSections(prev => ({ ...prev, ...updates }));
    }
  }, [location.pathname]);

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const [searchLoading, setSearchLoading] = useState(false);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    const results = [];

    try {
      // Search certificates
      if (hasPermission('certificates.view_all')) {
        try {
          const certResponse = await api.get('/certificates/', { params: { search: query, limit: 5 } });
          certResponse.data.results?.forEach(cert => {
            results.push({
              type: 'Certificate',
              label: `${cert.student_name} - ${cert.certificate_number}`,
              sublabel: cert.program,
              path: `/certificates?search=${query}`,
              id: cert.id
            });
          });
        } catch (e) {
          // Ignore search errors
        }
      }

      // Search templates (super admin only)
      if (isSuperAdmin) {
        try {
          const templateResponse = await api.get('/templates/', { params: { search: query, limit: 3 } });
          templateResponse.data.results?.forEach(template => {
            results.push({
              type: 'Template',
              label: template.name,
              sublabel: template.degree_type,
              path: `/admin/templates?search=${query}`,
              id: template.id
            });
          });
        } catch (e) {
          // Ignore search errors
        }

        // Search students
        try {
          const studentResponse = await api.get('/students/', { params: { search: query, limit: 3 } });
          studentResponse.data.results?.forEach(student => {
            results.push({
              type: 'Student',
              label: student.name,
              sublabel: student.index_number || student.student_id,
              path: `/admin/certificates?student=${student.id}`,
              id: student.id
            });
          });
        } catch (e) {
          // Ignore search errors
        }

        // Search accounts
        try {
          const accountResponse = await api.get('/users/accounts/', { params: { search: query, limit: 3 } });
          accountResponse.data.results?.forEach(account => {
            results.push({
              type: 'Account',
              label: account.first_name && account.last_name ? `${account.first_name} ${account.last_name}` : account.username,
              sublabel: account.email,
              path: `/admin/accounts?search=${query}`,
              id: account.id
            });
          });
        } catch (e) {
          // Ignore search errors
        }

        // Search authorisations
        try {
          const authResponse = await api.get('/users/authorisations/', { params: { search: query, limit: 3 } });
          authResponse.data.results?.forEach(auth => {
            results.push({
              type: 'Authorisation',
              label: auth.title || auth.reference_number || 'Authorisation',
              sublabel: auth.department_name,
              path: `/admin/authorisations?search=${query}`,
              id: auth.id
            });
          });
        } catch (e) {
          // Ignore search errors
        }

        // Search faculties
        try {
          const facultyResponse = await api.get('/registry/faculties/', { params: { search: query, limit: 3 } });
          facultyResponse.data.results?.forEach(faculty => {
            results.push({
              type: 'Faculty',
              label: faculty.name,
              sublabel: faculty.code,
              path: `/settings/faculties-departments?search=${query}`,
              id: faculty.id
            });
          });
        } catch (e) {
          // Ignore search errors
        }

        // Search audit logs
        try {
          const auditResponse = await api.get('/analytics/audit-logs/', { params: { search: query, limit: 3 } });
          auditResponse.data.results?.forEach(log => {
            results.push({
              type: 'Audit Log',
              label: log.action || log.title || 'Audit Log',
              sublabel: log.user?.username || log.category,
              path: `/admin/audit?search=${query}`,
              id: log.id
            });
          });
        } catch (e) {
          // Ignore search errors
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    }

    setSearchLoading(false);
    setSearchResults(results.slice(0, 8));
  };

  const handleSearchResultClick = (result) => {
    navigate(result.path);
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleLogout = useCallback(async () => {
    const confirmed = await confirm({
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
    "/dashboard": "DASHBOARD",
    "/certificates": "CERTIFICATES",
    "/registry/faculties": "FACULTIES & DEPARTMENTS",
    "/admin/batches": "CERTIFICATE BATCHES",
    "/templates": "TEMPLATES",
    "/bulk-issue": "BULK UPLOAD & FIELD MAPPING",
    "/certificates/bulk": "BULK CERTIFICATE GENERATION",
    "/admin/dashboard": "DASHBOARD",
    "/admin/certificates": "CERTIFICATES MANAGEMENT",
    "/admin/users": "USER MANAGEMENT",
    "/admin/templates": "TEMPLATE REPOSITORY",
    "/admin/analytics": "ANALYTICS",
    "/admin/audit": "AUDIT LOGS",
    "/admin/settings": "SETTINGS",
    "/admin/invitations": "ADMIN INVITATIONS",
    "/admin/accounts": "ACCOUNT MANAGEMENT",
    "/admin/authorisations": "AUTHORISATION LETTERS",
    "/settings/faculties-departments": "FACULTIES & DEPARTMENTS",
  }), []);

  const pageTitle = (PAGE_TITLES[location.pathname] || "Dashboard");

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
      `relative w-full text-left transition-all duration-200 flex items-center text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand) rounded-lg ${
        collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5 gap-3"
      } ${
        isActive
          ? "bg-(--color-nav-active-bg) text-(--color-nav-active-text)"
          : "text-(--color-text-primary) hover:bg-(--color-nav-hover-bg) hover:text-(--color-nav-hover-text)"
      }`,
    [collapsed],
  );

  const subLinkClass = useCallback(
    ({ isActive }) =>
      `relative w-full text-left transition-all duration-200 flex items-center text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand) rounded-lg ${
        collapsed ? "justify-center px-0 py-2" : "px-3 py-2 pl-6"
      } ${
        isActive
          ? "bg-(--color-nav-active-bg) text-(--color-nav-active-text)"
          : "text-(--color-text-secondary) hover:bg-(--color-nav-hover-bg) hover:text-(--color-nav-hover-text)"
      }`,
    [collapsed],
  );

  const sidebarWidth = collapsed ? "w-[72px]" : "w-48";

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

  const renderSubNavItem = (to, label) => (
    <li>
      <SidebarTooltip label={label} collapsed={collapsed}>
        <NavLink to={to} className={subLinkClass} tabIndex={0}>
          {!collapsed && <span className="truncate">{label}</span>}
        </NavLink>
      </SidebarTooltip>
    </li>
  );

  const renderSectionHeader = (label, sectionKey, Icon) => {
    if (collapsed) {
      return (
        <li>
          <SidebarTooltip label={label} collapsed={collapsed}>
            <button
              onClick={() => {
                setCollapsed(false);
                setExpandedSections(prev => ({ ...prev, [sectionKey]: true }));
              }}
              className="w-full flex items-center justify-center py-2.5 text-(--color-text-primary) hover:bg-(--color-nav-hover-bg) transition-colors rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand)"
            >
              <Icon size={20} />
            </button>
          </SidebarTooltip>
        </li>
      );
    }
    return (
      <li>
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-(--color-text-primary) hover:bg-(--color-nav-hover-bg) transition-colors rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand)"
        >
          <div className="flex items-center gap-3">
            <Icon size={18} className="shrink-0 text-(--color-text-primary)" />
            <span className="truncate">{label}</span>
          </div>
          {expandedSections[sectionKey] ? (
            <ChevronDown size={16} className="shrink-0 text-(--color-text-muted) transition-transform duration-200" />
          ) : (
            <ChevronRight size={16} className="shrink-0 text-(--color-text-muted) transition-transform duration-200" />
          )}
        </button>
      </li>
    );
  };


  return (
    <div className="h-screen bg-(--color-bg-page) flex flex-col overflow-hidden">
      <a href="#main-content" className="sr-skip-link">Skip to content</a>

      {/* Mobile-only header */}
      <header className="md:hidden sticky top-0 bg-linear-to-r from-[#2C2B7C] to-[#3b3b89] text-white flex items-center justify-between px-4 py-2 shrink-0 z-10 border-b border-white/10 shadow-sm">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          {/* Avatar dropdown */}
          <div ref={avatarRef} className="relative">
            <button
              onClick={() => setAvatarDropdownOpen(!avatarDropdownOpen)}
              className="flex items-center gap-2 hover:bg-white/10 rounded-lg px-2 py-1.5 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-[#242576] text-sm font-extrabold overflow-hidden">
                {user?.profile?.avatar ? (
                  <img src={user.profile.avatar} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
            </button>
            {avatarDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                  {roleLabel && <p className="text-xs text-slate-500">{roleLabel}</p>}
                </div>
                <button
                  onClick={() => { setAvatarDropdownOpen(false); navigate('/profile'); }}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <User size={16} /> Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>

          {/* Notification bell — routes to full page */}
          <button
            onClick={() => navigate('/notifications')}
            className="relative flex h-9 w-9 items-center justify-center text-white transition-all duration-200 rounded-lg hover:bg-white/10"
            title="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-extrabold text-white leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Body row: sidebar + main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className={`${sidebarWidth} hidden md:flex flex-col bg-(--color-bg-card) border-r border-(--color-border) transition-all duration-300 ease-in-out shrink-0`}>
          {/* Logo + Name + Collapse */}
          <div className={`flex items-center border-b border-(--color-border) ${collapsed ? 'flex-col gap-2 py-3 px-2' : 'flex-row justify-between px-4 py-3'}`}>
            <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
              <img src={uewLogo} alt="UEW" className="h-8 w-8" loading="lazy" decoding="async" />
              {!collapsed && <span className="font-extrabold text-base lg:text-lg xl:text-xl text-(--color-text-primary)">CertifyHub</span>}
            </div>
            <button
              onClick={() => setCollapsed((p) => !p)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-(--color-text-muted) hover:bg-(--color-nav-hover-bg) hover:text-(--color-text-primary) transition-colors focus-visible:ring-2 focus-visible:ring-(--color-brand) outline-none"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>

          {/* Search */}
          {showSearch && (
            collapsed ? (
              <div className="px-2 pb-2 pt-2">
                <SidebarTooltip label="Search (Ctrl+K)" collapsed={collapsed}>
                  <button
                    onClick={() => setCollapsed(false)}
                    className="w-full flex items-center justify-center py-2.5 text-(--color-text-primary) hover:bg-(--color-nav-hover-bg) transition-colors rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand)"
                    aria-label="Open search"
                  >
                    <Search size={20} />
                  </button>
                </SidebarTooltip>
              </div>
            ) : (
              <div ref={searchRef} className="relative px-2 pb-2 pt-2">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => {
                      handleSearch(e.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    className="w-full pl-9 pr-8 py-2 bg-(--color-bg-page) border border-(--color-border) rounded-lg text-sm text-(--color-text-primary) placeholder-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-(--color-brand) transition-all"
                  />
                  {searchLoading && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 border-2 border-(--color-text-muted) border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {searchOpen && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 mx-2 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50">
                    {searchResults.map((result, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSearchResultClick(result)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                      >
                        <div className="text-xs text-slate-500 mb-1">{result.type}</div>
                        <div className="text-sm font-medium text-slate-900">{result.label}</div>
                        {result.sublabel && <div className="text-xs text-slate-400 mt-0.5">{result.sublabel}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {/* Nav */}
          <nav className={`flex-1 overflow-y-auto overflow-x-hidden ${collapsed ? "py-3" : "py-4"} space-y-0.5`}>
            <ul className="space-y-0.5 px-2">
              {!isSuperAdmin && (
                <>
                  {renderNavItem("/dashboard", LayoutDashboard, "Dashboard")}
                  {hasPermission('certificates.view_all') && renderNavItem("/certificates", FileArchive, "Certificates")}
                </>
              )}
              {isSuperAdmin && (
                <>
                  {renderNavItem("/admin/dashboard", LayoutDashboard, "Dashboard")}
                  {renderSectionHeader("Certificates", "certificates", AwardIcon)}
                  <AnimatedCollapse expanded={!!expandedSections.certificates}>
                    <ul className="pl-2 space-y-0.5">
                      {renderSubNavItem("/admin/certificates", "Certificates")}
                      {renderSubNavItem("/admin/templates", "Templates")}
                    </ul>
                  </AnimatedCollapse>
                  {renderSectionHeader("Users", "users", Users)}
                  <AnimatedCollapse expanded={!!expandedSections.users}>
                    <ul className="pl-2 space-y-0.5">
                      {renderSubNavItem("/admin/accounts", "Accounts")}
                      {renderSubNavItem("/admin/authorisations", "Authorisations")}
                    </ul>
                  </AnimatedCollapse>
                  {renderSectionHeader("Insights", "insights", BarChart3)}
                  <AnimatedCollapse expanded={!!expandedSections.insights}>
                    <ul className="pl-2 space-y-0.5">
                      {renderSubNavItem("/admin/analytics", "Analytics")}
                      {renderSubNavItem("/admin/audit", "Audit Logs")}
                    </ul>
                  </AnimatedCollapse>
                  {renderSectionHeader("Registry", "registry", Building2)}
                  <AnimatedCollapse expanded={!!expandedSections.registry}>
                    <ul className="pl-2 space-y-0.5">
                      {renderSubNavItem("/admin/batches", "Certificate Batches")}
                    </ul>
                  </AnimatedCollapse>
                  {renderSectionHeader("Settings", "settings", Settings)}
                  <AnimatedCollapse expanded={!!expandedSections.settings}>
                    <ul className="pl-2 space-y-0.5">
                      {renderSubNavItem("/settings/faculties-departments", "Faculties & Departments")}
                      {renderSubNavItem("/admin/settings", "Settings")}
                    </ul>
                  </AnimatedCollapse>
                </>
              )}
              {/* Notifications nav item for all users */}
              <li>
                <SidebarTooltip label="Notifications" collapsed={collapsed}>
                  <NavLink to="/notifications" className={linkClass} tabIndex={0}>
                    <Bell size={20} className="shrink-0" />
                    {!collapsed && <span className="truncate">Notifications</span>}
                    {!collapsed && unreadCount > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold text-white leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    {collapsed && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-extrabold text-white leading-none" />
                    )}
                  </NavLink>
                </SidebarTooltip>
              </li>
            </ul>
          </nav>

          {/* User Profile Footer */}
          <div className={`border-t border-(--color-border) ${collapsed ? 'flex flex-col items-center gap-2 py-3 px-2' : 'flex flex-row items-center justify-between px-3 py-3 gap-2'}`}>
            <SidebarTooltip label="Profile" collapsed={collapsed}>
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 rounded-lg hover:bg-(--color-nav-hover-bg) transition-colors outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand)"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-[#242576] text-sm font-extrabold overflow-hidden shrink-0">
                  {user?.profile?.avatar ? (
                    <img src={user.profile.avatar} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                {!collapsed && <span className="text-sm font-medium text-(--color-text-primary) truncate max-w-[80px]">{displayName}</span>}
              </button>
            </SidebarTooltip>
            <SidebarTooltip label="Logout" collapsed={collapsed}>
              <button
                onClick={handleLogout}
                className={`flex items-center gap-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand) ${collapsed ? 'justify-center p-2' : 'px-2 py-1.5'}`}
              >
                <LogOut size={18} />
              </button>
            </SidebarTooltip>
          </div>
        </aside>

        {/* Main content */}
        <main id="main-content" className="flex-1 overflow-y-auto min-w-0">
          <div className="mx-auto px-4 md:px-8 py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile drawer — always rendered, transitions via translate-x */}
      <div
        className={`fixed inset-0 z-40 backdrop-blur-sm transition-opacity duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      />
      <div
        ref={mobileDrawerRef}
        className={`fixed top-0 left-0 h-full w-72 bg-(--color-bg-card) border-r border-(--color-border) z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between py-3 border-b border-(--color-border)">
          <div className="flex items-center gap-2">
            <img src={uewLogo} alt="UEW" className="h-8 w-8" />
            <span className="text-xs text-(--color-text-primary)">CerTiFyHub</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-(--color-text-muted) hover:bg-(--color-nav-hover-bg) transition-colors" aria-label="Close navigation menu">
            <X size={18} />
          </button>
        </div>

        {/* Mobile Search */}
        {showSearch && (
          <div className="relative px-3 py-2 border-b border-(--color-border)">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  handleSearch(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                className="w-full pl-9 pr-8 py-2 bg-(--color-bg-page) border border-(--color-border) rounded-lg text-sm text-(--color-text-primary) placeholder-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-(--color-brand) transition-all"
              />
              {searchLoading && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 border-2 border-(--color-text-muted) border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 mx-3 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSearchResultClick(result)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                  >
                    <div className="text-xs text-slate-500 mb-1">{result.type}</div>
                    <div className="text-sm font-medium text-slate-900">{result.label}</div>
                    {result.sublabel && <div className="text-xs text-slate-400 mt-0.5">{result.sublabel}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          <ul className="space-y-0.5">
            {!isSuperAdmin && (
              <>
                <li><NavLink to="/dashboard" onClick={() => setMobileOpen(false)} className={({isActive}) => `w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors ${isActive ? "bg-(--color-nav-active-bg) text-(--color-nav-active-text)" : "text-(--color-text-primary) hover:bg-(--color-nav-hover-bg)"}`}><LayoutDashboard size={20} /> Dashboard</NavLink></li>
                {hasPermission('certificates.view_all') && (
                  <li><NavLink to="/certificates" onClick={() => setMobileOpen(false)} className={({isActive}) => `w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors ${isActive ? "bg-(--color-nav-active-bg) text-(--color-nav-active-text)" : "text-(--color-text-primary) hover:bg-(--color-nav-hover-bg)"}`}><FileArchive size={20} /> Certificates</NavLink></li>
                )}
              </>
            )}
            {isSuperAdmin && (
              <>
                <li><NavLink to="/admin/dashboard" onClick={() => setMobileOpen(false)} className={({isActive}) => `w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors ${isActive ? "bg-(--color-nav-active-bg) text-(--color-nav-active-text)" : "text-(--color-text-primary) hover:bg-(--color-nav-hover-bg)"}`}><LayoutDashboard size={20} /> Dashboard</NavLink></li>

                <li><button onClick={() => toggleSection('certificates')} className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-(--color-text-primary) hover:bg-(--color-nav-hover-bg) transition-colors rounded-lg"><div className="flex items-center gap-3"><AwardIcon size={18} /> Certificates</div>{expandedSections.certificates ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button></li>
                <AnimatedCollapse expanded={!!expandedSections.certificates}>
                  <ul className="pl-2 space-y-0.5">
                    <li><NavLink to="/admin/certificates" onClick={() => setMobileOpen(false)} className={({isActive}) => `w-full flex items-center px-3 py-2 pl-6 text-sm font-medium rounded-lg transition-colors ${isActive ? "bg-(--color-nav-active-bg) text-(--color-nav-active-text)" : "text-(--color-text-secondary) hover:bg-(--color-nav-hover-bg) hover:text-(--color-nav-hover-text)"}`}>Certificates</NavLink></li>
                    <li><NavLink to="/admin/templates" onClick={() => setMobileOpen(false)} className={({isActive}) => `w-full flex items-center px-3 py-2 pl-6 text-sm font-medium rounded-lg transition-colors ${isActive ? "bg-(--color-nav-active-bg) text-(--color-nav-active-text)" : "text-(--color-text-secondary) hover:bg-(--color-nav-hover-bg) hover:text-(--color-nav-hover-text)"}`}>Templates</NavLink></li>
                  </ul>
                </AnimatedCollapse>

                <li><button onClick={() => toggleSection('users')} className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-(--color-text-primary) hover:bg-(--color-nav-hover-bg) transition-colors rounded-lg"><div className="flex items-center gap-3"><Users size={18} /> Users</div>{expandedSections.users ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button></li>
                <AnimatedCollapse expanded={!!expandedSections.users}>
                  <ul className="pl-2 space-y-0.5">
                    <li><NavLink to="/admin/accounts" onClick={() => setMobileOpen(false)} className={({isActive}) => `w-full flex items-center px-3 py-2 pl-6 text-sm font-medium rounded-lg transition-colors ${isActive ? "bg-(--color-nav-active-bg) text-(--color-nav-active-text)" : "text-(--color-text-secondary) hover:bg-(--color-nav-hover-bg) hover:text-(--color-nav-hover-text)"}`}>Accounts</NavLink></li>
                    <li><NavLink to="/admin/authorisations" onClick={() => setMobileOpen(false)} className={({isActive}) => `w-full flex items-center px-3 py-2 pl-6 text-sm font-medium rounded-lg transition-colors ${isActive ? "bg-(--color-nav-active-bg) text-(--color-nav-active-text)" : "text-(--color-text-secondary) hover:bg-(--color-nav-hover-bg) hover:text-(--color-nav-hover-text)"}`}>Authorisations</NavLink></li>
                  </ul>
                </AnimatedCollapse>

                <li><button onClick={() => toggleSection('insights')} className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-(--color-text-primary) hover:bg-(--color-nav-hover-bg) transition-colors rounded-lg"><div className="flex items-center gap-3"><BarChart3 size={18} /> Insights</div>{expandedSections.insights ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button></li>
                <AnimatedCollapse expanded={!!expandedSections.insights}>
                  <ul className="pl-2 space-y-0.5">
                    <li><NavLink to="/admin/analytics" onClick={() => setMobileOpen(false)} className={({isActive}) => `w-full flex items-center px-3 py-2 pl-6 text-sm font-medium rounded-lg transition-colors ${isActive ? "bg-(--color-nav-active-bg) text-(--color-nav-active-text)" : "text-(--color-text-secondary) hover:bg-(--color-nav-hover-bg) hover:text-(--color-nav-hover-text)"}`}>Analytics</NavLink></li>
                    <li><NavLink to="/admin/audit" onClick={() => setMobileOpen(false)} className={({isActive}) => `w-full flex items-center px-3 py-2 pl-6 text-sm font-medium rounded-lg transition-colors ${isActive ? "bg-(--color-nav-active-bg) text-(--color-nav-active-text)" : "text-(--color-text-secondary) hover:bg-(--color-nav-hover-bg) hover:text-(--color-nav-hover-text)"}`}>Audit Logs</NavLink></li>
                  </ul>
                </AnimatedCollapse>

                <li><button onClick={() => toggleSection('registry')} className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-(--color-text-primary) hover:bg-(--color-nav-hover-bg) transition-colors rounded-lg"><div className="flex items-center gap-3"><Building2 size={18} /> Registry</div>{expandedSections.registry ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button></li>
                <AnimatedCollapse expanded={!!expandedSections.registry}>
                  <ul className="pl-2 space-y-0.5">
                    <li><NavLink to="/admin/batches" onClick={() => setMobileOpen(false)} className={({isActive}) => `w-full flex items-center px-3 py-2 pl-6 text-sm font-medium rounded-lg transition-colors ${isActive ? "bg-(--color-nav-active-bg) text-(--color-nav-active-text)" : "text-(--color-text-secondary) hover:bg-(--color-nav-hover-bg) hover:text-(--color-nav-hover-text)"}`}>Certificate Batches</NavLink></li>
                  </ul>
                </AnimatedCollapse>

                <li><button onClick={() => toggleSection('settings')} className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-(--color-text-primary) hover:bg-(--color-nav-hover-bg) transition-colors rounded-lg"><div className="flex items-center gap-3"><Settings size={18} /> Settings</div>{expandedSections.settings ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button></li>
                <AnimatedCollapse expanded={!!expandedSections.settings}>
                  <ul className="pl-2 space-y-0.5">
                    <li><NavLink to="/settings/faculties-departments" onClick={() => setMobileOpen(false)} className={({isActive}) => `w-full flex items-center px-3 py-2 pl-6 text-sm font-medium rounded-lg transition-colors ${isActive ? "bg-(--color-nav-active-bg) text-(--color-nav-active-text)" : "text-(--color-text-secondary) hover:bg-(--color-nav-hover-bg) hover:text-(--color-nav-hover-text)"}`}>Faculties & Departments</NavLink></li>
                    <li><NavLink to="/admin/settings" onClick={() => setMobileOpen(false)} className={({isActive}) => `w-full flex items-center px-3 py-2 pl-6 text-sm font-medium rounded-lg transition-colors ${isActive ? "bg-(--color-nav-active-bg) text-(--color-nav-active-text)" : "text-(--color-text-secondary) hover:bg-(--color-nav-hover-bg) hover:text-(--color-nav-hover-text)"}`}>Settings</NavLink></li>
                  </ul>
                </AnimatedCollapse>
              </>
            )}
            {/* Notifications link */}
            <li>
              <NavLink to="/notifications" onClick={() => setMobileOpen(false)} className={({isActive}) => `w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors ${isActive ? "bg-(--color-nav-active-bg) text-(--color-nav-active-text)" : "text-(--color-text-primary) hover:bg-(--color-nav-hover-bg)"}`}>
                <Bell size={20} />
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold text-white leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Mobile Profile Section */}
        <div className="border-t border-(--color-border) px-3 py-3">
          <div className="relative">
            <button
              onClick={() => setAvatarDropdownOpen(!avatarDropdownOpen)}
              className="w-full flex items-center gap-3 rounded-lg hover:bg-(--color-nav-hover-bg) transition-colors px-2 py-2"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-[#242576] text-sm font-extrabold overflow-hidden">
                {user?.profile?.avatar ? (
                  <img src={user.profile.avatar} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-(--color-text-primary)">{displayName}</p>
                {roleLabel && <p className="text-xs text-(--color-text-muted)">{roleLabel}</p>}
              </div>
              <ChevronDown size={16} className={`text-(--color-text-muted) transition-transform ${avatarDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {avatarDropdownOpen && (
              <div className="mt-1 bg-(--color-bg-page) rounded-lg border border-(--color-border) overflow-hidden">
                <button
                  onClick={() => { setAvatarDropdownOpen(false); setMobileOpen(false); navigate('/profile'); }}
                  className="w-full px-4 py-2.5 text-left text-sm text-(--color-text-primary) hover:bg-(--color-nav-hover-bg) transition-colors flex items-center gap-2"
                >
                  <User size={16} /> Profile
                </button>
                <button
                  onClick={() => { setAvatarDropdownOpen(false); handleLogout(); }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
