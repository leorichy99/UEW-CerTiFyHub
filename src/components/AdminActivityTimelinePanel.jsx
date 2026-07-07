import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Shield, Filter, Eye, FileText, CheckCircle, XCircle, UserCheck,
  AlertTriangle, Download, Loader2, ChevronDown, Activity,
  RefreshCcw,
} from "lucide-react";
import { superAdminAPI } from "../services/api";
import ExpandableTimelineRow from "./ExpandableTimelineRow";

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
  if (isToday) return "TODAY";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return "YESTERDAY";

  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" }).toUpperCase();
}

function classifyAction(action = "") {
  const a = action.toLowerCase();
  if (a.includes("issue") || a.includes("create") || a.includes("provision") || a.includes("mined")) return "issued";
  if (a.includes("revoke") || a.includes("deactivat")) return "revoked";
  if (a.includes("bulk") || a.includes("import")) return "imports";
  if (a.includes("permission") || a.includes("admin") || a.includes("role") || a.includes("unlock")) return "admin_changes";
  return "other";
}

function actionTone(actionType) {
  switch (actionType) {
    case "issued":       return { dot: "bg-sky-500",     text: "text-sky-700",     icon: FileText };
    case "revoked":        return { dot: "bg-rose-500",    text: "text-rose-700",    icon: XCircle };
    case "imports":        return { dot: "bg-violet-500",  text: "text-violet-700",  icon: CheckCircle };
    case "admin_changes":  return { dot: "bg-amber-500",   text: "text-amber-700",   icon: Shield };
    default:               return { dot: "bg-slate-400",   text: "text-slate-600",   icon: Activity };
  }
}

function interpretLog(log) {
  const actionType = classifyAction(log.action);
  const tone = actionTone(actionType);
  const Icon = tone.icon;

  // Extract certificate ID and program from target or details if available
  const target = log.target || "";
  const certificateId = target.match(/CERT-\w+/)?.[0] || log.certificate_id || "—";
  const program = log.program || target.match(/program:\s*(\w+)/)?.[1] || "—";

  return {
    id: log.id,
    title: log.action || "System event",
    description: log.target || "—",
    status: log.status === "success" ? "success" : log.status === "failed" ? "failed" : "info",
    timeAgo: formatTimeAgo(log.timestamp),
    group: getGroupLabel(log.timestamp),
    actionType,
    tone,
    user: log.user || log.username || "System",
    actor: log.user || log.username || "System",
    certificateId,
    program,
    details: {
      ip: log.ip_address || "—",
      timestamp: new Date(log.timestamp).toLocaleString("en-US"),
      changes: log.details || "",
      device: "Web Client",
    },
  };
}

export default function AdminActivityTimelinePanel({ onViewAll }) {
  const shouldReduceMotion = useReducedMotion();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

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
      className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-slate-900">Recent Activities</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
            title="Refresh"
          >
            <RefreshCcw size={14} />
          </button>
          <button
            onClick={onViewAll}
            className="text-xs font-semibold text-sky-600 transition hover:text-sky-700"
          >
            View All
          </button>
        </div>
      </div>

      {/* Timeline Feed */}
      <div className="flex-1 overflow-y-auto px-6 py-4" style={{ maxHeight: "520px" }}>
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-sm text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            Loading activity...
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
            <Shield size={24} className="text-slate-200" />
            <p className="text-sm font-medium">No recent administrative activity</p>
            <p className="text-xs">Actions will appear once administrators perform operations.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([group, items]) => (
              <div key={group}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {group}
                  </h4>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="space-y-0">
                  {items.map((evt, idx) => (
                    <ExpandableTimelineRow
                      key={evt.id}
                      event={{
                        ...evt,
                        description: `${evt.description} — by ${evt.user}`,
                      }}
                      isLast={idx === items.length - 1}
                      delay={idx * 0.03}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
