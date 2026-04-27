/* eslint-disable react/prop-types */
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { notificationAPI } from '../services/api';
import useNotificationSocket from '../hooks/useNotificationSocket';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const toastRef = useRef(null);

  // Register a toast callback (set by NotificationBell or Layout)
  const registerToast = useCallback((toastFn) => {
    toastRef.current = toastFn;
  }, []);

  // Handle incoming WebSocket message
  const handleWsMessage = useCallback((msg) => {
    if (msg.type === 'unread_count') {
      setUnreadCount(msg.count);
    } else if (msg.type === 'notification') {
      const notif = msg.data;
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Device login notifications belong in Audit Logs only — no toast
      if (notif.notification_type === 'new_device_login') return;

      // Auto-toast for warning/critical
      if (toastRef.current) {
        if (notif.priority === 'critical') {
          toastRef.current.error(notif.title, 8000);
        } else if (notif.priority === 'warning') {
          toastRef.current.warning(notif.title, 6000);
        } else if (notif.priority === 'success') {
          toastRef.current.success(notif.title, 4000);
        }
      }
    }
  }, []);

  const { isConnected, sendMessage } = useNotificationSocket({
    onMessage: handleWsMessage,
    enabled: isAuthenticated,
  });

  // Fetch notifications from REST API
  const fetchNotifications = useCallback(async (category = 'all', page = 1) => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const params = { page, page_size: 20 };
      if (category && category !== 'all') {
        params.category = category;
      }
      const { data } = await notificationAPI.getAll(params);
      const results = data.results || data;
      if (page === 1) {
        setNotifications(results);
      } else {
        setNotifications((prev) => [...prev, ...results]);
      }
      setHasMore(!!data.next);
      pageRef.current = page;
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await notificationAPI.getUnreadCount();
      setUnreadCount(data.count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, [isAuthenticated]);

  // Mark single as read
  const markAsRead = useCallback(async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      // Also tell WS consumer
      sendMessage({ type: 'mark_read', id });
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  }, [sendMessage]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  }, []);

  // Archive notification
  const archiveNotification = useCallback(async (id) => {
    try {
      await notificationAPI.archive(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      // Refresh unread count since an unread one might have been archived
      fetchUnreadCount();
    } catch (err) {
      console.error('Failed to archive notification:', err);
    }
  }, [fetchUnreadCount]);

  // Permanently delete all notifications
  const clearAll = useCallback(async () => {
    try {
      await notificationAPI.clearAll();
      setNotifications([]);
      setUnreadCount(0);
      setHasMore(false);
      pageRef.current = 1;
    } catch (err) {
      console.error('Failed to clear all notifications:', err);
      throw err;
    }
  }, []);

  // Load more (pagination)
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchNotifications(filter, pageRef.current + 1);
    }
  }, [hasMore, loading, filter, fetchNotifications]);

  // Change filter
  const changeFilter = useCallback((newFilter) => {
    setFilter(newFilter);
    pageRef.current = 1;
    fetchNotifications(newFilter, 1);
  }, [fetchNotifications]);

  // Initial fetch on login
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications('all', 1);
      fetchUnreadCount();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, fetchNotifications, fetchUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        filter,
        loading,
        hasMore,
        isConnected,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
        archiveNotification,
        clearAll,
        loadMore,
        changeFilter,
        registerToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
};
