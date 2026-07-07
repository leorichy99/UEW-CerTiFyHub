import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Shield, CheckCircle, XCircle, Plus, Loader2, Clock,
} from "lucide-react";
import { superAdminAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

function formatTimeAgo(ts) {
  const t = typeof ts === "string" ? new Date(ts).getTime() : ts;
  if (!Number.isFinite(t)) return "Recently";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getGroupLabel(ts) {
  const t = typeof ts === "string" ? new Date(ts).getTime() : ts;
  if (!Number.isFinite(t)) return "Earlier";
  const now = new Date();
  const date = new Date(t);
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return "Yesterday";

  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function classifyAction(action = "") {
  const a = action.toLowerCase();
  if (a.includes("issue") || a.includes("create") || a.includes("provision") || a.includes("mined")) return "issued";
  if (a.includes("revoke") || a.includes("deactivat")) return "revoked";
  if (a.includes("bulk") || a.includes("import")) return "imports";
  if (a.includes("permission") || a.includes("admin") || a.includes("role") || a.includes("unlock")) return "admin_changes";
  return "other";
}

function getActionIcon(actionType) {
  switch (actionType) {
    case "issued": return CheckCircle;
    case "revoked": return XCircle;
    case "imports": return Plus;
    case "admin_changes": return Shield;
    default: return Clock;
  }
}

function getActionColor(actionType) {
  switch (actionType) {
    case "issued": return "text-emerald-600";
    case "revoked": return "text-rose-600";
    case "imports": return "text-violet-600";
    case "admin_changes": return "text-amber-600";
    default: return "text-slate-500";
  }
}

function getActionBg(actionType) {
  switch (actionType) {
    case "issued": return "bg-emerald-50/70";
    case "revoked": return "bg-rose-50/70";
    case "imports": return "bg-violet-50/70";
    case "admin_changes": return "bg-amber-50/70";
    default: return "bg-slate-50";
  }
}

function getNodeDot(actionType) {
  switch (actionType) {
    case "issued": return "bg-emerald-500 ring-emerald-100";
    case "revoked": return "bg-rose-500 ring-rose-100";
    case "imports": return "bg-violet-500 ring-violet-100";
    case "admin_changes": return "bg-amber-500 ring-amber-100";
    default: return "bg-slate-400 ring-slate-100";
  }
}

function interpretLog(log) {
  const actionType = classifyAction(log.action);
  const Icon = getActionIcon(actionType);

  // Extract certificate ID and program from target or details if available
  const target = log.target || "";
  const certificateId = target.match(/CERT-\w+/)?.[0] || log.certificate_id || "—";
  const program = log.program || target.match(/program:\s*(\w+)/)?.[1] || "—";

  return {
    id: log.id,
    action: log.action || "System event",
    target: log.target || "—",
    status: log.status === "success" ? "success" : log.status === "failed" ? "failed" : "info",
    timeAgo: formatTimeAgo(log.timestamp),
    group: getGroupLabel(log.timestamp),
    actionType,
    Icon,
    user: log.user || log.username || "System",
    actor: log.user || log.username || "System",
    certificateId,
    program,
    details: {
      ip: log.ip_address || "—",
      timestamp: new Date(log.timestamp).toLocaleString("en-US"),
      changes: log.details || "",
    },
  };
}

export default function AdminActivityTimeline({ onViewAll }) {
  const { user, isAuthenticated } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const eventSourceRef = useRef(null);

  // Check SSE feature flag
  const useSSE = import.meta.env.VITE_USE_SSE_AUDIT_LOGS !== 'false';

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await superAdminAPI.getAuditLogs({
        category: "admin",
        page: 1,
        page_size: 50,
      });
      const results = data.results || data || [];
      setLogs(results.map(interpretLog));
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // SSE connection for real-time audit log updates
  useEffect(() => {
    if (!useSSE || !isAuthenticated) {
      if (eventSourceRef.current) {
        eventSourceRef.current.abort();
        eventSourceRef.current = null;
      }
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.abort();
    }

    const abortController = new AbortController();
    eventSourceRef.current = abortController;

    const url = `${import.meta.env.VITE_API_URL || ''}/api/notifications/sse/audit-logs/`;
    let reconnectTimer = null;
    let reconnectDelay = 2000; // ms

    const connect = async () => {
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

        setIsLive(true);
        reconnectDelay = 2000; // Reset on successful connection
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data.trim()) {
                try {
                  const parsed = JSON.parse(data);
                  const newLog = interpretLog(parsed);
                  setLogs((prev) => {
                    const exists = prev.some(log => log.id === newLog.id);
                    if (exists) return prev;
                    return [newLog, ...prev];
                  });
                } catch (e) {
                  console.error('Failed to parse SSE audit log message:', e);
                }
              }
            }
          }
        }

        // Stream ended gracefully — reconnect
        if (!abortController.signal.aborted) {
          setIsLive(false);
          reconnectDelay = Math.min(reconnectDelay * 2, 30000);
          reconnectTimer = setTimeout(connect, reconnectDelay);
        }
      } catch (error) {
        setIsLive(false);
        if (error.name === 'AbortError' || abortController.signal.aborted) {
          console.log('SSE audit log connection aborted');
          return;
        }
        console.error('SSE audit log connection error:', error);
        eventSourceRef.current = null;
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
        reconnectTimer = setTimeout(connect, reconnectDelay);
      }
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (eventSourceRef.current) {
        eventSourceRef.current.abort();
        eventSourceRef.current = null;
      }
    };
  }, [useSSE, isAuthenticated]);

  // Initial fetch
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = useMemo(() => logs.slice(0, 5), [logs]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((log) => {
      if (!map[log.group]) map[log.group] = [];
      map[log.group].push(log);
    });
    return Object.entries(map);
  }, [filtered]);

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.4, delay: 0.1 }}
      className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col overflow-hidden"
    >
      {/* Sticky Header */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 bg-white/95 backdrop-blur-sm">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Activity Timeline</h2>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onViewAll}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="View all activity"
          >
            View all
          </button>
        </div>
      </div>

      {/* Vertical Timeline */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 timeline-scroll"
        style={{ maxHeight: "520px" }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-sm text-slate-500">
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            <span className="text-xs">Loading activity…</span>
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-12 text-slate-400">
            <Shield size={22} className="text-slate-300" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-600">No recent activity</p>
            <p className="text-xs text-slate-400">Actions will appear here as they occur.</p>
          </div>
        ) : (
          <div>
            {grouped.map(([group, items], gIdx) => (
              <div key={group} className={gIdx > 0 ? "mt-6" : ""}>
                {/* Sticky Date Divider */}
                <div className="-mx-5 mb-2 flex items-center gap-2 bg-white/95 px-5 py-1.5 backdrop-blur-sm">
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    {group}
                  </h4>
                  <div className="h-px flex-1 bg-slate-100" />
                  <span className="text-[10px] font-medium text-slate-400">
                    {items.length} {items.length === 1 ? "event" : "events"}
                  </span>
                </div>

                {/* Timeline Items */}
                <div className="relative">
                  {/* Thin vertical line — structural, not decorative */}
                  <div className="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-slate-200/70" aria-hidden="true" />

                  <ul className="space-y-0.5">
                    {items.map((evt) => {
                      const Icon = evt.Icon;
                      const actionColor = getActionColor(evt.actionType);
                      const actionBg = getActionBg(evt.actionType);
                      const dotColor = getNodeDot(evt.actionType);
                      return (
                        <motion.li
                          key={evt.id}
                          initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25 }}
                          className="group relative flex gap-3.5"
                        >
                          {/* Semantic node — small, ringed dot */}
                          <div className="relative z-2 flex w-[15px] shrink-0 items-start justify-center pt-3">
                            <span
                              className={`h-[7px] w-[7px] rounded-full ring-4 ${dotColor} transition-transform duration-200 group-hover:scale-125`}
                              aria-hidden="true"
                            />
                          </div>

                          {/* Compact event card */}
                          <div className="flex-1 min-w-0 my-0.5 rounded-lg border border-transparent px-2.5 py-2 transition-colors duration-150 hover:border-slate-150 hover:bg-slate-50/60">
                            <div className="flex items-start gap-2.5">
                              {/* Icon container — soft tint */}
                              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${actionBg}`}>
                                <Icon size={13} className={actionColor} strokeWidth={2.25} aria-hidden="true" />
                              </div>

                              {/* Content */}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-medium leading-snug text-slate-900">
                                  {evt.action}
                                </p>
                                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] leading-tight text-slate-500">
                                  {evt.certificateId && evt.certificateId !== "—" && (
                                    <span className="font-mono text-slate-600">{evt.certificateId}</span>
                                  )}
                                  {evt.program && evt.program !== "—" && (
                                    <>
                                      <span className="text-slate-300">·</span>
                                      <span className="truncate">{evt.program}</span>
                                    </>
                                  )}
                                  {evt.actor && evt.actor !== "System" && (
                                    <>
                                      <span className="text-slate-300">·</span>
                                      <span className="truncate text-slate-400">by {evt.actor}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Timestamp */}
                              <span className="shrink-0 pt-0.5 text-[10px] font-medium tabular-nums text-slate-400">
                                {evt.timeAgo}
                              </span>
                            </div>
                          </div>
                        </motion.li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
