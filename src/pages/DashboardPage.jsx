import { useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import RefreshButton from "../components/ui/RefreshButton";
import { useToast } from "../components/ToastContainer";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Users,
  Award,
  Library,
  Activity,
  TrendingUp,
  Calendar,
  Clock,
} from "lucide-react";
import SummaryStatCard from "../components/SummaryStatCard";
import { useDashboardStats } from "../hooks/dashboard/useDashboardStats.js";
import Table from "../components/ui/Table";

export default function DashboardPage() {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  
  // Use new dashboard stats hook
  const { data, isLoading, isRefreshing, refresh, error } = useDashboardStats();

  const handleRefresh = useCallback(async () => {
    await refresh();
    toastRef.current.success("Data refreshed");
  }, [refresh]);

  if (isLoading)
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex justify-between items-end">
          <div className="space-y-3">
            <div className="h-10 w-72 rounded-xl bg-slate-200" />
            <div className="h-4 w-96 rounded-xl bg-slate-200" />
          </div>
          <div className="h-10 w-36 rounded-xl bg-slate-200" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <div className="h-12 w-12 rounded-2xl bg-slate-200" />
              <div className="mt-4 h-3 w-32 rounded-xl bg-slate-200" />
              <div className="mt-3 h-8 w-24 rounded-xl bg-slate-200" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-8">
              <div className="h-6 w-48 rounded-xl bg-slate-200" />
              <div className="h-5 w-5 rounded bg-slate-200" />
            </div>
            <div className="h-80 w-full rounded-2xl bg-slate-100" />
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-8">
              <div className="h-6 w-56 rounded-xl bg-slate-200" />
              <div className="h-5 w-5 rounded bg-slate-200" />
            </div>
            <div className="h-80 w-full rounded-2xl bg-slate-100" />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
            <div className="h-6 w-44 rounded-xl bg-slate-200" />
            <div className="h-5 w-40 rounded-xl bg-slate-200" />
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 w-full rounded-2xl bg-slate-100" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  if (error)
    return <div className="p-8 text-center text-red-500">Failed to load data.</div>;
  if (!data)
    return <div className="p-8 text-center text-slate-500">No data available.</div>;

  const cards = [
    {
      title: "Total Certificates",
      value: data.counts.certificates,
      icon: Award,
      tone: "neutral",
    },
    {
      title: "Registered Students",
      value: data.counts.students,
      icon: Users,
      tone: "info",
    },
    {
      title: "Active Templates",
      value: data.counts.templates,
      icon: Library,
      tone: "info",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-end">
        <RefreshButton onClick={handleRefresh} spinning={isRefreshing} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, i) => (
          <SummaryStatCard
            key={i}
            title={card.title}
            value={card.value}
            Icon={card.icon}
            tone={card.tone}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2.5fr_1.5fr] gap-5">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-extrabold text-slate-900">Issuance Timeline</h3>
            <TrendingUp size={20} className="text-slate-400" />
          </div>
          <div className="h-80 w-full">
            {(!data.timeline || data.timeline.length === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <TrendingUp size={40} className="mb-3 opacity-30" />
                <p className="text-sm">No issuance data yet</p>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.timeline}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  dy={10}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                  cursor={{ stroke: "#4f46e5", strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#4f46e5"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-extrabold text-slate-900">Distribution by Program</h3>
            <Activity size={20} className="text-slate-400" />
          </div>
          <div className="h-80 w-full">
            {(!data.by_program || data.by_program.length === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Activity size={40} className="mb-3 opacity-30" />
                <p className="text-sm">No program data yet</p>
              </div>
            ) : (() => {
              const PIE_COLORS = [
                "#242576", "#4f46e5", "#0ea5e9", "#10b981", "#f59e0b",
                "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
                "#6366f1", "#06b6d4", "#84cc16", "#e11d48", "#a855f7",
              ];
              return (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.by_program}
                      dataKey="count"
                      nameKey="program"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      innerRadius={50}
                      paddingAngle={3}
                      // label={({ program, percent }) =>
                      //   `${program} (${(percent * 100).toFixed(0)}%)`
                      // }
                      // labelLine={{ strokeWidth: 1 }}
                    >
                      {(data.by_program || []).map((entry, idx) => (
                        <Cell key={entry.program} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgb(0 0 0 / 0.1)" }}
                      formatter={(value, name) => [`${value} certificates`, name]}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={10}
                      wrapperStyle={{ fontSize: "12px", fontWeight: 600 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              );
            })()}
            )}
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Clock size={20} className="text-blue-600" />
            Recent Issuances
          </h3>
          <Link
            to="/certificates"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition"
          >
            View all &rarr;
          </Link>
        </div>
        <Table>
          <Table.Head>
            <tr>
              <Table.HeaderCell>Student</Table.HeaderCell>
              <Table.HeaderCell>Certificate #</Table.HeaderCell>
              <Table.HeaderCell>Date</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
            </tr>
          </Table.Head>
          <Table.Body>
            {data.recent_activity.map((item, i) => (
              <Table.Row key={i}>
                <Table.Cell className="font-extrabold text-slate-900">{item.student_name}</Table.Cell>
                <Table.Cell className="text-sm font-mono text-slate-500">{item.certificate_number}</Table.Cell>
                <Table.Cell className="text-sm text-slate-600">
                  {new Date(item.generated_date).toLocaleDateString()}
                </Table.Cell>
                <Table.Cell className="text-sm">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                      item.status === "ISSUED" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {item.status}
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
