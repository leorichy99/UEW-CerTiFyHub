/**
 * RegistrySessionDetailPage
 *
 * Tabs: Overview · Records · Imports
 * In Draft, allows file uploads, manual record edits, and deletions.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, GraduationCap, Upload, Loader2, FileSpreadsheet,
  Pencil, Trash2, AlertTriangle, CheckCircle2, Clock, Hourglass,
  CalendarPlus, History, ChevronRight, Search,
} from "lucide-react";

import {
  useSession, useSessionRecords, useSessionImports,
  useUpdateRecord, useDeleteRecord, uploadImportFile,
  usePublishSession, useSessionDisputes, useResolveDispute,
  useCloseConfirmation, useStartIssuance, useCompleteSession,
  useExtendDeadline, useDeadlineExtensions,
  useIssuanceBatches, useCreateIssuanceBatch,
} from "../hooks/registry/useSessions.js";
import { useFaculties, useDepartments } from "../hooks/registry/useFaculties.js";
import { useSessionProgress } from "../hooks/registry/useSessionProgress.js";
import { useToast } from "../components/ToastContainer";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import Table from "../components/ui/Table";

const inputClass =
  "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400";

function readArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

export default function RegistrySessionDetailPage() {
  const params = useParams();
  const batchId = params.id || params.session_id;
  const congregation_id = params.congregation_id;
  const [tab, setTab] = useState("overview");
  const sessionQuery = useSession(batchId);
  const baseSession = sessionQuery.data;
  // Subscribe to live progress while the session is in any in-flight state.
  const streamEnabled = !!baseSession && [
    "PUBLISHED", "CONFIRMATION_OPEN", "CONFIRMATION_CLOSED",
    "ISSUANCE_IN_PROGRESS",
  ].includes(baseSession.status);
  const { snapshot: liveSnapshot } = useSessionProgress(batchId, { enabled: streamEnabled });
  // Merge: live status + counts override the cached session view when present.
  const session = baseSession && liveSnapshot
    ? { ...baseSession, status: liveSnapshot.status, counts: { ...baseSession.counts, ...liveSnapshot.counts } }
    : baseSession;
  const isDraft = session?.status === "DRAFT";

  // When the stream sees a status change, invalidate the underlying query so
  // tabs that derive from the full session payload (e.g. Disputes) refresh.
  useEffect(() => {
    if (liveSnapshot && baseSession && liveSnapshot.status !== baseSession.status) {
      sessionQuery.invalidate();
    }
  }, [liveSnapshot?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const publish = usePublishSession(batchId);
  const closeConfirmation = useCloseConfirmation(batchId);
  const startIssuance = useStartIssuance(batchId);
  const completeSession = useCompleteSession(batchId);
  const toast = useToast();
  const confirm = useConfirmDialog();

  const handlePublish = async () => {
    const ok = await confirm({
      title: "Send confirmation emails?",
      message:
        `This will generate confirmation tokens for ${session?.counts?.total ?? 0} student(s) ` +
        `and dispatch invitation emails. You will no longer be able to edit records ` +
        `or upload more imports after publishing.`,
      confirmText: "Publish",
    });
    if (!ok) return;
    try {
      const result = await publish.execute();
      const s = result?.publication_summary;
      toast.success(
        s ? `Published: ${s.sent}/${s.total} emails sent` : "Session published",
      );
      sessionQuery.invalidate();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to publish");
    }
  };

  const handleCloseConfirmation = async () => {
    const pending = (session?.counts?.pending ?? 0);
    const ok = await confirm({
      title: "Close confirmation window?",
      message:
        `${pending} record(s) still pending will be auto-flagged for review. ` +
        `Only CONFIRMED records will move on to issuance.`,
      confirmText: "Close confirmation",
    });
    if (!ok) return;
    try {
      const result = await closeConfirmation.execute();
      toast.success(`Confirmation closed. ${result.flagged_records} record(s) flagged.`);
      sessionQuery.invalidate();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to close confirmation");
    }
  };

  const handleStartIssuance = async () => {
    const confirmed = (session?.counts?.confirmed ?? 0);
    const ok = await confirm({
      title: "Start issuance?",
      message:
        `Generate certificates for ${confirmed} confirmed record(s)? ` +
        `An issuance email will be dispatched per certificate.`,
      confirmText: "Start issuance",
    });
    if (!ok) return;
    try {
      const result = await startIssuance.execute();
      toast.success(
        `${result.issued_records} certificate(s) issued, ${result.failed_records} failed.`,
      );
      sessionQuery.invalidate();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to start issuance");
    }
  };

  const handleComplete = async () => {
    const ok = await confirm({
      title: "Mark session completed?",
      message: "Once completed, the session can only be archived.",
      confirmText: "Complete session",
    });
    if (!ok) return;
    try {
      await completeSession.execute();
      toast.success("Session marked as completed.");
      sessionQuery.invalidate();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to complete");
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link to="/admin/batches" className="text-slate-500 hover:text-slate-700">
          Batches
        </Link>
        <ChevronRight size={14} className="text-slate-300" />
        <span className="text-slate-800 font-medium">
          {session?.name || "Batch"}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <GraduationCap className="text-blue-600" size={22} />
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-slate-800">{session?.name || "Batch"}</h1>
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <span>{session?.academic_year} · {session?.scope_type} · {session?.status}</span>
            {streamEnabled && liveSnapshot && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
              </span>
            )}
          </p>
        </div>
        <PipelineActions
          session={session}
          publish={{ run: handlePublish, isBusy: publish.isExecuting }}
          closeConfirmation={{
            run: handleCloseConfirmation, isBusy: closeConfirmation.isExecuting,
          }}
          startIssuance={{
            run: handleStartIssuance, isBusy: startIssuance.isExecuting,
          }}
          complete={{ run: handleComplete, isBusy: completeSession.isExecuting }}
        />
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {[
          ["overview", "Overview"],
          ["records", "Records"],
          ["imports", "Imports"],
          ["disputes", `Disputes${session?.counts?.disputed ? ` (${session.counts.disputed})` : ""}`],
          ["batches", "Issuance"],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
              tab === k
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab session={session} loading={sessionQuery.isLoading} />}
      {tab === "records" && <RecordsTab sessionId={batchId} isDraft={isDraft} />}
      {tab === "imports" && (
        <ImportsTab sessionId={batchId} isDraft={isDraft}
          onUploaded={() => sessionQuery.invalidate()} />
      )}
      {tab === "disputes" && (
        <DisputesTab sessionId={batchId} onResolved={() => sessionQuery.invalidate()} />
      )}
      {tab === "batches" && (
        <IssuanceBatchesTab session={session} onChanged={() => sessionQuery.invalidate()} />
      )}
    </div>
  );
}

function PipelineActions({ session, publish, closeConfirmation, startIssuance, complete }) {
  if (!session) return null;
  const total = session.counts?.total ?? 0;
  const confirmed = session.counts?.confirmed ?? 0;

  const Button = ({ onClick, disabled, busy, color, children }) => (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className={`px-4 py-2 rounded-lg text-sm text-white flex items-center gap-2 disabled:opacity-50 ${color}`}
    >
      {busy ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
      {children}
    </button>
  );

  switch (session.status) {
    case "DRAFT":
      return (
        <Button
          onClick={publish.run}
          busy={publish.isBusy}
          disabled={total === 0}
          color="bg-emerald-600 hover:bg-emerald-700"
        >
          Send confirmation emails
        </Button>
      );
    case "PUBLISHED":
    case "CONFIRMATION_OPEN":
      return (
        <Button
          onClick={closeConfirmation.run}
          busy={closeConfirmation.isBusy}
          color="bg-violet-600 hover:bg-violet-700"
        >
          Close confirmation
        </Button>
      );
    case "CONFIRMATION_CLOSED":
      return (
        <Button
          onClick={startIssuance.run}
          busy={startIssuance.isBusy}
          disabled={confirmed === 0}
          color="bg-indigo-600 hover:bg-indigo-700"
        >
          Start issuance
        </Button>
      );
    case "ISSUANCE_IN_PROGRESS":
      return (
        <Button
          onClick={complete.run}
          busy={complete.isBusy}
          color="bg-emerald-600 hover:bg-emerald-700"
        >
          Mark completed
        </Button>
      );
    default:
      return null;
  }
}

function OverviewTab({ session, loading }) {
  if (loading) return <div className="text-center py-10"><Loader2 className="animate-spin inline" /></div>;
  if (!session) return <div className="text-slate-500">Session not found.</div>;
  const c = session.counts || {};
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <Stat label="Total records" value={c.total ?? 0} />
      <Stat label="Confirmed" value={c.confirmed ?? 0} />
      <Stat label="Pending" value={c.pending ?? 0} />
      <Stat label="Issued" value={c.issued ?? 0} />
      <Stat label="Disputed" value={c.disputed ?? 0} />
      <Stat label="Flagged" value={c.flagged ?? 0} />
      <Stat label="Issuance failed" value={c.issuance_failed ?? 0} />
      <div className="col-span-full bg-white border border-slate-200 rounded-lg p-4 text-sm text-slate-600 space-y-2">
        <div><strong>Slug:</strong> {session.slug}</div>
        <div className="flex flex-wrap items-center gap-2">
          <strong>Confirmation deadline:</strong>
          <span>{session.confirmation_deadline}</span>
          <DeadlineBadge session={session} />
          <ExtendedBadge session={session} />
        </div>
        <div><strong>Template:</strong> {session.template_name}</div>
        <MultiUploadIndicator session={session} />
      </div>
      <DeadlineExtensionSection session={session} />
    </div>
  );
}

function ExtendedBadge({ session }) {
  const count = session?.confirmation_deadline_extension_count || 0;
  if (count <= 0) return null;
  return (
    <span
      title={
        session.confirmation_deadline_original
          ? `Original: ${session.confirmation_deadline_original}`
          : ""
      }
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-200"
    >
      <History size={12} /> Extended ×{count}
    </span>
  );
}

function DeadlineExtensionSection({ session }) {
  const canExtend = ["PUBLISHED", "CONFIRMATION_OPEN"].includes(session?.status);
  const historyQuery = useDeadlineExtensions(session?.id);
  const extensions = readArray(historyQuery.data);
  if (!canExtend && extensions.length === 0) return null;

  return (
    <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-3">
      {canExtend && (
        <ExtendDeadlineForm
          session={session}
          onSuccess={() => historyQuery.invalidate?.()}
        />
      )}
      {extensions.length > 0 && (
        <ExtensionHistoryCard extensions={extensions} />
      )}
    </div>
  );
}

function ExtendDeadlineForm({ session, onSuccess }) {
  const [newDeadline, setNewDeadline] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const extend = useExtendDeadline(session.id);
  const toast = useToast();

  // Pre-fill with a sensible default: current deadline + 7 days, in
  // the format the <input type="datetime-local"> accepts.
  useEffect(() => {
    if (newDeadline || !session?.confirmation_deadline) return;
    const current = new Date(session.confirmation_deadline);
    if (Number.isNaN(current.getTime())) return;
    const next = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
    // Strip seconds + timezone for the input's format (YYYY-MM-DDTHH:MM).
    const pad = (n) => String(n).padStart(2, "0");
    setNewDeadline(
      `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T${pad(next.getHours())}:${pad(next.getMinutes())}`
    );
  }, [session?.confirmation_deadline]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    if (!newDeadline) {
      toast.error("Pick a new deadline first.");
      return;
    }
    setSubmitting(true);
    try {
      // The <input type="datetime-local"> value has no timezone; let the
      // browser interpret it in local time then convert to ISO for the API.
      const iso = new Date(newDeadline).toISOString();
      await extend.execute({ new_deadline: iso, reason: reason.trim() });
      toast.success("Deadline extended.");
      setReason("");
      onSuccess?.();
    } catch (err) {
      toast.error(err?.response?.data || err.message || "Failed to extend.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="bg-white border border-slate-200 rounded-lg p-4 space-y-3"
    >
      <div className="flex items-center gap-2 text-slate-700 font-medium">
        <CalendarPlus size={16} className="text-indigo-600" />
        Extend confirmation deadline
      </div>
      <label className="block text-xs text-slate-600">
        New deadline
        <input
          type="datetime-local"
          className={`${inputClass} mt-1`}
          value={newDeadline}
          onChange={(e) => setNewDeadline(e.target.value)}
          required
        />
      </label>
      <label className="block text-xs text-slate-600">
        Reason (optional, max 300 chars)
        <textarea
          className={`${inputClass} mt-1 resize-none`}
          rows={2}
          maxLength={300}
          value={reason}
          placeholder="e.g. Power outage on campus delayed confirmations."
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <CalendarPlus size={14} />}
        Extend deadline
      </button>
    </form>
  );
}

function ExtensionHistoryCard({ extensions }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center gap-2 text-slate-700 font-medium mb-2">
        <History size={16} className="text-slate-500" />
        Extension history ({extensions.length})
      </div>
      <ul className="space-y-2 text-xs">
        {extensions.map((ext) => (
          <li
            key={ext.id}
            className="border-l-2 border-indigo-200 pl-3 py-1 text-slate-600"
          >
            <div>
              <span className="font-medium text-slate-800">
                {new Date(ext.extended_at).toLocaleString()}
              </span>
              {ext.extended_by_name && (
                <span className="ml-2 text-slate-500">by {ext.extended_by_name}</span>
              )}
            </div>
            <div>
              {new Date(ext.previous_deadline).toLocaleString()} →{" "}
              <span className="font-semibold">
                {new Date(ext.new_deadline).toLocaleString()}
              </span>
            </div>
            {ext.reason && <div className="mt-1 italic">"{ext.reason}"</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DeadlineBadge({ session }) {
  if (!session?.confirmation_deadline) return null;
  // Only meaningful for sessions in the confirmation window or later.
  const blockingStatuses = ["DRAFT", "COMPLETED", "ARCHIVED"];
  if (blockingStatuses.includes(session.status)) return null;

  const deadline = new Date(session.confirmation_deadline);
  if (Number.isNaN(deadline.getTime())) return null;
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLeft = Math.ceil((deadline - now) / msPerDay);

  let cls = "bg-slate-100 text-slate-700";
  let Icon = Clock;
  let label = `${daysLeft} day${Math.abs(daysLeft) === 1 ? "" : "s"} left`;

  if (daysLeft < 0) {
    cls = "bg-rose-100 text-rose-700";
    Icon = AlertTriangle;
    label = `Overdue · auto-close pending`;
  } else if (daysLeft === 0) {
    cls = "bg-amber-100 text-amber-900";
    Icon = Hourglass;
    label = "Closes today";
  } else if (daysLeft <= 3) {
    cls = "bg-amber-100 text-amber-900";
    Icon = Hourglass;
  } else {
    cls = "bg-emerald-50 text-emerald-700";
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${cls}`}>
      <Icon size={12} /> {label}
    </span>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-2xl font-semibold text-slate-800 mt-1">{value}</div>
    </div>
  );
}

function RecordsTab({ sessionId, isDraft }) {
  const recordsQuery = useSessionRecords(sessionId);
  const records = readArray(recordsQuery.data);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const updateRecord = useUpdateRecord(sessionId, editing?.id);
  const deleteRecord = useDeleteRecord(sessionId, editing?.id);
  const toast = useToast();
  const confirm = useConfirmDialog();

  const filteredRecords = search.trim()
    ? records.filter((r) => {
        const q = search.toLowerCase();
        return (
          (r.full_name || "").toLowerCase().includes(q) ||
          (r.index_number || "").toLowerCase().includes(q) ||
          (r.programme || "").toLowerCase().includes(q)
        );
      })
    : records;

  const handleDelete = async (record) => {
    const ok = await confirm({
      title: "Delete record?",
      message: `Delete ${record.full_name} (${record.index_number})?`,
      confirmText: "Delete", destructive: true,
    });
    if (!ok) return;
    try {
      // useDeleteRecord uses url at construction time; build ad-hoc via fetch:
      const res = await fetch(
        `/api/registry/sessions/${sessionId}/records/${record.id}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` },
        },
      );
      if (!res.ok) throw new Error("Failed");
      toast.success("Record deleted");
      recordsQuery.invalidate();
    } catch {
      toast.error("Failed to delete record");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, index number, or programme..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition"
          />
        </div>
        {search && (
          <span className="text-xs text-slate-500">
            {filteredRecords.length} result{filteredRecords.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <Table>
        <Table.Head>
          <tr>
            <Table.HeaderCell>Index</Table.HeaderCell>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Email</Table.HeaderCell>
            <Table.HeaderCell>Programme</Table.HeaderCell>
            <Table.HeaderCell>Class</Table.HeaderCell>
            <Table.HeaderCell></Table.HeaderCell>
          </tr>
        </Table.Head>
        <Table.Body>
          {recordsQuery.isLoading && (
            <tr><td colSpan={6} className="text-center py-8"><Loader2 className="animate-spin inline" size={20} /></td></tr>
          )}
          {!recordsQuery.isLoading && filteredRecords.length === 0 && (
            <tr><td colSpan={6} className="text-center py-8 text-slate-500">
              {search ? "No records match your search." : "No records yet. Upload an import file or add records."}
            </td></tr>
          )}
          {filteredRecords.map((r) => (
            <Table.Row key={r.id}>
              <Table.Cell className="text-sm font-mono">{r.index_number}</Table.Cell>
              <Table.Cell className="text-sm">{r.full_name}</Table.Cell>
              <Table.Cell className="text-sm text-slate-600">{r.institutional_email}</Table.Cell>
              <Table.Cell className="text-sm">{r.programme}</Table.Cell>
              <Table.Cell className="text-sm">{r.class_of_degree}</Table.Cell>
              <Table.Cell className="text-right">
                {isDraft && (
                  <>
                    <button onClick={() => setEditing(r)} className="text-slate-500 hover:text-blue-600 mr-2">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(r)} className="text-slate-500 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      {editing && (
        <EditRecordModal
          record={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); recordsQuery.invalidate(); }}
          updateRecord={updateRecord}
        />
      )}
    </div>
  );
}

function EditRecordModal({ record, onClose, onSaved, updateRecord }) {
  const toast = useToast();
  const [form, setForm] = useState({
    index_number: record.index_number,
    full_name: record.full_name,
    institutional_email: record.institutional_email,
    programme: record.programme,
    class_of_degree: record.class_of_degree,
    date_of_completion: record.date_of_completion,
  });

  const handleSave = async () => {
    try {
      await updateRecord.execute(form);
      toast.success("Record updated");
      onSaved?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to update");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
        <h3 className="text-base font-semibold text-slate-800 mb-4">Edit record</h3>
        <div className="space-y-3">
          {[
            ["index_number", "Index number"],
            ["full_name", "Full name"],
            ["institutional_email", "Institutional email"],
            ["programme", "Programme"],
            ["class_of_degree", "Class of degree"],
            ["date_of_completion", "Date of completion"],
          ].map(([k, label]) => (
            <label key={k} className="block">
              <span className="text-xs font-medium text-slate-600 mb-1 block">{label}</span>
              <input
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                className={inputClass}
                type={k === "date_of_completion" ? "date" : "text"}
              />
            </label>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-3 py-2 text-sm text-slate-600">Cancel</button>
            <button onClick={handleSave} disabled={updateRecord.isExecuting}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImportsTab({ sessionId, isDraft, onUploaded }) {
  const importsQuery = useSessionImports(sessionId);
  const imports = readArray(importsQuery.data);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const handleUpload = useCallback(async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const batch = await uploadImportFile(sessionId, file);
      toast.success(
        `Imported ${batch.success_count} of ${batch.total_rows} rows` +
        (batch.error_count ? ` (${batch.error_count} error(s))` : ''),
      );
      importsQuery.invalidate();
      onUploaded?.();
    } catch (e) {
      const detail = e?.response?.data;
      toast.error(typeof detail === "string" ? detail : (detail?.detail || "Upload failed"));
    } finally {
      setUploading(false);
    }
  }, [sessionId, importsQuery, onUploaded, toast]);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles?.[0]) handleUpload(acceptedFiles[0]);
  }, [handleUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
    disabled: uploading,
  });

  return (
    <div className="space-y-4">
      {isDraft && (
        <div
          {...getRootProps()}
          className={`bg-white border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
            isDragActive
              ? "border-blue-500 bg-blue-50/50"
              : "border-slate-300 hover:border-slate-400"
          } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <input {...getInputProps()} />
          <FileSpreadsheet
            className={`mx-auto mb-3 transition ${isDragActive ? "text-blue-500" : "text-slate-400"}`}
            size={40}
          />
          <p className="text-sm text-slate-700 font-medium mb-1">
            {isDragActive
              ? "Drop the file here to upload"
              : "Drag and drop a CSV or XLSX file, or click to browse"}
          </p>
          <p className="text-xs text-slate-500 mb-4">
            Required columns: <code>index_number</code>, <code>full_name</code>,
            <code> institutional_email</code>, <code>programme</code>, <code>class_of_degree</code>,
            <code> date_of_completion</code>.
          </p>
          <button
            type="button"
            disabled={uploading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
            {uploading ? "Uploading…" : "Choose file"}
          </button>
        </div>
      )}

      <Table>
        <Table.Head>
          <tr>
            <Table.HeaderCell>File</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Rows</Table.HeaderCell>
            <Table.HeaderCell>Success</Table.HeaderCell>
            <Table.HeaderCell>Errors</Table.HeaderCell>
            <Table.HeaderCell>Uploaded</Table.HeaderCell>
          </tr>
        </Table.Head>
        <Table.Body>
          {importsQuery.isLoading && (
            <tr><td colSpan={6} className="text-center py-8"><Loader2 className="animate-spin inline" size={20} /></td></tr>
          )}
          {!importsQuery.isLoading && imports.length === 0 && (
            <tr><td colSpan={6} className="text-center py-8 text-slate-500">No imports yet.</td></tr>
          )}
          {imports.map((b) => (
            <Table.Row key={b.id}>
              <Table.Cell className="text-sm">{b.file_name}</Table.Cell>
              <Table.Cell className="text-sm">
                <BatchStatus status={b.status} />
              </Table.Cell>
              <Table.Cell className="text-sm">{b.total_rows}</Table.Cell>
              <Table.Cell className="text-sm text-emerald-700">{b.success_count}</Table.Cell>
              <Table.Cell className="text-sm text-red-600">{b.error_count}</Table.Cell>
              <Table.Cell className="text-sm text-slate-500">{b.uploaded_at?.slice(0, 16).replace("T", " ")}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      {imports.some((b) => b.error_count > 0) && (
        <details className="bg-white border border-slate-200 rounded-lg p-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            View error logs ({imports.reduce((sum, b) => sum + (b.error_log?.length || 0), 0)} total)
          </summary>
          <div className="mt-3 space-y-3">
            {imports.filter((b) => b.error_log?.length).map((b) => (
              <div key={b.id} className="text-xs">
                <div className="font-medium text-slate-700 mb-1">{b.file_name}</div>
                <ul className="space-y-1 ml-4 list-disc text-slate-600">
                  {b.error_log.map((err, idx) => (
                    <li key={idx}>Row {err.row}{err.field ? ` (${err.field})` : ''}: {err.message}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function DisputesTab({ sessionId, onResolved }) {
  const disputesQuery = useSessionDisputes(sessionId);
  const disputes = readArray(disputesQuery.data);
  const [active, setActive] = useState(null);

  return (
    <div className="space-y-4">
      {disputesQuery.isLoading && (
        <div className="text-center py-10"><Loader2 className="animate-spin inline" /></div>
      )}
      {!disputesQuery.isLoading && disputes.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-slate-500 text-sm">
          No outstanding disputes.
        </div>
      )}

      {disputes.map((r) => (
        <div key={r.id} className="bg-white border border-amber-200 rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="text-amber-600" size={16} />
                <h3 className="text-sm font-semibold text-slate-800">{r.full_name}</h3>
                <code className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{r.index_number}</code>
              </div>
              <p className="text-xs text-slate-500 mb-2">
                Disputed {r.dispute_submitted_at?.slice(0, 16).replace("T", " ")} ·
                {r.programme} · {r.class_of_degree}
              </p>
              <blockquote className="text-sm text-slate-700 bg-amber-50 border-l-2 border-amber-300 pl-3 py-1 italic">
                {r.dispute_note}
              </blockquote>
            </div>
            <button
              onClick={() => setActive(r)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap"
            >
              Resolve
            </button>
          </div>
        </div>
      ))}

      {active && (
        <ResolveDisputeModal
          sessionId={sessionId}
          record={active}
          onClose={() => setActive(null)}
          onResolved={() => {
            setActive(null);
            disputesQuery.invalidate();
            onResolved?.();
          }}
        />
      )}
    </div>
  );
}

function ResolveDisputeModal({ sessionId, record, onClose, onResolved }) {
  const toast = useToast();
  const resolve = useResolveDispute(sessionId, record.id);
  const [mode, setMode] = useState("correct");
  const [resolutionNote, setResolutionNote] = useState("");
  const [corrections, setCorrections] = useState({
    full_name: record.full_name,
    institutional_email: record.institutional_email,
    programme: record.programme,
    class_of_degree: record.class_of_degree,
    date_of_completion: record.date_of_completion,
  });

  const submit = async () => {
    if (mode === "reject" && !resolutionNote.trim()) {
      toast.error("Resolution note is required when rejecting a dispute.");
      return;
    }
    const payload = { mode, resolution_note: resolutionNote };
    if (mode === "correct") {
      const diff = {};
      for (const k of Object.keys(corrections)) {
        if (corrections[k] !== record[k]) diff[k] = corrections[k];
      }
      if (Object.keys(diff).length === 0) {
        toast.error("Change at least one field, or switch to Reject.");
        return;
      }
      payload.corrections = diff;
    }
    try {
      await resolve.execute(payload);
      toast.success(mode === "correct"
        ? "Record updated and re-confirmation email sent."
        : "Dispute rejected and student notified.");
      onResolved?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to resolve dispute");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-5 max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-semibold text-slate-800 mb-1">Resolve dispute</h3>
        <p className="text-xs text-slate-500 mb-4">
          {record.full_name} · {record.index_number}
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900 mb-4">
          <strong>Student's note:</strong> {record.dispute_note}
        </div>

        <div className="flex gap-2 mb-4">
          {["correct", "reject"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${
                mode === m
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {m === "correct" ? "Correct the record" : "Reject the dispute"}
            </button>
          ))}
        </div>

        {mode === "correct" && (
          <div className="space-y-3 mb-4">
            <p className="text-xs text-slate-500">
              Edit the fields below. A fresh confirmation link will be emailed to the student.
            </p>
            {[
              ["full_name", "Full name"],
              ["institutional_email", "Email"],
              ["programme", "Programme"],
              ["class_of_degree", "Class of degree"],
              ["date_of_completion", "Date of completion"],
            ].map(([k, label]) => (
              <label key={k} className="block">
                <span className="text-xs font-medium text-slate-600 mb-1 block">{label}</span>
                <input
                  value={corrections[k] || ""}
                  onChange={(e) => setCorrections({ ...corrections, [k]: e.target.value })}
                  type={k === "date_of_completion" ? "date" : "text"}
                  className={inputClass}
                />
              </label>
            ))}
          </div>
        )}

        <label className="block mb-4">
          <span className="text-xs font-medium text-slate-600 mb-1 block">
            Resolution note{mode === "reject" && " (required)"}
          </span>
          <textarea
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            placeholder={mode === "correct"
              ? "Optional. Logged on the audit trail."
              : "Explain why the dispute is being rejected. Sent to the student."}
            className={`${inputClass} min-h-[100px]`}
          />
        </label>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 text-sm text-slate-600">Cancel</button>
          <button
            onClick={submit}
            disabled={resolve.isExecuting}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {resolve.isExecuting ? "Saving…" : (mode === "correct" ? "Save & re-issue" : "Reject dispute")}
          </button>
        </div>
      </div>
    </div>
  );
}

function BatchStatus({ status }) {
  const styles = {
    PROCESSING: "bg-amber-100 text-amber-900",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    COMPLETED_WITH_ERRORS: "bg-orange-100 text-orange-700",
    FAILED: "bg-red-100 text-red-700",
  };
  const labels = {
    PROCESSING: "Processing",
    COMPLETED: "Completed",
    COMPLETED_WITH_ERRORS: "Completed (with errors)",
    FAILED: "Failed",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${styles[status] || "bg-slate-100"}`}>
      {status === "COMPLETED" && <CheckCircle2 size={12} />}
      {status === "COMPLETED_WITH_ERRORS" && <AlertTriangle size={12} />}
      {labels[status] || status}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Issuance batches tab (Slice 3 + 5)
// ────────────────────────────────────────────────────────────────────────────

const BATCH_STATUS_STYLES = {
  QUEUED: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  PARTIAL: "bg-amber-100 text-amber-900",
  FAILED: "bg-rose-100 text-rose-700",
};

function IssuanceBatchesTab({ session, onChanged }) {
  const batchesQuery = useIssuanceBatches(session?.id);
  const batches = readArray(batchesQuery.data);
  // The composer is only meaningful when the session is in a state that
  // accepts new batches; the service rejects any other status anyway.
  const canIssue =
    session &&
    ["CONFIRMATION_CLOSED", "ISSUANCE_IN_PROGRESS"].includes(session.status);

  return (
    <div className="space-y-5">
      {canIssue ? (
        <IssuanceBatchComposer
          session={session}
          onSubmitted={() => {
            batchesQuery.invalidate?.();
            onChanged?.();
          }}
        />
      ) : (
        <div className="bg-white border border-dashed border-slate-200 rounded-lg p-4 text-sm text-slate-500">
          Batches can only be created once confirmation is closed. Current
          status: <strong>{session?.status}</strong>.
        </div>
      )}
      <BatchHistory batches={batches} loading={batchesQuery.isLoading} />
    </div>
  );
}

function IssuanceBatchComposer({ session, onSubmitted }) {
  const create = useCreateIssuanceBatch(session.id);
  const toast = useToast();
  const facultiesQuery = useFaculties();
  const departmentsQuery = useDepartments();
  const faculties = readArray(facultiesQuery.data);
  const departments = readArray(departmentsQuery.data);

  const [facultyIds, setFacultyIds] = useState([]);
  const [departmentIds, setDepartmentIds] = useState([]);
  const [honors, setHonors] = useState([]);
  const [indexPrefix, setIndexPrefix] = useState("");
  const [retryFailed, setRetryFailed] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Departments are scoped to the selected faculties when any are picked.
  const filteredDepartments = useMemo(() => {
    if (facultyIds.length === 0) return departments;
    return departments.filter((d) => facultyIds.includes(d.faculty));
  }, [departments, facultyIds]);

  const toggleIn = (setter, current, value) => {
    setter(
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    const filter = {};
    if (facultyIds.length) filter.faculty_ids = facultyIds;
    if (departmentIds.length) filter.department_ids = departmentIds;
    if (honors.length) filter.honors = honors;
    if (indexPrefix.trim()) filter.index_number_prefix = indexPrefix.trim();
    if (retryFailed) filter.retry_failed = true;

    setSubmitting(true);
    try {
      const result = await create.execute({
        filter_criteria: filter,
        notes: notes.trim(),
      });
      const exec = result?.execution || {};
      toast.success(
        `Batch run: ${exec.succeeded ?? 0} issued · ${exec.failed ?? 0} failed.`,
      );
      setNotes("");
      onSubmitted?.();
    } catch (err) {
      const data = err?.response?.data;
      const msg =
        (typeof data === "string" && data) ||
        data?.detail ||
        (data && JSON.stringify(data)) ||
        err.message;
      toast.error(msg || "Failed to run batch.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="bg-white border border-slate-200 rounded-lg p-4 space-y-3"
    >
      <div className="flex items-center gap-2 text-slate-700 font-medium">
        <FileSpreadsheet size={16} className="text-indigo-600" />
        Run filtered issuance batch
      </div>
      <p className="text-xs text-slate-500">
        Leave every filter empty to issue all remaining confirmed records.
        Filters narrow the run down to a subset — useful for issuing one
        faculty at a time, or retrying only the records that failed.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block text-xs text-slate-600">
          Faculties
          <select
            multiple
            className={`${inputClass} mt-1 min-h-[110px]`}
            value={facultyIds}
            onChange={(e) =>
              setFacultyIds(
                Array.from(e.target.selectedOptions, (o) => o.value),
              )
            }
          >
            {faculties.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs text-slate-600">
          Departments
          <select
            multiple
            className={`${inputClass} mt-1 min-h-[110px]`}
            value={departmentIds}
            onChange={(e) =>
              setDepartmentIds(
                Array.from(e.target.selectedOptions, (o) => o.value),
              )
            }
          >
            {filteredDepartments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="block text-xs text-slate-600">
          Honours
          <div className="mt-1 flex flex-wrap gap-1">
            {[
              ["FIRST", "First"],
              ["SECOND_UPPER", "Second Upper"],
              ["SECOND_LOWER", "Second Lower"],
              ["THIRD", "Third"],
              ["PASS", "Pass"],
            ].map(([code, label]) => {
              const active = honors.includes(code);
              return (
                <button
                  type="button"
                  key={code}
                  onClick={() => toggleIn(setHonors, honors, code)}
                  className={`px-2 py-1 rounded-full text-xs border ${
                    active
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block text-xs text-slate-600">
          Index-number prefix
          <input
            className={`${inputClass} mt-1`}
            value={indexPrefix}
            placeholder="e.g. UEW/CS/2024"
            onChange={(e) => setIndexPrefix(e.target.value)}
          />
        </label>
      </div>

      <label className="inline-flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={retryFailed}
          onChange={(e) => setRetryFailed(e.target.checked)}
        />
        Include previously failed records (retry)
      </label>

      <label className="block text-xs text-slate-600">
        Notes (optional, max 500 chars)
        <textarea
          className={`${inputClass} mt-1 resize-none`}
          rows={2}
          maxLength={500}
          value={notes}
          placeholder="e.g. Faculty of Education first batch."
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          Run batch
        </button>
      </div>
    </form>
  );
}

function BatchHistory({ batches, loading }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 text-sm font-medium text-slate-700">
        Batch history ({batches.length})
      </div>
      {loading ? (
        <div className="text-center py-6">
          <Loader2 className="animate-spin inline" />
        </div>
      ) : batches.length === 0 ? (
        <div className="text-center py-6 text-sm text-slate-500">
          No batches yet.
        </div>
      ) : (
        <Table>
          <Table.Head>
            <tr>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Targeted</Table.HeaderCell>
              <Table.HeaderCell>Succeeded</Table.HeaderCell>
              <Table.HeaderCell>Failed</Table.HeaderCell>
              <Table.HeaderCell>Filter</Table.HeaderCell>
              <Table.HeaderCell>Requested by</Table.HeaderCell>
              <Table.HeaderCell>When</Table.HeaderCell>
            </tr>
          </Table.Head>
          <Table.Body>
            {batches.map((b) => (
              <Table.Row key={b.id}>
                <Table.Cell className="text-sm">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                      BATCH_STATUS_STYLES[b.status] || "bg-slate-100"
                    }`}
                  >
                    {b.status}
                  </span>
                </Table.Cell>
                <Table.Cell className="text-sm">{b.total_targeted}</Table.Cell>
                <Table.Cell className="text-sm text-emerald-700">
                  {b.succeeded_count}
                </Table.Cell>
                <Table.Cell className="text-sm text-rose-700">
                  {b.failed_count}
                </Table.Cell>
                <Table.Cell className="text-xs text-slate-500 max-w-[260px]">
                  {summariseFilter(b.filter_criteria)}
                </Table.Cell>
                <Table.Cell className="text-xs text-slate-500">
                  {b.requested_by_name || "—"}
                </Table.Cell>
                <Table.Cell className="text-xs text-slate-500">
                  {b.created_at ? new Date(b.created_at).toLocaleString() : ""}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </div>
  );
}

function MultiUploadIndicator({ session }) {
  const imports = session?.import_batches || [];
  if (!imports.length) return null;
  const totalRecords = imports.reduce((sum, b) => sum + (b.success_count || 0), 0);
  const totalSkipped = imports.reduce((sum, b) => sum + (b.skipped_count || 0), 0);
  return (
    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
      <span className="inline-flex items-center gap-1">
        <Upload size={12} /> {imports.length} upload{imports.length > 1 ? "s" : ""}
      </span>
      <span className="text-slate-300">·</span>
      <span>{totalRecords} total records</span>
      {totalSkipped > 0 && (
        <>
          <span className="text-slate-300">·</span>
          <span>{totalSkipped} duplicates skipped</span>
        </>
      )}
    </div>
  );
}

function summariseFilter(filter) {
  if (!filter || Object.keys(filter).length === 0) {
    return "All confirmed records";
  }
  const parts = [];
  if (filter.faculty_ids?.length)
    parts.push(`faculties:${filter.faculty_ids.length}`);
  if (filter.department_ids?.length)
    parts.push(`departments:${filter.department_ids.length}`);
  if (filter.honors?.length) parts.push(`honors:${filter.honors.join(",")}`);
  if (filter.index_number_prefix) parts.push(`idx:${filter.index_number_prefix}`);
  if (filter.retry_failed) parts.push("retry");
  if (filter.record_ids?.length) parts.push(`records:${filter.record_ids.length}`);
  return parts.join(" · ") || "—";
}
