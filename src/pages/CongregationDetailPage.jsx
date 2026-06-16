/**
 * CongregationDetailPage
 *
 * Drill-in for a single congregation: shows the embedded sessions list,
 * aggregate counts, and quick actions ("apply template", "archive"). The
 * heavy per-session UI lives on `RegistrySessionDetailPage`; this page is
 * just the umbrella.
 */

import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, GraduationCap, Loader2, Archive, FileStack,
  LayoutTemplate, Calendar, ChevronRight, Plus, X,
} from "lucide-react";

import {
  useCongregation, useArchiveCongregation,
} from "../hooks/registry/useCongregations.js";
import {
  useCongregationTemplates, useApplyCongregationTemplate,
} from "../hooks/registry/useCongregationTemplates.js";
import { useCreateBatch } from "../hooks/registry/useBatches.js";
import { useFaculties, useDepartments } from "../hooks/registry/useFaculties.js";
import { templateAPI } from "../services/api";
import { useToast } from "../components/ToastContainer";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import PageTitle from "../components/PageTitle";
import Table from "../components/ui/Table";
import Breadcrumb from "../components/ui/Breadcrumb";

const inputClass =
  "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400";

const STATUS_STYLES = {
  DRAFT: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  ARCHIVED: "bg-slate-200 text-slate-500",
};
const STATUS_LABELS = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

const SESSION_STATUS_STYLES = {
  DRAFT: "bg-slate-100 text-slate-700",
  PUBLISHED: "bg-blue-100 text-blue-700",
  CONFIRMATION_OPEN: "bg-amber-100 text-amber-900",
  CONFIRMATION_CLOSED: "bg-violet-100 text-violet-700",
  ISSUANCE_IN_PROGRESS: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  ARCHIVED: "bg-slate-200 text-slate-500",
};

export default function CongregationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useCongregation(id);
  const congregation = query.data;
  const toast = useToast();
  const confirm = useConfirmDialog();
  const archive = useArchiveCongregation(id);
  const [showApply, setShowApply] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const sessions = useMemo(
    () => (Array.isArray(congregation?.sessions) ? congregation.sessions : []),
    [congregation],
  );
  const counts = congregation?.counts || {};

  const handleArchive = async () => {
    const ok = await confirm({
      title: "Archive congregation?",
      message:
        "Archiving freezes the congregation and all its sessions. " +
        "This cannot be undone.",
      confirmText: "Archive",
      destructive: true,
    });
    if (!ok) return;
    try {
      await archive.execute();
      toast.success("Congregation archived.");
      query.invalidate?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to archive.");
    }
  };

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (!congregation) {
    return (
      <div className="text-center py-20 text-slate-500">
        Congregation not found.
      </div>
    );
  }

  const isArchived = congregation.status === "ARCHIVED";

  return (
    <div className="space-y-6">
      <PageTitle>Congregation</PageTitle>
      <Breadcrumb
        items={[
          { label: "Home", to: "/" },
          { label: "Congregations", to: "/admin/congregations" },
          { label: congregation.name },
        ]}
      />

      <header className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GraduationCap className="text-blue-600" size={20} />
            <h1 className="text-lg font-semibold text-slate-800">
              {congregation.name}
            </h1>
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${
                STATUS_STYLES[congregation.status] || "bg-slate-100"
              }`}
            >
              {STATUS_LABELS[congregation.status] || congregation.status}
            </span>
          </div>
          <div className="text-sm text-slate-500 flex items-center gap-4 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Calendar size={12} /> Year {congregation.year}
            </span>
            {congregation.sourced_from_template && (
              <span className="text-indigo-600">
                Sourced from template
              </span>
            )}
          </div>
          {congregation.description && (
            <p className="text-sm text-slate-600 max-w-2xl mt-1">
              {congregation.description}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 items-end">
          {!isArchived && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus size={14} /> Create session
            </button>
          )}
          {!isArchived && sessions.length === 0 && (
            <button
              onClick={() => setShowApply(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <LayoutTemplate size={14} /> Apply template
            </button>
          )}
          {!isArchived && congregation.status === "COMPLETED" && (
            <button
              onClick={handleArchive}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              <Archive size={14} /> Archive
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Sessions" value={congregation.session_count ?? sessions.length} />
        <Stat label="Total records" value={counts.total ?? 0} />
        <Stat label="Confirmed" value={counts.confirmed ?? 0} />
        <Stat label="Issued" value={counts.issued ?? 0} />
        <Stat label="Failed" value={counts.issuance_failed ?? 0} />
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-slate-700 font-medium">
          <FileStack size={16} className="text-slate-500" />
          Sessions ({sessions.length})
        </div>
        {sessions.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
            No sessions in this congregation yet.{" "}
            {!isArchived && "Apply a template or create a session."}
          </div>
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.HeaderCell>#</Table.HeaderCell>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>Scope</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Records</Table.HeaderCell>
              </tr>
            </Table.Head>
            <Table.Body>
              {sessions.map((s) => (
                <Table.Row key={s.id}>
                  <Table.Cell className="text-sm text-slate-500">
                    {s.session_number}
                  </Table.Cell>
                  <Table.Cell className="text-sm">
                    <Link
                      to={`/registry/congregations/${congregation.id}/sessions/${s.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {s.generated_name || s.name}
                    </Link>
                  </Table.Cell>
                  <Table.Cell className="text-sm text-slate-700">
                    {s.scope_type === "INSTITUTION" && "Institution"}
                    {s.scope_type === "FACULTY" && (s.faculty_name || "Faculty")}
                    {s.scope_type === "DEPARTMENT" && (s.department_name || "Department")}
                  </Table.Cell>
                  <Table.Cell className="text-sm">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                        SESSION_STATUS_STYLES[s.status] || "bg-slate-100"
                      }`}
                    >
                      {s.status}
                    </span>
                  </Table.Cell>
                  <Table.Cell className="text-sm text-slate-700">
                    {s.counts?.total ?? 0}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </section>

      {showCreate && (
        <CreateSessionModal
          congregation={congregation}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            query.invalidate?.();
          }}
        />
      )}
      {showApply && (
        <ApplyTemplateModal
          congregation={congregation}
          onClose={() => setShowApply(false)}
          onApplied={() => {
            setShowApply(false);
            query.invalidate?.();
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-xl font-semibold text-slate-800 mt-0.5">{value}</div>
    </div>
  );
}

function ApplyTemplateModal({ congregation, onClose, onApplied }) {
  const templatesQuery = useCongregationTemplates({ is_active: true });
  const templates = useMemo(() => {
    const data = templatesQuery.data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;
    return [];
  }, [templatesQuery.data]);

  const [selectedId, setSelectedId] = useState("");
  const apply = useApplyCongregationTemplate(selectedId);
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedId) {
      toast.error("Pick a template first.");
      return;
    }
    setSubmitting(true);
    try {
      await apply.execute({ congregation: congregation.id });
      toast.success("Template applied — sessions created.");
      onApplied?.();
    } catch (err) {
      const data = err?.response?.data;
      const msg =
        (typeof data === "string" && data) ||
        data?.detail ||
        (Array.isArray(data) && data.join(" ")) ||
        err.message;
      toast.error(msg || "Failed to apply template.");
    } finally {
      setSubmitting(false);
    }
  };

  const selected = templates.find((t) => t.id === selectedId);

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800 inline-flex items-center gap-2">
            <LayoutTemplate size={16} className="text-indigo-600" />
            Apply template
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Pick a template to instantiate its session blueprints into{" "}
          <strong>{congregation.name}</strong>.
        </p>

        {templatesQuery.isLoading ? (
          <div className="text-center py-6">
            <Loader2 className="animate-spin inline" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center text-sm text-slate-500 py-6">
            No active templates. Create one from the Templates page first.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {templates.map((t) => (
              <label
                key={t.id}
                className={`block border rounded-lg p-3 cursor-pointer text-sm ${
                  selectedId === t.id
                    ? "border-indigo-500 bg-indigo-50/50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="template"
                  value={t.id}
                  checked={selectedId === t.id}
                  onChange={() => setSelectedId(t.id)}
                  className="sr-only"
                />
                <div className="font-medium text-slate-800">{t.name}</div>
                {t.description && (
                  <div className="text-xs text-slate-500 mt-0.5">{t.description}</div>
                )}
                <div className="text-xs text-slate-500 mt-1">
                  {(t.session_defs || []).length} session(s)
                </div>
              </label>
            ))}
          </div>
        )}

        {selected && (
          <div className="border border-slate-200 rounded-lg p-3 text-xs text-slate-600 space-y-1">
            <div className="font-medium text-slate-700">Schedule preview</div>
            {(selected.session_defs || []).map((sd) => (
              <div key={sd.id || sd.session_number} className="flex justify-between">
                <span>
                  Session {sd.session_number} ({sd.scope_type})
                </span>
                <span>
                  +{sd.ceremony_day_offset}d · deadline {sd.confirmation_window_days}d before
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !selectedId}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Apply template
          </button>
        </div>
      </form>
    </div>
  );
}

function CreateSessionModal({ congregation, onClose, onCreated }) {
  const toast = useToast();
  const create = useCreateBatch();
  const facultiesQuery = useFaculties({ active_only: 1 });
  const departmentsQuery = useDepartments({ active_only: 1 });
  const faculties = useMemo(() => {
    const data = facultiesQuery.data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;
    return [];
  }, [facultiesQuery.data]);
  const departments = useMemo(() => {
    const data = departmentsQuery.data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;
    return [];
  }, [departmentsQuery.data]);
  const [templates, setTemplates] = useState([]);

  React.useEffect(() => {
    templateAPI.getAll().then((res) => {
      const data = res.data;
      if (!data) return;
      if (Array.isArray(data)) setTemplates(data);
      else if (Array.isArray(data.results)) setTemplates(data.results);
    }).catch(() => {});
  }, []);

  const [form, setForm] = useState({
    scope_type: "INSTITUTION",
    faculty: "",
    department: "",
    confirmation_deadline: "",
    certificate_template: "",
  });
  const [errors, setErrors] = useState({});

  const nextSessionNumber = (congregation.sessions?.length || 0) + 1;
  const generatedName = React.useMemo(() => {
    const ordinals = {
      1: 'First', 2: 'Second', 3: 'Third', 4: 'Fourth',
      5: 'Fifth', 6: 'Sixth', 7: 'Seventh', 8: 'Eighth',
      9: 'Ninth', 10: 'Tenth', 11: 'Eleventh', 12: 'Twelfth',
    };
    const ordinal = ordinals[nextSessionNumber] || `${nextSessionNumber}th`;
    return `${ordinal} Session`;
  }, [nextSessionNumber]);

  const filteredDepartments = useMemo(
    () => departments.filter((d) => String(d.faculty) === String(form.faculty)),
    [departments, form.faculty]
  );

  const validate = () => {
    const e = {};
    if (!form.confirmation_deadline) e.confirmation_deadline = "Deadline is required";
    if (!form.certificate_template) e.certificate_template = "Template is required";
    return e;
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const payload = {
      congregation: congregation.id,
      scope_type: form.scope_type,
      confirmation_deadline: new Date(form.confirmation_deadline).toISOString(),
      certificate_template: form.certificate_template,
      session_number: null,
    };
    if (form.scope_type === "FACULTY") {
      if (!form.faculty) { toast.error("Pick a faculty"); return; }
      payload.faculty = form.faculty;
    }
    if (form.scope_type === "DEPARTMENT") {
      if (!form.faculty || !form.department) {
        toast.error("Pick faculty and department"); return;
      }
      payload.faculty = form.faculty;
      payload.department = form.department;
    }
    try {
      await create.execute(payload);
      toast.success("Session created");
      onCreated?.();
    } catch (e) {
      const msg = e?.response?.data?.detail || "Failed to create session";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(e?.response?.data || {}));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-800">Add Session — {congregation.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
            This will be created as <strong>{generatedName}</strong>
          </div>
          <Field label="Scope">
            <select value={form.scope_type} onChange={(e) => setForm({ ...form, scope_type: e.target.value, faculty: "", department: "" })} className={inputClass}>
              <option value="INSTITUTION">Institution-wide</option>
              <option value="FACULTY">Faculty</option>
              <option value="DEPARTMENT">Department</option>
            </select>
          </Field>
          {form.scope_type !== "INSTITUTION" && (
            <Field label="Faculty">
              <select value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value, department: "" })} className={inputClass}>
                <option value="">— Choose faculty —</option>
                {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </Field>
          )}
          {form.scope_type === "DEPARTMENT" && (
            <Field label="Department">
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={inputClass}>
                <option value="">— Choose department —</option>
                {filteredDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Confirmation deadline">
            <input type="datetime-local" value={form.confirmation_deadline}
              onChange={(e) => setForm({ ...form, confirmation_deadline: e.target.value })} className={inputClass} />
            {errors.confirmation_deadline && <p className="text-xs text-red-600 mt-1">{errors.confirmation_deadline}</p>}
          </Field>
          <Field label="Certificate template">
            <select value={form.certificate_template}
              onChange={(e) => setForm({ ...form, certificate_template: e.target.value })} className={inputClass}>
              <option value="">— Choose template —</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {errors.certificate_template && <p className="text-xs text-red-600 mt-1">{errors.certificate_template}</p>}
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-3 py-2 text-sm text-slate-600">Cancel</button>
            <button onClick={handleSubmit} disabled={create.isExecuting}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {create.isExecuting ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
