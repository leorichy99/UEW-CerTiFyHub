import { useEffect, useRef, useState, useCallback } from 'react';

// In dev, Vite proxies /ws → backend. In production, connect to same host.
const WS_BASE = import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
const MAX_RECONNECT_DELAY = 30000;

/**
 * WebSocket hook for real-time notifications.
 * Connects after login, auto-reconnects with exponential backoff.
 */
export default function useNotificationSocket({ onMessage, enabled = true }) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectDelay = useRef(1000);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    if (!token || !enabled) return;

    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    const url = `${WS_BASE}/ws/notifications/?token=${token}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setIsConnected(true);
      reconnectDelay.current = 1000; // Reset backoff on successful connect
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch (e) {
        console.error('Notification WS parse error:', e);
      }
    };

    ws.onclose = (event) => {
      if (!mountedRef.current) return;
      setIsConnected(false);
      wsRef.current = null;

      // Don't reconnect if closed cleanly (e.g. logout)
      if (event.code === 1000) return;

      // Exponential backoff reconnect
      const delay = Math.min(reconnectDelay.current, MAX_RECONNECT_DELAY);
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = delay * 2;
        connect();
      }, delay);
    };

    ws.onerror = () => {
      // onclose will fire after this — reconnect handled there
    };
  }, [enabled, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close(1000, 'logout');
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      connect();
    }
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return { isConnected, disconnect, sendMessage };
}
