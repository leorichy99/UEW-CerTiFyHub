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
} from "lucide-react";
import QuickActionCard from "../components/QuickActionCard";
import CertificateIssuanceTimeline from "../components/CertificateIssuanceTimeline";
import AdminActivityTimeline from "../components/AdminActivityTimeline";
import DashboardFirstRun from "../components/DashboardFirstRun";

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

  const topCards = useMemo(
    () => [
      {
        label: "Total Certificates",
        value: overview.totalCertificates,
        icon: FileText,
        ...deltaTrend(analytics.summary.growthRate, overview.totalCertificates),
      },
      {
        label: "Total Verifications",
        value: overview.totalVerifications,
        icon: Eye,
        ...deltaTrend(analytics.summary.verificationGrowth, overview.totalVerifications),
      },
      {
        label: "Active Admins",
        value: overview.activeAdmins,
        icon: Shield,
        subtitle: overview.activeAdmins > 0 ? "Active now" : "None active",
      },
    ],
    [analytics.summary, overview],
  );

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Issuance, verification, and admin activity at a glance.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/admin/certificates")}
          className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{ backgroundColor: "#242576" }}
        >
          <Plus size={16} />
          Issue certificate
        </button>
      </header>

      {/* Top-level figures — quiet inline strip, not floating cards */}
      <dl className="grid grid-cols-1 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {topCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="px-5 py-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Icon size={15} strokeWidth={1.75} />
                <dt className="text-xs font-medium uppercase tracking-wide">{card.label}</dt>
              </div>
              <dd className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900">
                  {fmt(card.value)}
                </span>
                {card.trend ? (
                  <span
                    className={`text-xs font-semibold ${
                      card.trendPositive ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {card.trend}
                  </span>
                ) : card.subtitle ? (
                  <span className="text-xs font-medium text-slate-400">{card.subtitle}</span>
                ) : null}
              </dd>
            </div>
          );
        })}
      </dl>

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
