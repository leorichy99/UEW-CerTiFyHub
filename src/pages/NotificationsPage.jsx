import { useEffect, useCallback } from 'react';
import {
  Bell, Check, CheckCheck, Archive, Filter,
  Award, Shield, Settings, AlertTriangle, Info,
  CheckCircle, XCircle, ChevronDown, Loader2,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useToast } from '../components/ToastContainer';
import { useConfirmDialog } from '../context/ConfirmDialogContext';
import PageTitle from '../components/PageTitle';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'certificates', label: 'Certificates' },
  { key: 'security', label: 'Security' },
  { key: 'system', label: 'System' },
];

function getNotificationIcon(type, priority) {
  const size = 16;
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

function getPriorityBorder(priority) {
  switch (priority) {
    case 'critical': return 'border-l-red-500';
    case 'warning': return 'border-l-amber-400';
    case 'success': return 'border-l-emerald-400';
    default: return 'border-l-blue-400';
  }
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

  // Register toast so context can trigger toasts for real-time notifications
  useEffect(() => {
    registerToast(toast);
  }, [toast, registerToast]);

  const handleFilterChange = useCallback((key) => {
    if (key === 'unread') {
      changeFilter('all');
    } else {
      changeFilter(key);
    }
  }, [changeFilter]);

  // Filter out device login notifications — those belong in Audit Logs only
  const activeTabNotifications = notifications.filter(
    (n) => n.notification_type !== 'new_device_login'
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <PageTitle>Notifications</PageTitle>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
              title="Mark all as read"
            >
              <CheckCheck size={16} />
              <span>Mark all read</span>
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={async () => {
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
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Clear all notifications"
            >
              <Archive size={16} />
              <span>Clear all</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleFilterChange(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              filter === tab.key || (tab.key === 'all' && filter === 'all')
                ? 'bg-blue-100 text-blue-700'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {tab.key === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {activeTabNotifications.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Bell size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No notifications</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {activeTabNotifications.map((notif) => (
              <li
                key={notif.id}
                className={`group flex items-start gap-3 px-5 py-4 transition cursor-pointer border-l-2 ${
                  getPriorityBorder(notif.priority)
                } ${notif.is_read ? 'bg-white' : 'bg-blue-50/40'} hover:bg-slate-50`}
                onClick={() => {
                  if (!notif.is_read) markAsRead(notif.id);
                }}
              >
                {/* Icon */}
                <div className="mt-0.5 shrink-0">
                  {getNotificationIcon(notif.notification_type, notif.priority)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-snug ${notif.is_read ? 'text-slate-600' : 'text-slate-800 font-medium'}`}>
                      {notif.title}
                    </p>
                    {!notif.is_read && (
                      <span className="shrink-0 h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                    )}
                  </div>
                  {notif.message && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notif.message}</p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1.5">{timeAgo(notif.created_at)}</p>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  {!notif.is_read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-blue-600 transition"
                      title="Mark as read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); archiveNotification(notif.id); }}
                    className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
                    title="Archive"
                  >
                    <Archive size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Load More */}
        {hasMore && (
          <div className="flex justify-center py-4 border-t border-slate-100">
            <button
              onClick={loadMore}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
              <span>{loading ? 'Loading...' : 'Load more'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
