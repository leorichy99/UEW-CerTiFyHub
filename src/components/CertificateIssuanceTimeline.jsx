import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { FileText } from "lucide-react";

export default function CertificateIssuanceTimeline({ overview, analytics, timeRange, onRefresh }) {
  const shouldReduceMotion = useReducedMotion();

  const chartData = useMemo(() => {
    const issuance = analytics.issuanceTrends || [];
    if (!issuance.length) return [];
    return issuance.map((d) => ({
      date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      issued: d.issued || 0,
      verified: d.verified || 0,
    }));
  }, [analytics.issuanceTrends]);

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      {/* Header */}
      <div className="sm:flex items-start justify-between gap-4 **:px-3 py-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Certificate Issuance Timeline</h2>
        </div>
        <div className="flex items-start gap-3">
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
        </div>
      </div>

      {/* Chart */}
      <div className="px-6 pt-6">
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
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <FileText size={24} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-400">No certificate activity yet</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
