import { useState, useEffect } from "react";
import axios from "../services/api";
import {
  BarChart,
  Bar,
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
  ArrowUpRight,
  Clock,
} from "lucide-react";

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
            <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="h-12 w-12 rounded-2xl bg-slate-200" />
              <div className="mt-4 h-3 w-32 rounded-xl bg-slate-200" />
              <div className="mt-3 h-8 w-24 rounded-xl bg-slate-200" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-8">
              <div className="h-6 w-48 rounded-xl bg-slate-200" />
              <div className="h-5 w-5 rounded bg-slate-200" />
            </div>
            <div className="h-80 w-full rounded-2xl bg-slate-100" />
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-8">
              <div className="h-6 w-56 rounded-xl bg-slate-200" />
              <div className="h-5 w-5 rounded bg-slate-200" />
            </div>
            <div className="h-80 w-full rounded-2xl bg-slate-100" />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center">
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
      icon: Award,
      color: "indigo",
      trend: "+12%",
    },
    {
      title: "Registered Students",
      value: data.counts.students,
      icon: Users,
      color: "blue",
      trend: "+5%",
    },
    {
      title: "Active Templates",
      value: data.counts.templates,
      icon: Library,
      color: "purple",
      trend: "Static",
    },
    {
      title: "Verification Requests",
      value: "1,284",
      icon: Activity,
      color: "emerald",
      trend: "+18%",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">System Analytics</h1>
          <p className="text-gray-500 mt-2 font-medium">Real-time overview of issuance and verification activity.</p>
        </div>
        <div className="flex gap-2">
          <span className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2 text-sm font-bold text-gray-600">
            <Calendar size={16} />
            Last 30 Days
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => {
          const bgColor =
            card.color === "indigo"
              ? "bg-indigo-50"
              : card.color === "blue"
                ? "bg-blue-50"
                : card.color === "purple"
                  ? "bg-purple-50"
                  : "bg-emerald-50";

          const iconContainer =
            card.color === "indigo"
              ? "p-3 bg-indigo-100 text-indigo-600 rounded-2xl w-fit mb-4"
              : card.color === "blue"
                ? "p-3 bg-blue-100 text-blue-600 rounded-2xl w-fit mb-4"
                : card.color === "purple"
                  ? "p-3 bg-purple-100 text-purple-600 rounded-2xl w-fit mb-4"
                  : "p-3 bg-emerald-100 text-emerald-600 rounded-2xl w-fit mb-4";

          return (
            <div
              key={i}
              className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-xl transition-all duration-300"
            >
              <div
                className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 ${bgColor} rounded-full transition-transform group-hover:scale-150 duration-500 opacity-50`}
              ></div>
              <div className="relative z-10">
                <div className={iconContainer}>
                  <card.icon size={24} />
                </div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{card.title}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-black text-gray-900">{card.value}</h3>
                  <span className="text-emerald-500 text-xs font-bold flex items-center">
                    <ArrowUpRight size={12} /> {card.trend}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-gray-900">Issuance Timeline</h3>
            <TrendingUp size={20} className="text-gray-400" />
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

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-gray-900">Distribution by Program</h3>
            <Activity size={20} className="text-gray-400" />
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.by_program} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="program"
                  type="category"
                  width={120}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                />
                <Tooltip contentStyle={{ borderRadius: "12px" }} />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Clock size={20} className="text-indigo-600" />
            Recent Issuances
          </h3>
          <button className="text-sm font-bold text-indigo-600 hover:underline">View All Audit Logs</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Student</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Certificate #</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.recent_activity.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-4 font-bold text-gray-900">{item.student_name}</td>
                  <td className="px-8 py-4 text-sm font-mono text-gray-500">{item.certificate_number}</td>
                  <td className="px-8 py-4 text-sm text-gray-600">
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
