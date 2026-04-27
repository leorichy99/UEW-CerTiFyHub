import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/ToastContainer";
import { confirmDialog } from "../components/ConfirmDialog";
import { templateAPI } from "../services/api";
import {
  Search,
  ChevronDown,
  Plus,
  Lock,
  Unlock,
  LayoutGrid,
  List,
  Loader2,
  Users,
  FileText,
  MoreHorizontal,
  Trash2,
  Pencil,
  Eye,
} from "lucide-react";
import SummaryStatCard from "../components/SummaryStatCard";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 12;

const STATUS_BADGE = {
  official: { label: "OFFICIAL", bg: "bg-emerald-500", text: "text-white" },
  draft: { label: "DRAFT", bg: "bg-amber-400", text: "text-white" },
  internal: { label: "INTERNAL", bg: "bg-blue-500", text: "text-white" },
};

export default function SuperAdminTemplatesPage() {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const navigate = useNavigate();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("updated_at");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState("grid");
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await templateAPI.getAll();
      setTemplates(data);
    } catch {
      toastRef.current.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleToggleLock = async (template) => {
    setToggling(template.id);
    try {
      const { data } = template.is_locked
        ? await templateAPI.unlock(template.id)
        : await templateAPI.lock(template.id);
      setTemplates((prev) =>
        prev.map((t) => {
          if (t.id !== template.id) return t;
          // Merge server response with existing local fields to avoid
          // losing computed/display-only fields (created_by_name, initials, metadata)
          return {
            ...t,
            ...data,
            created_by_name: data.created_by_name ?? t.created_by_name,
            created_by_initials: data.created_by_initials ?? t.created_by_initials,
            metadata: { ...(t.metadata || {}), ...(data.metadata || {}) },
          };
        })
      );
      toastRef.current.success(
        data.is_locked
          ? `"${template.name}" has been locked`
          : `"${template.name}" has been unlocked`
      );
    } catch {
      toastRef.current.error("Failed to update template lock status");
      fetchTemplates();
    } finally {
      setToggling(null);
    }
  };

  const handleEdit = (template) => {
    navigate(`/templates/${template.id}/edit`, {
      state: { returnTo: "/admin/templates" },
    });
  };

  const handleNewTemplate = () => {
    navigate("/templates/new", {
      state: { returnTo: "/admin/templates" },
    });
  };

  const handleDelete = async (template) => {
    const confirmed = await confirmDialog({
      title: "Delete Template",
      message: `Are you sure you want to delete "${template.name}"? This action cannot be undone.`,
    });
    if (!confirmed) return;
    try {
      await templateAPI.delete(template.id);
      setTemplates((prev) => prev.filter((t) => t.id !== template.id));
      toastRef.current.success(`"${template.name}" deleted`);
    } catch {
      toastRef.current.error("Failed to delete template");
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = templates.length;
    const locked = templates.filter((t) => t.is_locked).length;
    const draftsUnlocked = templates.filter(
      (t) => !t.is_locked || t.status === "draft"
    ).length;
    const creators = new Set(templates.map((t) => t.created_by).filter(Boolean))
      .size;
    return { total, locked, draftsUnlocked, creators };
  }, [templates]);

  // Filter + sort
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    let list = templates;
    if (q) {
      list = list.filter(
        (t) =>
          (t.name || "").toLowerCase().includes(q) ||
          (t.created_by_name || "").toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      if (sortBy === "updated_at")
        return new Date(b.updated_at) - new Date(a.updated_at);
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "created_at")
        return new Date(b.created_at) - new Date(a.created_at);
      return 0;
    });
    return list;
  }, [templates, query, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const handlePageChange = (p) => setPage(p);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryStatCard title="Total Templates" value={stats.total} Icon={LayoutGrid} tone="blue" />
        <SummaryStatCard title="Locked (Official)" value={stats.locked} Icon={Lock} tone="green" />
        <SummaryStatCard title="Drafts / Unlocked" value={stats.draftsUnlocked} Icon={FileText} tone="slate" />
        <SummaryStatCard title="Active Creators" value={stats.creators} Icon={Users} tone="amber" />
      </div>

      {/* Search + Filters Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search templates or creators..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <span>Sort by:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none h-10 pl-3 pr-8 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="updated_at">Last Modified</option>
                <option value="name">Name</option>
                <option value="created_at">Date Created</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 transition ${
                viewMode === "grid"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 transition ${
                viewMode === "list"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Template Grid */}
      <div
        className={
          viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            : "flex flex-col gap-3"
        }
      >
        {paged.map((template) => {
          const version = template.metadata?.version ?? 1;
          const badge = STATUS_BADGE[template.status] || STATUS_BADGE.draft;
          const thumb = template.metadata?.thumbnail;
          const isLocked = template.is_locked;
          const isToggling = toggling === template.id;

          if (viewMode === "list") {
            return (
              <div
                key={template.id}
                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition"
              >
                <div className="h-16 w-24 shrink-0 rounded-lg bg-slate-100 overflow-hidden">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={template.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-linear-to-br from-slate-200 to-slate-50" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text}`}
                    >
                      {badge.label}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 truncate">
                      {template.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      v{version}
                    </span>
                  </div>
                  {template.created_by_name && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Created by {template.created_by_name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {thumb && (
                    <button
                      onClick={() => setPreviewTemplate(template)}
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition"
                      title="Preview template"
                    >
                      <Eye size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(template)}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition"
                    title="Edit template"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(template)}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition"
                    title="Delete template"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => handleToggleLock(template)}
                    disabled={isToggling}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isLocked ? "bg-blue-600" : "bg-slate-300"
                    } ${isToggling ? "opacity-50" : ""}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isLocked ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-[11px] font-semibold text-slate-500 w-28">
                    {isLocked ? (
                      <span className="flex items-center gap-1 text-blue-600">
                        <Lock size={11} /> TEMPLATE LOCKED
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Unlock size={11} /> EDITING ALLOWED
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={template.id}
              className="rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-sm transition"
            >
              {/* Thumbnail — click to edit */}
              <div
                className="relative h-40 bg-slate-100 cursor-pointer"
                onClick={() => handleEdit(template)}
              >
                {thumb ? (
                  <img
                    src={thumb}
                    alt={template.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-linear-to-br from-slate-200 to-slate-50 flex items-center justify-center">
                    <FileText size={32} className="text-slate-300" />
                  </div>
                )}
                {/* Status badge */}
                <span
                  className={`absolute left-3 top-3 rounded px-2 py-0.5 text-[10px] font-bold tracking-wide ${badge.bg} ${badge.text}`}
                >
                  {badge.label}
                </span>
                {/* Version */}
                <span className="absolute right-3 top-3 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 shadow-sm">
                  v{version}
                </span>
              </div>

              {/* Body */}
              <div className="p-4">
                <h3
                  className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug cursor-pointer hover:text-blue-700 transition"
                  onClick={() => handleEdit(template)}
                >
                  {template.name}
                </h3>

                {/* Creator */}
                {template.created_by_name && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                      {template.created_by_initials || "??"}
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 leading-none">
                        Created by
                      </p>
                      <p className="text-xs font-medium text-slate-700 leading-tight">
                        {template.created_by_name}
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions row */}
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1">
                    {thumb && (
                      <button
                        onClick={() => setPreviewTemplate(template)}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition"
                        title="Preview template"
                      >
                        <Eye size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(template)}
                      className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition"
                      title="Edit template"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(template)}
                      className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      title="Delete template"
                    >
                      <Trash2 size={13} />
                    </button>
                    <span className="text-[11px] font-semibold ml-1">
                      {isLocked ? (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Lock size={11} /> LOCKED
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Unlock size={11} /> UNLOCKED
                        </span>
                      )}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleLock(template)}
                    disabled={isToggling}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isLocked ? "bg-blue-600" : "bg-slate-300"
                    } ${isToggling ? "opacity-50" : ""}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isLocked ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* New Template Card */}
        {viewMode === "grid" && (
          <button
            type="button"
            onClick={handleNewTemplate}
            className="flex min-h-70 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white text-center hover:border-blue-400 hover:bg-blue-50/30 transition group"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition">
              <Plus size={24} />
            </div>
            <p className="text-sm font-semibold text-slate-700">New Template</p>
            <p className="text-xs text-slate-400">Design a new certificate</p>
          </button>
        )}
      </div>

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setPreviewTemplate(null)}
          onKeyDown={(e) => { if (e.key === "Escape") setPreviewTemplate(null); }}
        >
          <div
            className="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 text-center">
              <div className="text-sm font-semibold text-white">{previewTemplate?.name || "Untitled"}</div>
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

      {/* Empty state */}
      {filtered.length === 0 && !loading && (
        <div className="py-16 text-center text-sm text-slate-500">
          No templates found.
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pt-2">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            itemsPerPage={PAGE_SIZE}
            totalItems={filtered.length}
          />
        </div>
      )}
    </div>
  );
}
