import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Activity, RefreshCw, Download, Database, Radio, ShieldCheck,
  Zap, Clock, AlertTriangle, CheckCircle, FileText,
} from "lucide-react";
import StatusMetricCard from "./StatusMetricCard";
import ExpandableTimelineRow from "./ExpandableTimelineRow";
import { superAdminAPI } from "../services/api";

function formatTimeAgo(ts) {
  const t = typeof ts === "string" ? new Date(ts).getTime() : ts;
  if (!Number.isFinite(t)) return "Recently";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatFullDate(ts) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function interpretEvent(log) {
  const action = log.action || "";
  const target = log.target || "";
  let title = action;
  let description = target;
  let status = "neutral";

  if (action.includes("Verified")) {
    if (action.includes("revoked")) {
      title = "Verification attempt on revoked certificate";
      status = "warning";
    } else {
      title = "Certificate verified";
      status = "success";
    }
  } else if (action.includes("created") || action.includes("provisioned")) {
    title = "Block mined — Certificate issued";
    status = "success";
  } else if (action.includes("Failed verification") || action.includes("not found")) {
    title = "Verification failed";
    status = "failed";
  } else if (action.includes("Credentials")) {
    title = "Credential link generated";
    status = "info";
  } else if (action.includes("deactivated") || action.includes("revoked")) {
    title = action;
    status = "warning";
  } else {
    status = log.status === "success" ? "success" : log.status === "failed" ? "failed" : "neutral";
  }

  return {
    id: log.id,
    title,
    description,
    status,
    timeAgo: formatTimeAgo(log.timestamp),
    details: {
      ip: log.ip_address || "—",
      timestamp: formatFullDate(log.timestamp),
      changes: log.details || "",
    },
  };
}

export default function BlockchainTimelinePanel({ overview, analytics, timeRange, onRefresh }) {
  const shouldReduceMotion = useReducedMotion();
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const { data } = await superAdminAPI.getAuditLogs({
        category: "verification",
        page: 1,
        page_size: 20,
      });
      const logs = data.results || data || [];
      setEvents(logs.map(interpretEvent));
    } catch {
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const chartData = useMemo(() => {
    const issuance = analytics.issuanceTrends || [];
    if (!issuance.length) return [];
    return issuance.map((d) => ({
      date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      issued: d.issued || 0,
      verified: d.verified || 0,
    }));
  }, [analytics.issuanceTrends]);

  const networkStability = useMemo(() => {
    if (overview.blockchainStatus === "healthy") return { value: "99.8%", label: "Excellent" };
    if (overview.blockchainStatus === "active") return { value: "97.2%", label: "Healthy" };
    return { value: "—", label: "Inactive" };
  }, [overview.blockchainStatus]);

  const lastBlockTime = useMemo(() => {
    if (overview.avgBlockTime != null) return `${overview.avgBlockTime}s`;
    return overview.blockchainStatus !== "inactive" ? "< 1s" : "—";
  }, [overview.avgBlockTime, overview.blockchainStatus]);

  const isHealthy = overview.blockchainStatus === "healthy";

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
      className="rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Database size={18} className="text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">Blockchain Timeline</h2>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            Live operational activity of certificate ledger
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 gap-3 px-6 pt-5 sm:grid-cols-4">
        <StatusMetricCard
          label="Blocks Mined"
          value={overview.blocksMined.toLocaleString()}
          status={isHealthy ? "On-chain" : "Inactive"}
          tone={isHealthy ? "emerald" : "slate"}
          delay={0}
        />
        <StatusMetricCard
          label="Network Stability"
          value={networkStability.value}
          status={networkStability.label}
          tone={isHealthy ? "emerald" : "amber"}
          delay={0.05}
        />
        <StatusMetricCard
          label="Verification Throughput"
          value={`${overview.networkHashrate} C/H`}
          status={overview.networkHashrate > 0 ? "Healthy" : "Idle"}
          tone={overview.networkHashrate > 0 ? "sky" : "slate"}
          delay={0.1}
        />
        <StatusMetricCard
          label="Last Block Time"
          value={lastBlockTime}
          status={overview.avgBlockTime != null ? "Stable" : "—"}
          tone={overview.avgBlockTime != null ? "violet" : "slate"}
          delay={0.15}
        />
      </div>

      {/* Chart */}
      <div className="px-6 pt-6 pb-2">
        {chartData.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="issuedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="verifiedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    fontSize: 12,
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="issued"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  fill="url(#issuedGrad)"
                  name="Issued"
                />
                <Area
                  type="monotone"
                  dataKey="verified"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#verifiedGrad)"
                  name="Verified"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl bg-slate-50">
            <Database size={24} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-400">No blockchain activity detected</p>
            <p className="text-xs text-slate-300">Certificates will appear once issued on-chain.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
