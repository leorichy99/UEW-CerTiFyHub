import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  FileText, Activity, TrendingUp, Calendar, RefreshCw, Loader2,
} from "lucide-react";
import { superAdminAPI } from "../services/api";

export default function CertificateIssuanceTimeline({ overview, analytics, timeRange, onRefresh }) {
  const shouldReduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(false);

  const chartData = useMemo(() => {
    const issuance = analytics.issuanceTrends || [];
    if (!issuance.length) return [];
    return issuance.map((d) => ({
      date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      issued: d.issued || 0,
      verified: d.verified || 0,
    }));
  }, [analytics.issuanceTrends]);

  // Calculate real-time summary stats
  const summaryStats = useMemo(() => {
    const totalIssued = analytics.summary?.totalIssued || 0;
    const totalVerified = analytics.summary?.totalVerified || 0;
    const verificationRate = totalIssued > 0 
      ? ((totalVerified / totalIssued) * 100).toFixed(1) 
      : "0";
    
    // Calculate issuance velocity (issued per day based on time range)
    const daysMap = { "24h": 1, "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
    const days = daysMap[timeRange] || 30;
    const velocity = totalIssued > 0 ? (totalIssued / days).toFixed(1) : "0";

    return {
      totalIssued,
      totalVerified,
      verificationRate,
      velocity,
    };
  }, [analytics.summary, timeRange]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await onRefresh();
    setLoading(false);
  }, [onRefresh]);

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
            {/* <FileText size={18} className="text-slate-700" /> */}
            <h2 className="text-lg font-semibold text-slate-900">Certificate Issuance Timeline</h2>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            Track issuance and verification activity over time
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => onRefresh?.(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          {/* Live Indicator */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 px-6 pt-5 sm:grid-cols-4">
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium text-slate-500">Total Issued</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {summaryStats.totalIssued.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium text-slate-500">Total Verified</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {summaryStats.totalVerified.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium text-slate-500">Verification Rate</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {summaryStats.verificationRate}%
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium text-slate-500">Issuance Rate</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {summaryStats.velocity} / day
          </p>
        </div>
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
            <FileText size={24} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-400">No certificate activity yet</p>
            <p className="text-xs text-slate-300">Trends will appear once issuance begins.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
