import { useMemo, useState, useEffect } from "react";
import { templateAPI } from "../services/api";
import TemplateEditor from "../components/TemplateEditor";
import { Layout as LayoutIcon, Plus, Search, UploadCloud } from "lucide-react";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);

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

  const handleSaveTemplate = async (templateData) => {
    try {
      const prevVersion = Number(selectedTemplate?.metadata?.version ?? 1);
      const nextVersion = selectedTemplate?.id ? Math.round((prevVersion + 0.1) * 10) / 10 : 1;

      const payload = {
        name: templateData?.title || selectedTemplate?.name || `Template ${Date.now()}`,
        canvas_width: templateData?.canvas?.width,
        canvas_height: templateData?.canvas?.height,
        metadata: {
          ...(templateData || {}),
          version: nextVersion,
        },
      };

      if (selectedTemplate?.id) {
        await templateAPI.update(selectedTemplate.id, payload);
      } else {
        await templateAPI.create(payload);
      }

      setShowEditor(false);
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error("Failed to save template:", error);
      alert("Failed to save template");
    }
  };

  const filteredTemplates = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    return (templates || []).filter((t) => {
      const category = String(t?.metadata?.category || "").toLowerCase();
      const matchesFilter = activeFilter === "all" ? true : category === activeFilter;
      if (!matchesFilter) return false;

      if (!q) return true;
      const name = String(t?.name || "").toLowerCase();
      const title = String(t?.metadata?.title || "").toLowerCase();
      const idStr = String(t?.id || "").toLowerCase();
      return name.includes(q) || title.includes(q) || idStr.includes(q);
    });
  }, [templates, query, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedTemplates = filteredTemplates.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="min-h-[calc(100vh-7rem)] bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <LayoutIcon className="h-7 w-7 text-slate-900" />
              <h2 className="text-2xl font-semibold text-slate-900">Certificate Template Gallery</h2>
            </div>
            <div className="mt-1 text-sm text-slate-500">Manage and design professional academic certificates for UEW</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
            >
              <UploadCloud className="h-4 w-4" />
              Import Template
            </button>
          </div>
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

        {showEditor ? (
          <div className="fixed inset-0 z-50 bg-slate-100">
            <TemplateEditor
              initialData={selectedTemplate}
              onSave={handleSaveTemplate}
              onClose={() => {
                setShowEditor(false);
                setSelectedTemplate(null);
              }}
            />
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplate(null);
                  setShowEditor(true);
                }}
                className="group flex min-h-70 flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-300 bg-white p-6 text-center hover:border-blue-400"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Plus className="h-6 w-6" />
                </div>
                <div className="text-sm font-semibold text-blue-700">Create New Template</div>
                <div className="mt-1 text-xs text-slate-500">Start a blank design</div>
              </button>

              {pagedTemplates.map((template) => {
                const version = template?.metadata?.version ?? 1;
                const title = template?.name || template?.metadata?.title || "Untitled";
                const subtitle = template?.description || template?.metadata?.subtitle || "";
                const thumb = template?.metadata?.thumbnail;
                const updated = formatRelativeTime(template?.updated_at);

                return (
                  <div key={template.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="relative h-36 bg-slate-100">
                      {thumb ? (
                        <img src={thumb} alt={title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-linear-to-br from-slate-200 to-slate-50" />
                      )}
                      <div className="absolute right-3 top-3 rounded-md bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white">
                        v{version}
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="text-sm font-semibold text-slate-900 line-clamp-2">{title}</div>
                      <div className="mt-1 text-[11px] text-slate-500 line-clamp-2">{subtitle}</div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowEditor(true);
                        }}
                        className="mt-4 flex h-9 w-full items-center justify-center rounded-md bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Edit Template
                      </button>

                      <div className="mt-3 text-center text-[10px] text-slate-400">{updated ? `Last modified: ${updated}` : ""}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!showEditor && filteredTemplates.length === 0 && (
              <div className="py-16 text-center text-sm text-slate-500">No templates found.</div>
            )}

            {filteredTemplates.length > PAGE_SIZE && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-9 w-9 rounded-md border border-slate-200 bg-white text-sm text-slate-700 disabled:opacity-50"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(0, 5)
                  .map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={`h-9 w-9 rounded-md text-sm ${
                        currentPage === p ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-9 w-9 rounded-md border border-slate-200 bg-white text-sm text-slate-700 disabled:opacity-50"
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
