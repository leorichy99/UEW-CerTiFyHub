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
} from "lucide-react";
import SummaryStatCard from "../components/SummaryStatCard";
import QuickActionCard from "../components/QuickActionCard";
import CertificateIssuanceTimeline from "../components/CertificateIssuanceTimeline";
import AdminActivityTimeline from "../components/AdminActivityTimeline";
import PageHeader from "../components/ui/PageHeader";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const initialLoadDoneRef = useRef(false);
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

  const topCards = useMemo(
    () => [
      {
        label: "Total Certificates",
        value: overview.totalCertificates,
        icon: FileText,
        tone: "neutral",
        trend: `${analytics.summary.growthRate >= 0 ? "+" : ""}${analytics.summary.growthRate}% vs previous month`,
        trendPositive: analytics.summary.growthRate >= 0,
      },
      {
        label: "Total Verifications",
        value: overview.totalVerifications,
        icon: Eye,
        tone: "info",
        trend: `${analytics.summary.verificationGrowth >= 0 ? "+" : ""}${analytics.summary.verificationGrowth}% vs previous month`,
        trendPositive: analytics.summary.verificationGrowth >= 0,
      },
      {
        label: "Active Admins",
        value: overview.activeAdmins,
        icon: Shield,
        tone: "warning",
        trend: overview.activeAdmins > 0 ? "~0% No change" : "No active admins",
        trendPositive: overview.activeAdmins > 0,
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Dashboard"
        description="Overview of certificate system activity and metrics"
        showSearch={true}
      />
{/* Summary stats, activity timeline and certificate issuance timeline */}
<div className="flex flex-col md:flex-row gap-4 w-full">
      {/* Stat Cards and Certificate Issuance Timeline */}
  <div className="flex-1 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

      <CertificateIssuanceTimeline
          overview={overview}
          analytics={analytics}
          timeRange={timeRange}
          onRefresh={(newRange) => {
            if (newRange) setTimeRange(newRange);
            else fetchAll({ silent: true });
          }}
        />
</div>

      {/* Timeline Panels */}
      <div className="w-full md:w-[450px] h-full">
        <AdminActivityTimeline
          onViewAll={() => navigate("/admin/audit")}
        />
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
            onClick={() => navigate("/admin/users")}
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
