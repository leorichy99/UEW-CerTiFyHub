import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { certificateAPI, templateAPI } from "../services/api";
import {
  Bell,
  ChevronRight,
  LayoutTemplate,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Sun,
  Zap,
} from "lucide-react";

function getGreeting(date) {
  const hr = date.getHours();
  if (hr < 12) return "Good Morning";
  if (hr < 18) return "Good Afternoon";
  return "Good Evening";
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date) {
  return date.toLocaleDateString([], { year: "numeric", month: "long", day: "2-digit" });
}

function timeAgo(iso) {
  if (!iso) return "";
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "";
  const diff = Date.now() - ts;
  const sec = Math.max(1, Math.round(diff / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [query, setQuery] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [templates, setTemplates] = useState([]);
  const [recentCertificates, setRecentCertificates] = useState([]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [{ data: templatesData }, { data: certsData }] = await Promise.all([
          templateAPI.getAll(),
          certificateAPI.getAll(),
        ]);

        if (!mounted) return;

        setTemplates(Array.isArray(templatesData) ? templatesData : []);
        const certs = Array.isArray(certsData) ? certsData : [];

        const sorted = certs
          .slice()
          .sort((a, b) => {
            const da = new Date(a?.created_at || a?.generated_date || a?.date_awarded || 0).getTime();
            const db = new Date(b?.created_at || b?.generated_date || b?.date_awarded || 0).getTime();
            return db - da;
          })
          .slice(0, 3);

        setRecentCertificates(sorted);
      } catch (e) {
        console.error("Failed loading dashboard data:", e);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const displayName = user?.username || "Admin";
  const email = user?.email || "";
  const greeting = useMemo(() => getGreeting(now), [now]);

  const topTemplates = useMemo(() => (templates || []).slice(0, 3), [templates]);

  const recentActivity = useMemo(() => {
    return (recentCertificates || []).map((c) => {
      const certNo = c?.certificate_number || c?.certificateNumber || c?.id;
      const student = c?.student_name || c?.studentName || "Student";
      const when = c?.created_at || c?.generated_date || c?.date_awarded;
      return {
        id: c?.id,
        title: `Cert #${certNo} generated`,
        meta: `For ${student}`,
        ago: timeAgo(when),
      };
    });
  }, [recentCertificates]);

  return (
    <div className="space-y-6">
      {/* Top search + actions */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-2xl lg:max-w-3xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students, certificates, or employers..."
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
            title="Messages"
          >
            <MessageSquare className="h-5 w-5" />
          </button>

          <div className="hidden md:block h-8 w-px bg-slate-200 mx-1" />

          <button
            type="button"
            className="flex items-center gap-3 rounded-2xl bg-transparent px-1 py-1 hover:bg-slate-50"
            title="Profile"
          >
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-900 leading-tight">{displayName}</div>
              <div className="text-[11px] text-slate-500 leading-tight truncate max-w-55">{email}</div>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-blue-500 bg-white shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-slate-700">
                {(displayName || "A").slice(0, 2).toUpperCase()}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Greeting */}
      <div className="bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-amber-600">
              <Sun className="h-5 w-5" />
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900">
                {greeting}, {displayName}!
              </div>
              <div className="mt-1 max-w-2xl text-sm text-slate-600">
                Welcome back to UEW CerTiFyHub. The system is ready for today&apos;s tasks.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <div className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
              Local Time: <span className="text-blue-600 font-extrabold text-base tracking-normal normal-case">{formatTime(now)}</span>
            </div>
            <div className="mt-1 text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
              {formatDate(now)}
            </div>
          </div>
        </div>
      </div>

      {/* Cards row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Quick actions */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-bold text-slate-900">Quick Actions</div>
            <Zap className="h-4 w-4 text-blue-600" />
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => navigate("/certificates/create")}
              className="w-full rounded-2xl bg-blue-600 p-4 text-left text-white shadow-sm hover:bg-blue-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">Issue Certificates</div>
                    <div className="text-xs text-white/80">Generate new student credentials</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate("/templates")}
              className="w-full rounded-2xl bg-blue-50 p-4 text-left text-slate-900 hover:bg-blue-100"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-700">
                    <LayoutTemplate className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">Design Template</div>
                    <div className="text-xs text-slate-500">Create and edit layouts</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-500" />
              </div>
            </button>
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-bold text-slate-900">Recent Activity</div>
            <button
              type="button"
              onClick={() => navigate("/certificates")}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {(recentActivity.length ? recentActivity : [{ id: "x", title: "No activity yet", meta: "", ago: "" }]).map(
              (item) => (
                <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{item.title}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {item.meta}
                      {item.ago ? ` • ${item.ago}` : ""}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Active templates */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-bold text-slate-900">Active Certificate Templates</div>
            <button
              type="button"
              onClick={() => navigate("/templates")}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View All
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {topTemplates.map((t) => {
              const title = t?.metadata?.title || t?.name || "Template";
              const version = t?.metadata?.version ? `v${t.metadata.version}` : "";

              return (
                <button
                  type="button"
                  key={t?.id}
                  onClick={() => navigate("/templates")}
                  className="rounded-2xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50"
                >
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {title} {version}
                  </div>
                  <div className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-linear-to-br from-slate-50 to-slate-100" />
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => navigate("/templates")}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-3 text-slate-600 hover:bg-slate-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white">
                <Plus className="h-5 w-5" />
              </div>
              <div className="mt-2 text-xs font-semibold">Create New</div>
            </button>
          </div>
        </div>
      </div>

      {/* Search (placeholder interaction) */}
      {query.trim() && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          Search is currently UI-only on the dashboard. Query: <span className="font-semibold">{query.trim()}</span>
        </div>
      )}
    </div>
  );
}
