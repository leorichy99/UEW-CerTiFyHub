import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * SSE hook for real-time notifications.
 * Uses fetch() + ReadableStream to support custom headers for JWT authentication.
 */
export default function useNotificationSSE({ onMessage, enabled = true }) {
  const [isConnected, setIsConnected] = useState(false);
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);
  const reconnectDelayRef = useRef(1000);
  const reconnectTimerRef = useRef(null);

  const connect = useCallback(() => {
    if (!mountedRef.current || !enabled) return;

    // Get token from localStorage
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('No access token found for SSE connection');
      return;
    }

    // Check feature flag from environment
    const useSSE = import.meta.env.VITE_USE_SSE_NOTIFICATIONS !== 'false';
    if (!useSSE) {
      console.log('SSE notifications disabled via feature flag');
      return;
    }

    // Close existing connection
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this connection
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const url = `${import.meta.env.VITE_API_URL || ''}/api/notifications/sse/notifications/`;
    
    const processStream = async () => {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`SSE connection failed: ${response.status}`);
        }

        setIsConnected(true);
        reconnectDelayRef.current = 1000; // Reset delay on successful connection
        console.log('SSE connection established');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          if (!mountedRef.current) break;
          
          const { done, value } = await reader.read();
          
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          // Process SSE messages
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data.trim()) {
                try {
                  const parsed = JSON.parse(data);
                  if (onMessage) {
                    onMessage(parsed);
                  }
                } catch (e) {
                  console.error('Failed to parse SSE message:', e);
                }
              }
            } else if (line.startsWith('event: ')) {
              // Handle event types if needed
              const eventType = line.slice(7);
            } else if (line.startsWith('id: ')) {
              // Handle event IDs for reconnection
            }
          }
        }

      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('SSE connection aborted');
          return;
        }
        
        if (!mountedRef.current) return;
        
        console.error('SSE connection error:', error);
        setIsConnected(false);
        
        // Reconnect with exponential backoff
        if (mountedRef.current && enabled) {
          const delay = reconnectDelayRef.current;
          reconnectDelayRef.current = Math.min(delay * 2, 30000); // Max 30 seconds
          
          reconnectTimerRef.current = setTimeout(() => {
            if (mountedRef.current && enabled) {
              connect();
            }
          }, delay);
        }
      }
    };

    processStream();
  }, [enabled, onMessage]);

  const disconnect = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    reconnect: connect,
    disconnect,
  };
}
