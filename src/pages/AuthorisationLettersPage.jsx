import { useState, useEffect, useCallback, useMemo } from "react";
import { authorisationAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Drawer from "../components/Drawer";
import Table from "../components/ui/Table";
import { UEW_DEPARTMENTS } from "../utils/constants";
import {
  Loader2, Search, Plus, FileX, Upload, CheckCircle,
  Clock, AlertTriangle, Eye,
} from "lucide-react";
import PageTitle from "../components/PageTitle";

const STATUS_BADGE = {
  pending: { className: "bg-amber-100 text-amber-900", icon: Clock, label: "Pending" },
  used: { className: "bg-green-100 text-green-700", icon: CheckCircle, label: "Used" },
  cancelled: { className: "bg-red-100 text-red-700", icon: AlertTriangle, label: "Cancelled" },
};

const CURRENT_YEAR = new Date().getFullYear();
const REF_PREFIX = `CERT-${CURRENT_YEAR}-`;

const INITIAL_FORM = {
  purpose: "provision", staff_id_suffix: "", requester_name: "", requester_staff_id: "",
  authorising_head_name: "", authorising_head_title: "", authorising_head_department: "",
  approval_date: "", notes: "", scanned_letter: null,
};

export default function AuthorisationLettersPage() {
  const { isSuperAdmin } = useAuth();
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [deptMode, setDeptMode] = useState("select"); // "select" | "custom"
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Flat list of all departments for dropdown
  const allDepartments = useMemo(
    () => UEW_DEPARTMENTS.flatMap((f) => f.departments.map((d) => d.department)),
    [],
  );

  const fetchLetters = useCallback(async () => {
    try {
      setLoading(true);
      const params = search ? { search } : {};
      const { data } = await authorisationAPI.getAll(params);
      setLetters(Array.isArray(data) ? data : data.results || []);
    } catch {
      setError("Failed to load authorisation references.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchLetters(); }, [fetchLetters]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      const payload = {
        reference_number: `${REF_PREFIX}${form.staff_id_suffix}`,
        purpose: form.purpose,
        requester_name: form.requester_name,
        requester_staff_id: form.requester_staff_id,
        authorising_head_name: form.authorising_head_name,
        authorising_head_title: form.authorising_head_title,
        authorising_head_department: form.authorising_head_department,
        approval_date: form.approval_date,
        notes: form.notes,
        scanned_letter: form.scanned_letter,
      };
      await authorisationAPI.create(payload);
      setShowForm(false);
      setForm(INITIAL_FORM);
      setDeptMode("select");
      await fetchLetters();
    } catch (err) {
      const d = err?.response?.data;
      const fallback = err?.friendlyMessage || "Failed to log authorisation.";
      setFormError(typeof d === "string" ? d : d?.detail || d?.reference_number?.[0] || fallback);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isSuperAdmin) {
    return <div className="p-8 text-center text-slate-500">Access restricted to Super Admins.</div>;
  }

  return (
    <div className="space-y-6">
      <PageTitle>Authorisation Letters</PageTitle>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600">&times;</button>
        </div>
      )}

      {/* Create Drawer */}
      <Drawer open={showForm} onClose={() => setShowForm(false)} title="Log Authorisation Reference" wide>
        <form onSubmit={handleCreate} className="space-y-5">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{formError}</div>
          )}

          {/* Purpose */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Purpose</label>
            <select
              required
              value={form.purpose}
              onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none bg-white"
            >
              <option value="provision">Account Provisioning</option>
              <option value="permission_change">Permission Change</option>
            </select>
          </div>

          {/* Reference Number — auto-prefix */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Reference Number</label>
            <div className="flex items-stretch">
              <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 text-sm text-slate-500 font-mono select-none">
                {REF_PREFIX}
              </span>
              <input type="text" required value={form.staff_id_suffix}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setForm((f) => ({ ...f, staff_id_suffix: val, requester_staff_id: val }));
                }}
                placeholder="STF001"
                className="flex-1 border border-slate-300 rounded-r-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
            </div>
          </div>

          {/* Requester details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Requester Name</label>
              <input type="text" required value={form.requester_name}
                onChange={(e) => setForm((f) => ({ ...f, requester_name: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Staff ID</label>
              <input type="text" required value={form.requester_staff_id} readOnly
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 outline-none cursor-not-allowed" />
            </div>
          </div>

          {/* Authorising Head section */}
          <fieldset className="space-y-3 border border-slate-200 rounded-lg p-4">
            <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">Authorising Head</legend>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
              <input type="text" required value={form.authorising_head_name}
                onChange={(e) => setForm((f) => ({ ...f, authorising_head_name: e.target.value }))}
                placeholder="Prof. Kwame Asante"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Title / Position</label>
              <input type="text" required value={form.authorising_head_title}
                onChange={(e) => setForm((f) => ({ ...f, authorising_head_title: e.target.value }))}
                placeholder="Head of Department"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
              {deptMode === "select" ? (
                <>
                  <select required value={form.authorising_head_department}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setDeptMode("custom");
                        setForm((f) => ({ ...f, authorising_head_department: "" }));
                      } else {
                        setForm((f) => ({ ...f, authorising_head_department: e.target.value }));
                      }
                    }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none">
                    <option value="">Select department...</option>
                    {allDepartments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                    <option value="__custom__">— Other (type manually) —</option>
                  </select>
                </>
              ) : (
                <div className="flex gap-2">
                  <input type="text" required value={form.authorising_head_department}
                    onChange={(e) => setForm((f) => ({ ...f, authorising_head_department: e.target.value }))}
                    placeholder="Enter department name..."
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
                  <button type="button" onClick={() => { setDeptMode("select"); setForm((f) => ({ ...f, authorising_head_department: "" })); }}
                    className="px-3 py-2 text-xs font-medium text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap">
                    Use list
                  </button>
                </div>
              )}
            </div>
          </fieldset>

          {/* Date, document, notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Approval Date</label>
              <input type="date" required value={form.approval_date}
                onChange={(e) => setForm((f) => ({ ...f, approval_date: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Scanned Letter</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setForm((f) => ({ ...f, scanned_letter: e.target.files?.[0] || null }))}
                className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea rows={3} value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none resize-none" />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium text-sm px-5 py-2 rounded-lg transition-colors">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Logging..." : "Log Reference"}
            </button>
          </div>
        </form>
      </Drawer>

      {/* Search */}
      <div className="relative flex gap-2 max-w-xl">
                <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-2 py-2 rounded-lg transition-colors w-3xs"
        >
          Log New Letter
        </button>

        <input
          type="text"
          placeholder="Search by reference, name, staff ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border-b-2 border-b-slate-300 px-2 py-2 text-sm focus:border-b-blue-400 outline-none"
        />
      </div>

      {/* Letters Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
      ) : letters.length === 0 ? (
        <div className="text-center py-12 text-slate-700 text-md">
          <FileX className="h-30 w-30 text-slate-300 mx-auto mb-3" />
          No authorisation letters logged yet.
        </div>
      ) : (
        <Table>
          <Table.Head>
            <tr>
              <Table.HeaderCell>Reference</Table.HeaderCell>
              <Table.HeaderCell>Purpose</Table.HeaderCell>
              <Table.HeaderCell>Requester</Table.HeaderCell>
              <Table.HeaderCell>Staff ID</Table.HeaderCell>
              <Table.HeaderCell>Approval Date</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Logged By</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Document</Table.HeaderCell>
            </tr>
          </Table.Head>
          <Table.Body>
            {letters.map((letter) => {
              const badge = STATUS_BADGE[letter.status] || STATUS_BADGE.pending;
              const BadgeIcon = badge.icon;
              return (
                <Table.Row key={letter.id}>
                  <Table.Cell className="font-mono text-xs font-semibold text-slate-800">{letter.reference_number}</Table.Cell>
                  <Table.Cell className="text-xs text-slate-600 capitalize">{letter.purpose === "permission_change" ? "Permission Change" : "Provisioning"}</Table.Cell>
                  <Table.Cell className="text-slate-700">{letter.requester_name}</Table.Cell>
                  <Table.Cell className="text-slate-600">{letter.requester_staff_id}</Table.Cell>
                  <Table.Cell className="text-slate-600">{letter.approval_date}</Table.Cell>
                  <Table.Cell>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
                      <BadgeIcon size={12} /> {badge.label}
                    </span>
                  </Table.Cell>
                  <Table.Cell className="text-slate-600">{letter.logged_by_name || "—"}</Table.Cell>
                  <Table.Cell className="text-right">
                    {letter.scanned_letter ? (
                      <a href={letter.scanned_letter} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium">
                        <Eye size={14} /> View
                      </a>
                    ) : (
                      <span className="text-slate-400 text-xs">None</span>
                    )}
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      )}
    </div>
  );
}
