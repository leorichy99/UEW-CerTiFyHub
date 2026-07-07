import { useEffect, useState, useCallback } from "react";
import { useApiQuery } from "../api/useApiQuery.js";
import { useApiMutation } from "../api/useApiMutation.js";

// ── Queries ──────────────────────────────────────────────────────────────────

export function useEmailDeliverySummary(batchId) {
  return useApiQuery(`/registry/batches/${batchId}/email-delivery-summary/`, {
    enabled: !!batchId,
    refetchInterval: 0,
  });
}

export function useEmailDeliveryFailures(batchId, { status = null, page = 1, pageSize = 50 } = {}) {
  const params = { page, page_size: pageSize };
  if (status) params.status = status;
  return useApiQuery(`/registry/batches/${batchId}/email-delivery-failures/`, {
    enabled: !!batchId,
    params,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useResendConfirmation(batchId) {
  return useApiMutation(
    (recordId) => `/registry/batches/${batchId}/records/${recordId}/resend-confirmation/`,
    { method: "POST" }
  );
}

export function useResendFailedConfirmations(batchId) {
  return useApiMutation(
    `/registry/batches/${batchId}/resend-failed-confirmations/`,
    { method: "POST" }
  );
}

// ── SSE stream with polling fallback ─────────────────────────────────────────

/**
 * Subscribe to the email delivery SSE stream for a batch.
 *
 * Emits live `delivery_progress`, `delivery_failure`, and `delivery_complete`
 * events pushed by the Celery worker via Redis/Channels.
 *
 * If the SSE connection errors (e.g. no Redis, dev mode), falls back to
 * polling the summary REST endpoint every 5 seconds.
 *
 * Returns:
 *   summary   – the latest aggregate counts (or null)
 *   failures  – null (failures are fetched on-demand via useEmailDeliveryFailures)
 *   complete  – true once `delivery_complete` fires
 *   error     – last connection error (or null)
 */
export function useEmailDeliveryStream(batchId, { enabled = true } = {}) {
  const [summary, setSummary] = useState(null);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState(null);
  const [sseAlive, setSseAlive] = useState(false);

  // Polling fallback refetch trigger
  const [pollTick, setPollTick] = useState(0);

  const triggerPoll = useCallback(() => {
    setPollTick((t) => t + 1);
  }, []);

  // REST fallback: poll every 5s when SSE is not alive
  useEffect(() => {
    if (!batchId || !enabled || sseAlive || complete) return undefined;

    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      fetch(`/api/registry/batches/${batchId}/email-delivery-summary/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
        },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && !cancelled) {
            setSummary(data);
            if (data.completion_percentage >= 100) {
              setComplete(true);
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled && !complete) {
            setTimeout(tick, 5000);
          }
        });
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [batchId, enabled, sseAlive, complete, pollTick]);

  // SSE subscription
  useEffect(() => {
    if (!batchId || !enabled) return undefined;

    const token = localStorage.getItem("accessToken") || "";
    const url = `/api/registry/batches/${batchId}/email-delivery/stream/?token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);

    source.addEventListener("delivery_progress", (e) => {
      try {
        const data = JSON.parse(e.data);
        setSummary(data);
        setSseAlive(true);
        setError(null);
      } catch (err) {
        setError(err);
      }
    });

    source.addEventListener("delivery_failure", (e) => {
      try {
        const data = JSON.parse(e.data);
        // The failure event carries per-record info; we just refresh summary
        // The admin can open the failures modal for details.
        setSseAlive(true);
        setError(null);
        // Optionally inject a toast or notification here
        console.warn("Email delivery failure:", data);
      } catch (err) {
        setError(err);
      }
    });

    source.addEventListener("delivery_complete", (e) => {
      try {
        const data = JSON.parse(e.data);
        setSummary(data);
        setComplete(true);
        setSseAlive(true);
        setError(null);
        source.close();
      } catch (err) {
        setError(err);
      }
    });

    source.addEventListener("error", () => {
      setError(new Error("SSE connection error"));
      setSseAlive(false);
      if (source.readyState === EventSource.CLOSED) {
        source.close();
      }
    });

    return () => source.close();
  }, [batchId, enabled]);

  return { summary, complete, error };
}
