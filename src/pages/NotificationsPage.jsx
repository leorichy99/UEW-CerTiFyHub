import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell, CheckCheck, Archive, Search, MoreHorizontal, Loader2, ChevronDown,
  Award, Shield, Settings, AlertTriangle, Info,
  CheckCircle, XCircle,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useToast } from '../components/ToastContainer';
import { useConfirmDialog } from '../context/ConfirmDialogContext';
import PageTitle from '../components/PageTitle';
import Table from '../components/ui/Table';

const TYPE_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'certificates', label: 'Certificates' },
  { key: 'security', label: 'Security' },
  { key: 'system', label: 'System' },
];

const TABS = ['unread', 'read'];

function getNotificationIcon(type, priority) {
  const size = 18;
  switch (type) {
    case 'certificate_issued':
    case 'certificate_reactivated':
    case 'bulk_issuance_complete':
      return <Award size={size} className="text-emerald-500" />;
    case 'certificate_revoked':
      return <XCircle size={size} className="text-red-500" />;
    case 'suspicious_verification':
    case 'new_device_login':
      return <AlertTriangle size={size} className="text-amber-500" />;
    case 'admin_created':
    case 'template_locked':
    case 'config_changed':
      return <Settings size={size} className="text-blue-500" />;
    case 'verification_attempt':
      return <Shield size={size} className="text-blue-500" />;
    default:
      if (priority === 'critical') return <AlertTriangle size={size} className="text-red-500" />;
      if (priority === 'warning') return <AlertTriangle size={size} className="text-amber-500" />;
      if (priority === 'success') return <CheckCircle size={size} className="text-emerald-500" />;
      return <Info size={size} className="text-blue-500" />;
  }
}

function timeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

function getNotificationTypeLabel(type) {
  const labels = {
    certificate_issued: 'Certificates',
    certificate_reactivated: 'Certificates',
    bulk_issuance_complete: 'Certificates',
    certificate_revoked: 'Certificates',
    suspicious_verification: 'Security',
    new_device_login: 'Security',
    verification_attempt: 'Security',
    admin_created: 'System',
    template_locked: 'System',
    config_changed: 'System',
  };
  return labels[type] || 'General';
}

function NotificationActionsMenu({ notif, onMarkRead, onArchive }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  useEffect(() => {
    const handle = (e) => {
      if (!e.target.closest(`[data-menu-id="${notif.id}"]`)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, notif.id]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        left: rect.left + rect.width - 160, // align right edge (w-40 = 160px)
      });
    }
  };

  return (
    <div className="relative" data-menu-id={notif.id}>
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
        title="Actions"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div
          className="fixed w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 origin-top-right transition-all duration-150 ease-out"
          style={{ top: pos.top, left: pos.left }}
        >
          {!notif.is_read && (
            <button
              onClick={() => { onMarkRead(); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
            >
              Mark as read
            </button>
          )}
          <button
            onClick={() => { onArchive(); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition"
          >
            Archive
          </button>
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const confirm = useConfirmDialog();
  const toast = useToast();
  const {
    notifications,
    unreadCount,
    filter,
    loading,
    hasMore,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    loadMore,
    changeFilter,
    registerToast,
    clearAll,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState('unread');
  const [searchQuery, setSearchQuery] = useState('');

  // Register toast so context can trigger toasts for real-time notifications
  useEffect(() => {
    registerToast(toast);
  }, [toast, registerToast]);

  // Filter out device login notifications
  const baseNotifications = notifications.filter(
    (n) => n.notification_type !== 'new_device_login'
  );

  // Client-side search + tab filter
  const filteredNotifications = baseNotifications.filter((n) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (n.title?.toLowerCase().includes(q) || n.message?.toLowerCase().includes(q));
    const matchesTab =
      activeTab === 'unread' ? !n.is_read : n.is_read;
    return matchesSearch && matchesTab;
  });

  const handleClearAll = useCallback(async () => {
    const ok = await confirm({
      title: 'Clear All Notifications',
      message: 'Permanently delete all notifications? This cannot be undone.',
      confirmLabel: 'Clear All',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await clearAll();
      toast.success('All notifications deleted');
    } catch (err) {
      toast.error('Failed to clear notifications');
    }
  }, [confirm, clearAll, toast]);

  return (
    <div className="">
      <PageTitle className="mb-5">Notifications</PageTitle>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative pb-2.5 text-sm font-medium transition ${
              activeTab === tab
                ? 'text-purple-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'unread' ? (
              <>
                Unread
                {unreadCount > 0 && (
                  <span className="ml-1.5 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">
                    {unreadCount}
                  </span>
                )}
              </>
            ) : (
              'Read'
            )}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for notification"
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-purple-400 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => changeFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-purple-400 transition cursor-pointer"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50 rounded-lg transition"
              title="Mark all as read"
            >
              <CheckCheck size={16} />
              <span>Mark all as read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Clear all notifications"
            >
              <Archive size={16} />
              <span>Clear all</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredNotifications.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Bell size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No notifications</p>
          </div>
        ) : (
          <>
            <Table>
              <Table.Head>
                <Table.HeaderCell>Notification</Table.HeaderCell>
                <Table.HeaderCell className="w-24">Type</Table.HeaderCell>
                <Table.HeaderCell className="w-32">Time</Table.HeaderCell>
                <Table.HeaderCell className="w-24">Status</Table.HeaderCell>
                <Table.HeaderCell className="w-10" />
              </Table.Head>
              <Table.Body>
                {filteredNotifications.map((notif) => (
                  <Table.Row key={notif.id}>
                    <Table.Cell>
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 shrink-0">
                          {getNotificationIcon(notif.notification_type, notif.priority)}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm leading-snug ${notif.is_read ? 'text-slate-600' : 'text-slate-800 font-medium'}`}>
                            {notif.title}
                          </p>
                          {notif.message && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{notif.message}</p>
                          )}
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                        {getNotificationTypeLabel(notif.notification_type)}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-xs text-slate-500">{timeAgo(notif.created_at)}</span>
                    </Table.Cell>
                    <Table.Cell>
                      {notif.is_read ? (
                        <span className="text-xs text-slate-500">read</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">
                          unread
                        </span>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <NotificationActionsMenu
                        notif={notif}
                        onMarkRead={() => markAsRead(notif.id)}
                        onArchive={() => archiveNotification(notif.id)}
                      />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center py-4 border-t border-slate-100">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs text-purple-700 hover:text-purple-800 font-medium transition disabled:opacity-50"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
                  <span>{loading ? 'Loading...' : 'Load more'}</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
