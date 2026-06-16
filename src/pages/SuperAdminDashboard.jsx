import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/ToastContainer";
import { superAdminAPI } from "../services/api";
import {
  Users,
  FileText,
  Shield,
  Eye,
  Loader2,
  Brush,
  FileCheck,
  Settings,
  Plus,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import QuickActionCard from "../components/QuickActionCard";
import CertificateIssuanceTimeline from "../components/CertificateIssuanceTimeline";
import AdminActivityTimeline from "../components/AdminActivityTimeline";
import PageTitle from "../components/PageTitle";
import DashboardFirstRun from "../components/DashboardFirstRun";
import SummaryStatCard from "../components/SummaryStatCard";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const initialLoadDoneRef = useRef(false);
  const [timeRange, setTimeRange] = useState("24h");
  const [firstRunDismissed, setFirstRunDismissed] = useState(
    () => localStorage.getItem("dashboard-firstrun-dismissed") === "true",
  );

  const [overview, setOverview] = useState({
    totalStudents: 0,
    totalCertificates: 0,
    totalVerifications: 0,
    activeAdmins: 0,
    pendingDisputes: 0,
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

  const fetchAll = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
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
        pendingDisputes: statsData.pendingDisputes ?? 0,
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
      if (silent) setRefreshing(false);
      else setLoading(false);
      initialLoadDoneRef.current = true;
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAll({ silent: initialLoadDoneRef.current });
  }, [fetchAll]);

  const handleRefresh = useCallback(async () => {
    await fetchAll({ silent: true });
    toastRef.current.success("Dashboard refreshed");
  }, [fetchAll]);

  const fmt = (num) =>
    new Intl.NumberFormat().format(Number.isFinite(Number(num)) ? Number(num) : 0);

  // Honest deltas: only show a percentage when there is activity AND real
  // movement. No signed zero, no misleading swings off an empty baseline.
  const deltaTrend = (pct, value) => {
    if (!value) return { subtitle: "No activity yet" };
    const rounded = Math.round(Number(pct) || 0);
    if (rounded === 0) return { subtitle: "No change vs last month" };
    return {
      trend: `${rounded > 0 ? "+" : ""}${rounded}% vs last month`,
      trendPositive: rounded > 0,
    };
  };

  const topCards = useMemo(() => {
    const certTrend = deltaTrend(analytics.summary.growthRate, overview.totalCertificates);
    const verifTrend = deltaTrend(analytics.summary.verificationGrowth, overview.totalVerifications);

    return [
      {
        title: "Total Certificates",
        value: fmt(overview.totalCertificates),
        Icon: FileText,
        tone: "neutral",
        ...certTrend,
      },
      {
        title: "Total Verifications",
        value: fmt(overview.totalVerifications),
        Icon: Eye,
        tone: verifTrend.trend ? (verifTrend.trendPositive ? "positive" : "negative") : "neutral",
        ...verifTrend,
      },
      {
        title: "Pending Disputes",
        value: fmt(overview.pendingDisputes),
        Icon: AlertTriangle,
        tone: overview.pendingDisputes > 0 ? "warning" : "neutral",
        subtitle: overview.pendingDisputes > 0 ? "Needs attention" : "All clear",
      },
    ];
  }, [analytics.summary, overview]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#242576]" />
      </div>
    );
  }

  const isFirstRun = overview.totalCertificates === 0 && !firstRunDismissed;

  const dismissFirstRun = () => {
    localStorage.setItem("dashboard-firstrun-dismissed", "true");
    setFirstRunDismissed(true);
  };

  if (isFirstRun) {
    return (
      <div className="space-y-6">
        <DashboardFirstRun
          totalStudents={overview.totalStudents}
          onNavigate={navigate}
          onDismiss={dismissFirstRun}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <PageTitle>Dashboard</PageTitle>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/certificates")}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ backgroundColor: "#242576" }}
          >
            <Plus size={16} />
            Issue Certificate
          </button>
        </div>
      </header>

      {/* Top-level stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {topCards.map((card) => (
          <SummaryStatCard key={card.title} {...card} />
        ))}
      </div>

      {/* Main grid: chart leads, activity in the rail (1.6fr / 0.9fr on xl) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <CertificateIssuanceTimeline
          overview={overview}
          analytics={analytics}
          timeRange={timeRange}
          onRefresh={(newRange) => {
            if (newRange) setTimeRange(newRange);
            else fetchAll({ silent: true });
          }}
        />
        <AdminActivityTimeline onViewAll={() => navigate("/admin/audit")} />
      </div>

      {/* Quick Actions */}
      <div className="">
        <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            title="Manage certificates"
            description="Review issuance and certificate status."
            Icon={FileCheck}
            tone="neutral"
            variant="solid"
            onClick={() => navigate("/admin/certificates")}
          />
          <QuickActionCard
            title="Edit templates"
            description="Design and update certificate templates."
            Icon={Brush}
            tone="info"
            variant="muted"
            onClick={() => navigate("/admin/templates")}
          />
          <QuickActionCard
            title="Review admin access"
            description="Monitor active admins and permissions."
            Icon={Shield}
            tone="info"
            variant="muted"
            onClick={() => navigate("/admin/accounts")}
          />
          <QuickActionCard
            title="System settings"
            description="Platform-wide configuration and policies."
            Icon={Settings}
            tone="warning"
            variant="muted"
            onClick={() => navigate("/admin/settings")}
          />
        </div>
      </div>
    </div>
  );
}
