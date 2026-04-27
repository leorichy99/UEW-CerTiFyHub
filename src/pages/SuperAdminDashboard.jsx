import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/ToastContainer";
import { superAdminAPI } from "../services/api";
import {
  Users,
  FileText,
  Shield,
  Activity,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  Loader2,
  Database,
  Brush,
  FileCheck,
  Settings,
} from "lucide-react";
import SummaryStatCard from "../components/SummaryStatCard";
import QuickActionCard from "../components/QuickActionCard";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("24h");

  const [overview, setOverview] = useState({
    totalStudents: 0,
    totalCertificates: 0,
    totalVerifications: 0,
    activeAdmins: 0,
    blockchainStatus: "inactive",
    blocksMined: 0,
    networkHashrate: 0,
    avgBlockTime: null,
    recentActivities: [],
  });

  const [analytics, setAnalytics] = useState({
    issuanceTrends: [],
    summary: {
      totalIssued: 0,
      growthRate: 0,
      verificationGrowth: 0,
    },
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: statsData }, { data: analyticsData }] = await Promise.all([
        superAdminAPI.getStats(),
        superAdminAPI.getGlobalAnalytics(timeRange),
      ]);

      setOverview({
        totalStudents: statsData.totalStudents ?? 0,
        totalCertificates: statsData.totalCertificates ?? 0,
        totalVerifications: statsData.totalVerifications ?? 0,
        activeAdmins: statsData.activeAdmins ?? 0,
        blockchainStatus: statsData.blockchainStatus ?? "inactive",
        blocksMined: statsData.blocksMined ?? 0,
        networkHashrate: statsData.networkHashrate ?? 0,
        avgBlockTime: statsData.avgBlockTime ?? null,
        recentActivities: statsData.recentActivities || [],
      });

      setAnalytics({
        issuanceTrends: analyticsData.issuanceTrends || [],
        summary: {
          totalIssued: analyticsData.summary?.totalIssued ?? 0,
          growthRate: analyticsData.summary?.growthRate ?? 0,
          verificationGrowth: analyticsData.summary?.verificationGrowth ?? 0,
        },
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toastRef.current.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const fmt = (num) =>
    new Intl.NumberFormat().format(Number.isFinite(Number(num)) ? Number(num) : 0);

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const formatTimeAgo = (timestamp) => {
    const ts = typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp;
    if (!Number.isFinite(ts)) return "Recently";
    const minutes = Math.floor((Date.now() - ts) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  };

  const topCards = useMemo(
    () => [
      {
        label: "Total Certificates",
        value: overview.totalCertificates,
        icon: FileText,
        tone: "brand",
        trend: `${analytics.summary.growthRate >= 0 ? "+" : ""}${analytics.summary.growthRate}% vs previous month`,
        trendPositive: analytics.summary.growthRate >= 0,
      },
      {
        label: "Total Students",
        value: overview.totalStudents,
        icon: Users,
        tone: "blue",
        trend: `${analytics.summary.growthRate >= 0 ? "+" : ""}${analytics.summary.growthRate}% vs previous month`,
        trendPositive: analytics.summary.growthRate >= 0,
      },
      {
        label: "Total Verifications",
        value: overview.totalVerifications,
        icon: Eye,
        tone: "violet",
        trend: `${analytics.summary.verificationGrowth >= 0 ? "+" : ""}${analytics.summary.verificationGrowth}% vs previous month`,
        trendPositive: analytics.summary.verificationGrowth >= 0,
      },
      {
        label: "Active Admins",
        value: overview.activeAdmins,
        icon: Shield,
        tone: "amber",
        trend: overview.activeAdmins > 0 ? "~0% No change" : "No active admins",
        trendPositive: overview.activeAdmins > 0,
      },
    ],
    [analytics.summary, overview],
  );

  const miniChart = analytics.issuanceTrends.slice(-10);
  const maxIssued = Math.max(...miniChart.map((d) => d.issued || 0), 1);
  const networkStability = Math.min(
    99.9,
    Math.max(92, overview.blockchainStatus === "healthy" ? 99.8 : 94.2),
  );
  const blockchainHealthy = overview.blockchainStatus === "healthy";

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#242576]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="relative">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            aria-label="Select time range"
            className="h-11 appearance-none rounded-xl border border-slate-200 bg-white pl-4 pr-10 text-sm font-medium text-slate-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {topCards.map((card) => (
          <SummaryStatCard
            key={card.label}
            title={card.label}
            value={fmt(card.value)}
            Icon={card.icon}
            tone={card.tone}
            trend={card.trend}
            trendPositive={card.trendPositive}
          />
        ))}
      </div>

      {/* Blockchain + Activity Row */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
        {/* Blockchain Status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-900">
                  Blockchain Status
                </h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Operational health of the certificate ledger.
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${
                blockchainHealthy
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {blockchainHealthy ? "LIVE_MONITOR" : "Monitor closely"}
            </span>
          </div>

          {/* Blockchain metrics */}
          <div className="mt-8 grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)_180px] lg:items-center">
            {/* Blocks Mined */}
            <div className="flex flex-col items-center text-center">
              <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-8 border-sky-100 border-t-[#242576] border-r-[#242576] animate">
                <div>
                  <p className="text-4xl font-bold tracking-tight text-slate-900">
                    {fmt(overview.blocksMined)}
                  </p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                    Blocks
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-900">Blocks Mined</p>
              <p className="text-xs text-emerald-600">
                +{Math.max(analytics.summary.totalIssued, 0)} in selected range
              </p>
            </div>

            {/* Center metrics */}
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">Network Hashrate</span>
                  <span className="text-slate-400">{overview.networkHashrate} C/H</span>
                </div>
                <div className="mt-3 h-2.5 rounded-full bg-slate-100">
                  <div
                    className="h-2.5 rounded-full bg-sky-500"
                    style={{
                      width: `${Math.min(100, overview.networkHashrate * 12)}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">Network Stability</span>
                  <span className="font-semibold text-emerald-600">{networkStability}%</span>
                </div>
                <div className="mt-3 h-2.5 rounded-full bg-slate-100">
                  <div
                    className="h-2.5 rounded-full bg-emerald-500"
                    style={{ width: `${networkStability}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Avg Block Time */}
            {/* <div className="flex flex-col items-center text-center">
              <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-8 border-sky-100 border-dashed">
                <div>
                  <Clock size={16} className="mx-auto mb-2 text-sky-500" />
                  <p className="text-lg font-bold tracking-tight text-slate-900">
                    {overview.avgBlockTime != null ? `${overview.avgBlockTime}s` : "N/A"}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-900">Avg Block Time</p>
              <p className="text-xs text-sky-600">Target: 10000s</p>
            </div> */}
          </div>

          {/* Mini bar chart */}
          <div className="mt-8 grid h-28 grid-cols-10 items-end gap-3 rounded-2xl bg-slate-50 px-4 pb-4 pt-6">
            {miniChart.length > 0
              ? miniChart.map((item) => (
                  <div
                    key={item.date}
                    className="flex h-full flex-col items-center justify-end gap-2"
                  >
                    <div
                      className="w-full rounded-t-xl bg-sky-100"
                      style={{
                        height: `${Math.max(16, ((item.issued || 0) / maxIssued) * 100)}%`,
                      }}
                    />
                    <span className="text-[9px] font-medium text-slate-400">
                      {formatDate(item.date)}
                    </span>
                  </div>
                ))
              : Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex h-full flex-col items-center justify-end gap-2"
                  >
                    <div
                      className="w-full rounded-t-xl bg-slate-200"
                      style={{ height: `${25 + (i % 5) * 12}%` }}
                    />
                    <span className="text-[9px] font-medium text-slate-300">--</span>
                  </div>
                ))}
          </div>
        </div>

        {/* Admin Activity */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-2 py-2">
            <h2 className="text-md font-semibold text-slate-900">Admin Activity</h2>
            <button
              type="button"
              onClick={() => navigate("/admin/audit")}
              className="text-sm font-semibold text-sky-600 transition hover:text-sky-700"
            >
              View All
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {overview.recentActivities.length === 0 ? (
              <div className="px-2 py-2 text-center text-sm text-slate-400">
                No recent activity
              </div>
            ) : (
              overview.recentActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 px-2 py-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                    {activity.status === "success" ? (
                      <CheckCircle size={14} />
                    ) : activity.status === "failed" ? (
                      <AlertCircle size={14} />
                    ) : (
                      <Activity size={14} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {activity.user || "System"}
                        </p>
                        <p className="text-sm text-slate-500">{activity.action}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${
                          activity.status === "success"
                            ? "bg-emerald-100 text-emerald-700"
                            : activity.status === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {activity.status || "info"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {activity.target || "System event"}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="">
        <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            title="Manage certificates"
            description="Review issuance and certificate status."
            Icon={FileCheck}
            tone="brand"
            variant="solid"
            onClick={() => navigate("/admin/certificates")}
          />
          <QuickActionCard
            title="Edit templates"
            description="Design and update certificate templates."
            Icon={Brush}
            tone="blue"
            variant="muted"
            onClick={() => navigate("/admin/templates")}
          />
          <QuickActionCard
            title="Review admin access"
            description="Monitor active admins and permissions."
            Icon={Shield}
            tone="violet"
            variant="muted"
            onClick={() => navigate("/admin/users")}
          />
          <QuickActionCard
            title="System settings"
            description="Platform-wide configuration and policies."
            Icon={Settings}
            tone="amber"
            variant="muted"
            onClick={() => navigate("/admin/settings")}
          />
        </div>
      </div>
    </div>
  );
}
