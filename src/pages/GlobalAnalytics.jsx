import React, { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "../components/ToastContainer";
import { superAdminAPI } from "../services/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Eye,
  Download,
  BarChart3,
  Activity,
  Building,
  ChevronDown,
  Loader2,
} from "lucide-react";
import PageTitle from "../components/PageTitle";
import SummaryStatCard from "../components/SummaryStatCard";
import RefreshButton from "../components/ui/RefreshButton";
import Table from "../components/ui/Table";

export default function GlobalAnalytics() {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const initialLoadDoneRef = useRef(false);
  const [timeRange, setTimeRange] = useState("30d");

  const [analytics, setAnalytics] = useState({
    issuanceTrends: [],
    verificationTrends: [],
    departmentBreakdown: [],
    summary: {
      totalIssued: 0,
      totalVerified: 0,
      growthRate: 0,
      verificationRate: 0,
      verificationGrowth: 0,
    },
  });

  const fetchAnalytics = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await superAdminAPI.getGlobalAnalytics(timeRange);
      setAnalytics({
        issuanceTrends: data.issuanceTrends || [],
        verificationTrends: data.verificationTrends || [],
        departmentBreakdown: data.departmentBreakdown || [],
        summary: {
          totalIssued: data.summary?.totalIssued ?? 0,
          totalVerified: data.summary?.totalVerified ?? 0,
          growthRate: data.summary?.growthRate ?? 0,
          verificationRate: data.summary?.verificationRate ?? 0,
          verificationGrowth: data.summary?.verificationGrowth ?? 0,
        },
      });
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      toastRef.current.error("Failed to load analytics data");
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
      initialLoadDoneRef.current = true;
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics({ silent: initialLoadDoneRef.current });
  }, [fetchAnalytics]);

  const handleRefresh = useCallback(async () => {
    await fetchAnalytics({ silent: true });
    toastRef.current.success("Analytics refreshed");
  }, [fetchAnalytics]);

  const exportAnalytics = () => {
    const s = analytics.summary;
    const rows = [
      ['Section', 'Label', 'Value', 'Secondary', 'Rate', 'Growth'],
      ['Summary', 'Total Issued', s.totalIssued, '', '', ''],
      ['Summary', 'Total Verified', s.totalVerified, '', '', ''],
      ['Summary', 'Verification Rate', s.verificationRate, '%', '', ''],
      ['Summary', 'Growth Rate', s.growthRate, '%', '', ''],
      ['Summary', 'Verification Growth', s.verificationGrowth, '%', '', ''],
      ...analytics.issuanceTrends.map((item) => [
        'Issuance Trend', item.date, item.issued, item.verified, '', '',
      ]),
      ...analytics.departmentBreakdown.map((dept) => [
        'Department', dept.department, dept.issued, dept.verified,
        dept.issued > 0 ? ((dept.verified / dept.issued) * 100).toFixed(1) : 0,
        dept.growth,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `analytics_report_${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Analytics data exported successfully');
  };

  const fmt = (num) => new Intl.NumberFormat().format(num);

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const s = analytics.summary;
  const growthText = (val) =>
    `${val >= 0 ? "+" : ""}${val}%`;

  return (
    <div className="space-y-6">
      <PageTitle>Analytics</PageTitle>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              aria-label="Select time range"
              className="appearance-none h-10 pl-3 pr-8 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <RefreshButton onClick={handleRefresh} spinning={refreshing} />
          <button
            onClick={exportAnalytics}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryStatCard
          title="Total Issued"
          value={fmt(s.totalIssued)}
          Icon={FileText}
          tone="neutral"
          trend={`${growthText(s.growthRate)} vs prev period`}
          trendPositive={s.growthRate >= 0}
        />
        <SummaryStatCard
          title="Total Verified"
          value={fmt(s.totalVerified)}
          Icon={Activity}
          tone="positive"
          trend={`${growthText(s.verificationGrowth)} vs prev period`}
          trendPositive={s.verificationGrowth >= 0}
        />
        <SummaryStatCard
          title="Verification Rate"
          value={s.verificationRate}
          valueSuffix="%"
          Icon={BarChart3}
          tone="info"
          trend="of all issued certificates"
        />
        <SummaryStatCard
          title="Departments"
          value={analytics.departmentBreakdown.length}
          Icon={Building}
          tone="warning"
          trend="active departments"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-[2.5fr_1.5fr] gap-5">
        {/* Issuance Trends */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-slate-900">Issuance Trends</h2>
            <span className="flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              <BarChart3 size={12} />
              Chart
            </span>
          </div>
          {analytics.issuanceTrends.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No data available</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.issuanceTrends.slice(0, 7)}>
                  <defs>
                    <linearGradient id="colorIssued" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorVerified" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    dy={8}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgb(0 0 0 / 0.1)" }}
                    labelFormatter={formatDate}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px", fontWeight: 600 }} />
                  <Area type="natural" dataKey="issued" name="Issued" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorIssued)" />
                  <Area type="natural" dataKey="verified" name="Verified" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorVerified)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Verification Methods */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-slate-900">Verification Methods</h2>
            <span className="flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              <Activity size={12} />
              Breakdown
            </span>
          </div>
          {analytics.verificationTrends.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No data available</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.verificationTrends.slice(0, 12).map((item) => ({
                      name: item.date ? formatDate(item.date) : 'Unknown',
                      value: (item.qr || 0) + (item.blockchain || 0) + (item.api || 0),
                      qr: item.qr || 0,
                      blockchain: item.blockchain || 0,
                      api: item.api || 0,
                    }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    paddingAngle={3}
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {analytics.verificationTrends.slice(0, 12).map((entry, idx) => (
                      <Cell key={idx} fill={["#242576", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"][idx % 6]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgb(0 0 0 / 0.1)" }}
                    formatter={(value, name, props) => {
                      const data = props.payload;
                      return [
                        `QR: ${data.qr}, BC: ${data.blockchain}, API: ${data.api}`,
                        formatDate(name)
                      ];
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    iconType="circle" 
                    iconSize={8} 
                    wrapperStyle={{ fontSize: "12px", fontWeight: 600 }}
                    formatter={(value, entry) => {
                      const data = entry.payload;
                      return `${value}: ${data.value}`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="border border-slate-200 bg-white">
        {/* <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-white bg-brand">Department Breakdown</h2>
        </div> */}
        <Table>
          <Table.Head>
            <tr>
              <Table.HeaderCell>Department</Table.HeaderCell>
              <Table.HeaderCell>Issued</Table.HeaderCell>
              <Table.HeaderCell>Verified</Table.HeaderCell>
              <Table.HeaderCell>Rate</Table.HeaderCell>
              <Table.HeaderCell>Growth</Table.HeaderCell>
            </tr>
          </Table.Head>
          <Table.Body>
            {analytics.departmentBreakdown.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">No department data</td>
              </tr>
            )}
            {analytics.departmentBreakdown.map((dept, i) => (
              <Table.Row key={i}>
                <Table.Cell className="text-sm font-medium text-slate-900">{dept.department}</Table.Cell>
                <Table.Cell className="text-sm text-slate-700">{fmt(dept.issued)}</Table.Cell>
                <Table.Cell className="text-sm text-slate-700">{fmt(dept.verified)}</Table.Cell>
                <Table.Cell className="text-sm text-slate-700">
                  {dept.issued > 0 ? ((dept.verified / dept.issued) * 100).toFixed(1) : 0}%
                </Table.Cell>
                <Table.Cell>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${dept.growth > 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {dept.growth > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {dept.growth > 0 ? "+" : ""}{dept.growth}%
                  </span>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    </div>
  );
}
