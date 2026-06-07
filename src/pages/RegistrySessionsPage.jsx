/**
 * RegistrySessionsPage
 *
 * Super-Admin list of congregation sessions. Click a row to drill in to the
 * session detail page. Create-session modal lives here.
 */

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Plus, Loader2, X } from "lucide-react";

import { useSessions, useCreateSession } from "../hooks/registry/useSessions.js";
import { useFaculties, useDepartments } from "../hooks/registry/useFaculties.js";
import { useCongregations } from "../hooks/registry/useCongregations.js";
import { templateAPI } from "../services/api";
import { useToast } from "../components/ToastContainer";
import Table from "../components/ui/Table";

const inputClass =
  "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400";

const STATUS_STYLES = {
  DRAFT: "bg-slate-100 text-slate-700",
  PUBLISHED: "bg-blue-100 text-blue-700",
  CONFIRMATION_OPEN: "bg-amber-100 text-amber-900",
  CONFIRMATION_CLOSED: "bg-violet-100 text-violet-700",
  ISSUANCE_IN_PROGRESS: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  ARCHIVED: "bg-slate-200 text-slate-500",
};

const STATUS_LABELS = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  CONFIRMATION_OPEN: "Confirmation Open",
  CONFIRMATION_CLOSED: "Confirmation Closed",
  ISSUANCE_IN_PROGRESS: "Issuance In Progress",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

function readArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

export default function RegistrySessionsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const sessionsQuery = useSessions();
  const sessions = useMemo(() => readArray(sessionsQuery.data), [sessionsQuery.data]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-sm text-slate-500">{sessions.length} session(s)</div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
        >
          <Plus size={16} /> New session
        </button>
      </div>

      <Table>
        <Table.Head>
          <tr>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Year</Table.HeaderCell>
            <Table.HeaderCell>Scope</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Records</Table.HeaderCell>
          </tr>
        </Table.Head>
        <Table.Body>
          {sessionsQuery.isLoading && (
            <tr><td colSpan={5} className="text-center py-8"><Loader2 className="animate-spin inline" size={20} /></td></tr>
          )}
          {!sessionsQuery.isLoading && sessions.length === 0 && (
            <tr><td colSpan={5} className="text-center py-8 text-slate-500">No sessions yet. Create the first one.</td></tr>
          )}
          {sessions.map((s) => (
            <Table.Row key={s.id}>
              <Table.Cell className="text-sm">
                <Link to={`/registry/congregations/${s.congregation}/sessions/${s.id}`} className="font-medium text-blue-600 hover:underline">
                  {s.generated_name || s.name}
                </Link>
              </Table.Cell>
              <Table.Cell className="text-sm text-slate-700">{s.academic_year}</Table.Cell>
              <Table.Cell className="text-sm text-slate-700">
                {s.scope_type === "INSTITUTION" && "Institution"}
                  {s.scope_type === "FACULTY" && (s.faculty_name || "Faculty")}
                  {s.scope_type === "DEPARTMENT" && (s.department_name || "Department")}
                </Table.Cell>
                <Table.Cell className="text-sm">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${STATUS_STYLES[s.status] || "bg-slate-100"}`}>
                    {STATUS_LABELS[s.status] || s.status}
                  </span>
                </Table.Cell>
                <Table.Cell className="text-sm text-slate-700">{s.counts?.total ?? 0}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>

      {showCreate && (
        <CreateSessionModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            sessionsQuery.invalidate();
          }}
        />
      )}
    </div>
  );
}

function CreateSessionModal({ onClose, onCreated }) {
  const toast = useToast();
  const create = useCreateSession();
  const congregationsQuery = useCongregations({ status: "DRAFT,IN_PROGRESS" });
  const congregations = readArray(congregationsQuery.data);
  const facultiesQuery = useFaculties({ active_only: 1 });
  const departmentsQuery = useDepartments({ active_only: 1 });
  const faculties = readArray(facultiesQuery.data);
  const departments = readArray(departmentsQuery.data);
  const [templates, setTemplates] = useState([]);

  React.useEffect(() => {
    templateAPI.getAll().then((res) => {
      setTemplates(readArray(res.data));
    }).catch(() => {});
  }, []);

  const [form, setForm] = useState({
    scope_type: "INSTITUTION",
    faculty: "",
    department: "",
    confirmation_deadline: "",
    certificate_template: "",
    congregation: "",
  });

  const filteredDepartments = useMemo(
    () => departments.filter((d) => String(d.faculty) === String(form.faculty)),
    [departments, form.faculty],
  );

  const selectedCongregation = congregations.find((c) => String(c.id) === String(form.congregation));

  const handleSubmit = async () => {
    if (!form.confirmation_deadline || !form.certificate_template || !form.congregation) {
      toast.error("Fill out all required fields");
      return;
    }
    const payload = {
      scope_type: form.scope_type,
      confirmation_deadline: new Date(form.confirmation_deadline).toISOString(),
      certificate_template: form.certificate_template,
      congregation: form.congregation,
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
          <h3 className="text-base font-semibold text-slate-800">New congregation session</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <Field label="Congregation">
            <select value={form.congregation} onChange={(e) => setForm({ ...form, congregation: e.target.value })} className={inputClass}>
              <option value="">— Choose congregation —</option>
              {congregations.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.year})</option>)}
            </select>
          </Field>
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
          </Field>
          <Field label="Certificate template">
            <select value={form.certificate_template}
              onChange={(e) => setForm({ ...form, certificate_template: e.target.value })} className={inputClass}>
              <option value="">— Choose template —</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
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
