import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/ToastContainer";
import { useAuth } from "../context/AuthContext";
import { templateAPI } from "../services/api";
import { Plus, Search, Lock, Eye, FileText, LayoutGrid } from "lucide-react";
import SummaryStatCard from "../components/SummaryStatCard";
import Pagination from "../components/Pagination";

export default function TemplatesPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.profile?.role === "SUPER_ADMIN" || user?.is_superuser;
  const [templates, setTemplates] = useState([]);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [previewTemplate, setPreviewTemplate] = useState(null);

  const PAGE_SIZE = 8;

  const FILTERS = useMemo(
    () => [
      { id: "all", label: "All Templates" },
      { id: "degree", label: "Degree" },
      { id: "diploma", label: "Diploma" },
      { id: "short_course", label: "Short Course" },
      { id: "honorary", label: "Honorary" },
    ],
    []
  );

  function formatRelativeTime(iso) {
    if (!iso) return "";
    const ts = new Date(iso).getTime();
    if (!Number.isFinite(ts)) return "";
    const diff = Date.now() - ts;
    const sec = Math.round(diff / 1000);
    if (sec < 60) return "just now";
    const min = Math.round(sec / 60);
    if (min < 60) return `${min} min ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
    const day = Math.round(hr / 24);
    if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
    const wk = Math.round(day / 7);
    if (wk < 5) return `${wk} week${wk === 1 ? "" : "s"} ago`;
    const mo = Math.round(day / 30);
    return `${mo} month${mo === 1 ? "" : "s"} ago`;
  }

  const fetchTemplates = async () => {
    try {
      const { data } = await templateAPI.getAll();
      setTemplates(data);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const filteredTemplates = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    return (templates || []).filter((t) => {
      // Normal admins cannot see locked templates
      if (!isSuperAdmin && t?.is_locked) return false;

      const category = String(t?.metadata?.category || "").toLowerCase();
      const matchesFilter = activeFilter === "all" ? true : category === activeFilter;
      if (!matchesFilter) return false;

      if (!q) return true;
      const name = String(t?.name || "").toLowerCase();
      const title = String(t?.metadata?.title || "").toLowerCase();
      const idStr = String(t?.id || "").toLowerCase();
      return name.includes(q) || title.includes(q) || idStr.includes(q);
    });
  }, [templates, query, activeFilter, isSuperAdmin]);

  const templateStats = useMemo(() => {
    const all = templates || [];
    const visible = isSuperAdmin ? all : all.filter(t => !t?.is_locked);
    const locked = all.filter(t => t?.is_locked).length;
    return { total: visible.length, locked, showing: filteredTemplates.length };
  }, [templates, filteredTemplates, isSuperAdmin]);

  const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedTemplates = filteredTemplates.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handlePageChange = (p) => setPage(p);

  return (
    <div className="min-h-[calc(100vh-7rem)]">
      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Summary stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <SummaryStatCard title="Total Templates" value={templateStats.total} Icon={LayoutGrid} tone="info" />
          <SummaryStatCard title="Filtered Results" value={templateStats.showing} Icon={FileText} tone="neutral" />
          {isSuperAdmin && <SummaryStatCard title="Locked" value={templateStats.locked} Icon={Lock} tone="warning" />}
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search templates by title, department or ID..."
              className="h-11 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 shadow-sm"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="text-[11px] font-semibold tracking-widest text-slate-500">FILTERS:</div>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setActiveFilter(f.id);
                  setPage(1);
                }}
                className={`h-9 rounded-full px-4 text-sm ${
                  activeFilter === f.id
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() =>
                navigate("/templates/new", {
                  state: { returnTo: "/templates" },
                })
              }
              className="group flex min-h-70 flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-300 bg-white p-6 text-center hover:border-blue-400"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Plus className="h-6 w-6" />
              </div>
              <div className="text-sm font-semibold text-blue-700">Create New Template</div>
              <div className="mt-1 text-xs text-slate-500">Start a blank design</div>
            </button>
          )}

          {pagedTemplates.map((template) => {
            const version = template?.metadata?.version ?? 1;
            const title = template?.name || template?.metadata?.title || "Untitled";
            const subtitle = template?.description || template?.metadata?.subtitle || "";
            const thumb = template?.metadata?.thumbnail;
            const updated = formatRelativeTime(template?.updated_at);
            const isLocked = template?.is_locked;

            return (
              <div key={template.id} className={`overflow-hidden rounded-xl border bg-white shadow-sm ${isLocked ? "border-blue-200" : "border-slate-200"}`}>
                <div className="relative h-36 bg-slate-100">
                  {thumb ? (
                    <img src={thumb} alt={title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-slate-100" />
                  )}
                  <div className="absolute right-3 top-3 rounded-md bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white">
                    v{version}
                  </div>
                  {isLocked && (
                    <div className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white">
                      <Lock className="h-3 w-3" />
                      LOCKED
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="text-sm font-semibold text-slate-900 line-clamp-2">{title}</div>
                  <div className="mt-1 text-[11px] text-slate-500 line-clamp-2">{subtitle}</div>

                  <div className="mt-4 flex gap-2">
                    {thumb && (
                      <button
                        type="button"
                        onClick={() => setPreviewTemplate(template)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        title="Preview template"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    {isLocked ? (
                      <div className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-slate-100 text-sm font-medium text-slate-400 cursor-not-allowed">
                        <Lock className="h-3.5 w-3.5" />
                        Template Locked
                      </div>
                    ) : isSuperAdmin ? (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/templates/${template.id}/edit`, {
                            state: { returnTo: "/templates" },
                          })
                        }
                        className="flex h-9 w-full items-center justify-center rounded-md bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Edit Template
                      </button>
                    ) : (
                      <div className="flex h-9 w-full items-center justify-center rounded-md bg-slate-50 text-sm font-medium text-slate-400">
                        View Only
                      </div>
                    )}
                  </div>

                  <div className="mt-3 text-center text-[10px] text-slate-400">{updated ? `Last modified: ${updated}` : ""}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Template Preview Modal */}
        {previewTemplate && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setPreviewTemplate(null)}
            onKeyDown={(e) => { if (e.key === "Escape") setPreviewTemplate(null); }}
          >
            <div
              className="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 text-center">
                <div className="text-sm font-semibold text-white">{previewTemplate?.name || previewTemplate?.metadata?.title || "Untitled"}</div>
              </div>
              <img
                src={previewTemplate?.metadata?.thumbnail}
                alt="Template preview"
                className="max-h-[80vh] rounded-lg object-contain shadow-2xl"
                style={{ maxWidth: "100%" }}
              />
            </div>
          </div>
        )}

        {filteredTemplates.length === 0 && (
          <div className="py-16 text-center text-sm text-slate-500">No templates found.</div>
        )}

        {totalPages > 1 && (
          <div className="mt-8">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              itemsPerPage={PAGE_SIZE}
              totalItems={filteredTemplates.length}
            />
          </div>
        )}
      </div>
    </div>
  );
}
