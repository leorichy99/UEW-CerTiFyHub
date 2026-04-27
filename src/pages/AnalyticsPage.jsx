import { useState, useEffect } from "react";
import axios from "../services/api";
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
  Clock,
} from "lucide-react";
import SummaryStatCard from "../components/SummaryStatCard";

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get("/analytics/stats/");
        setData(response.data);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading)
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
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="h-12 w-12 rounded-2xl bg-slate-200" />
              <div className="mt-4 h-3 w-32 rounded-xl bg-slate-200" />
              <div className="mt-3 h-8 w-24 rounded-xl bg-slate-200" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-8">
              <div className="h-6 w-48 rounded-xl bg-slate-200" />
              <div className="h-5 w-5 rounded bg-slate-200" />
            </div>
            <div className="h-80 w-full rounded-2xl bg-slate-100" />
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-8">
              <div className="h-6 w-56 rounded-xl bg-slate-200" />
              <div className="h-5 w-5 rounded bg-slate-200" />
            </div>
            <div className="h-80 w-full rounded-2xl bg-slate-100" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
  if (!data)
    return <div className="p-8 text-center text-red-500">Failed to load data.</div>;

  const cards = [
    {
      title: "Total Certificates",
      value: data.counts.certificates,
      Icon: Award,
      tone: "blue",
      trend: `${data.counts.certificates} issued`,
    },
    {
      title: "Registered Students",
      value: data.counts.students,
      Icon: Users,
      tone: "brand",
      trend: `${data.counts.students} enrolled`,
    },
    {
      title: "Active Templates",
      value: data.counts.templates,
      Icon: Library,
      tone: "violet",
      trend: `${data.counts.templates} available`,
    },
    {
      title: "Verification Requests",
      value: "0",
      Icon: Activity,
      tone: "emerald",
      trend: "No requests yet",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <SummaryStatCard
            key={i}
            title={card.title}
            value={card.value}
            Icon={card.Icon}
            tone={card.tone}
            trend={card.trend}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-slate-900">Issuance Timeline</h3>
            <TrendingUp size={20} className="text-slate-400" />
          </div>
          <div className="h-80 w-full">
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
          </div>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-slate-900">Distribution by Program</h3>
            <Activity size={20} className="text-slate-400" />
          </div>
          <div className="h-80 w-full">
            {(() => {
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
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Clock size={20} className="text-blue-600" />
            Recent Issuances
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-(--color-brand-dark)">
              <tr>
                <th className="px-8 py-4 text-xs font-bold text-white uppercase tracking-widest">Student</th>
                <th className="px-8 py-4 text-xs font-bold text-white uppercase tracking-widest">Certificate #</th>
                <th className="px-8 py-4 text-xs font-bold text-white uppercase tracking-widest">Date</th>
                <th className="px-8 py-4 text-xs font-bold text-white uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data.recent_activity || []).map((item, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-4 font-bold text-slate-900">{item.student_name}</td>
                  <td className="px-8 py-4 text-sm font-mono text-slate-500">{item.certificate_number}</td>
                  <td className="px-8 py-4 text-sm text-slate-600">
                    {new Date(item.generated_date).toLocaleDateString()}
                  </td>
                  <td className="px-8 py-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                        item.status === "ISSUED" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
