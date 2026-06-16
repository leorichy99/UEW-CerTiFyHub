import { useEffect, useState } from "react";

/**
 * Subscribe to the per-session SSE progress stream.
 *
 * The stream emits a `progress` event whenever the session status or
 * record counts change. Returns the most recent payload (or `null` until
 * the first event arrives). Pass `enabled=false` to tear the connection
 * down (e.g. when the session is in a terminal state).
 */
export function useSessionProgress(sessionId, { enabled = true } = {}) {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId || !enabled) return undefined;

    const token = localStorage.getItem("accessToken") || "";
    const url = `/api/registry/batches/${sessionId}/progress/stream/?token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);

    source.addEventListener("progress", (e) => {
      try { setSnapshot(JSON.parse(e.data)); }
      catch (err) { setError(err); }
    });
    source.addEventListener("error", () => {
      setError(new Error("SSE connection error"));
      // EventSource auto-reconnects; close manually if the server returned 4xx
      if (source.readyState === EventSource.CLOSED) source.close();
    });

    return () => source.close();
  }, [sessionId, enabled]);

  return { snapshot, error };
}
