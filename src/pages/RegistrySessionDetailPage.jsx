/**
 * RegistrySessionDetailPage
 *
 * Tabs: Overview · Records · Imports
 * In Draft, allows file uploads, manual record edits, and deletions.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Upload, Loader2,
  Pencil, Trash2, AlertTriangle, CheckCircle2, Clock, Hourglass,
  CalendarPlus, History, ChevronRight, ChevronDown, ChevronUp,
  Search, Mail, X, RefreshCw, Eye, Download,
  Inbox,
} from "lucide-react";

import ImportWizard from "../components/ImportWizard.jsx";
import {
  useBatch, useBatchRecords, useBatchImports,
  useUpdateRecord, useDeleteRecord,
  usePublishBatch, useBatchDisputes, useResolveDispute,
  useCloseConfirmation, useStartIssuance, useCompleteBatch,
  useExtendDeadline, useDeadlineExtensions,
  useCreateIssuanceRun,
  useBatchCertificates, downloadBatchCertificatesZip,
  useRecordFilterOptions,
} from "../hooks/registry/useBatches.js";
import { certificateAPI } from "../services/api";
import { useSessionProgress } from "../hooks/registry/useSessionProgress.js";
import {
  useEmailDeliveryStream,
  useEmailDeliveryFailures,
  useResendConfirmation,
  useResendFailedConfirmations,
} from "../hooks/registry/useEmailDelivery.js";
import { useToast } from "../components/ToastContainer";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import PageTitle from "../components/PageTitle";
import Table from "../components/ui/Table";
import Modal from "../components/ui/Modal";
import Drawer from "../components/Drawer.jsx";
import CertificatePreview from "../components/CertificatePreview.jsx";
import StatusRecordsDrawer from "../components/StatusRecordsDrawer.jsx";

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

function formatDeadline(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const datePart = d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${datePart} at ${timePart}`;
}

export default function RegistrySessionDetailPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const batchId = params.id || params.session_id;
  const congregation_id = params.congregation_id;
  const [tab, setTab] = useState(() => searchParams.get('tab') || 'overview');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [initialIssuanceFilter, setInitialIssuanceFilter] = useState(null);
  const sessionQuery = useBatch(batchId);
  const importsQuery = useBatchImports(batchId);
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

  const publish = usePublishBatch(batchId);
  const closeConfirmation = useCloseConfirmation(batchId);
  const startIssuance = useStartIssuance(batchId);
  const completeSession = useCompleteBatch(batchId);
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
      setTab("overview");
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
    <>
      {wizardOpen && (
        <div className="fixed inset-0 z-50">
          <ImportWizard
            batchId={batchId}
            onBack={() => setWizardOpen(false)}
            onComplete={() => {
              sessionQuery.invalidate();
              importsQuery.invalidate();
              setWizardOpen(false);
            }}
          />
        </div>
      )}

      <div className="space-y-6">
<div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PageTitle>{session?.name || "Batch"}</PageTitle>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[session?.status] || "bg-slate-100 text-slate-700"}`}>
            {STATUS_LABELS[session?.status] || session?.status || "Unknown"}
          </span>
          {session?.counts?.total != null && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              {session.counts.total} records
            </span>
          )}
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
          onOpenExtendModal={() => setExtendModalOpen(true)}
        />
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {[
          ["overview", "Overview"],
          ["imports", "Imports"],
          ["records", "Records"],
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

      {tab === "overview" && <OverviewTab session={session} loading={sessionQuery.isLoading} onNavigateToIssuance={(status) => {
        setTab("batches");
        setInitialIssuanceFilter(status);
      }} />}
      {tab === "imports" && (
        <ImportsTab sessionId={batchId} isDraft={isDraft}
          onUploaded={() => {
            sessionQuery.invalidate();
            importsQuery.invalidate();
          }}
          onStartImportWizard={() => setWizardOpen(true)} />
      )}
      {tab === "records" && <RecordsTab sessionId={batchId} isDraft={isDraft} />}
      {tab === "disputes" && (
        <DisputesTab sessionId={batchId} onResolved={() => sessionQuery.invalidate()} />
      )}
      {tab === "batches" && (
        <IssuanceBatchesTab session={session} onChanged={() => sessionQuery.invalidate()} initialIssuanceFilter={initialIssuanceFilter} />
      )}
      {session && (
        <Modal
          open={extendModalOpen}
          onClose={() => setExtendModalOpen(false)}
          title="Extend confirmation deadline"
        >
          <ExtendDeadlineForm
            session={session}
            onSuccess={() => {
              setExtendModalOpen(false);
              sessionQuery.invalidate();
            }}
          />
        </Modal>
      )}
    </div>
    </>
  );
}

function PipelineActions({ session, publish, closeConfirmation, startIssuance, complete, onOpenExtendModal }) {
  if (!session) return null;
  const total = session.counts?.total ?? 0;
  const confirmed = session.counts?.confirmed ?? 0;
  const canExtend = ["PUBLISHED", "CONFIRMATION_OPEN"].includes(session.status);

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

  let action = null;
  switch (session.status) {
    case "DRAFT":
      action = (
        <Button
          onClick={publish.run}
          busy={publish.isBusy}
          disabled={total === 0}
          color="bg-emerald-600 hover:bg-emerald-700"
        >
          Send confirmation emails
        </Button>
      );
      break;
    case "PUBLISHED":
    case "CONFIRMATION_OPEN":
      action = (
        <Button
          onClick={closeConfirmation.run}
          busy={closeConfirmation.isBusy}
          color="bg-(--color-danger) hover:bg-(--color-danger-hover) transition"
        >
          Close confirmation
        </Button>
      );
      break;
    case "CONFIRMATION_CLOSED":
      action = (
        <Button
          onClick={startIssuance.run}
          busy={startIssuance.isBusy}
          disabled={confirmed === 0}
          color="bg-indigo-600 hover:bg-indigo-700"
        >
          Start issuance
        </Button>
      );
      break;
    case "ISSUANCE_IN_PROGRESS":
      action = (
        <Button
          onClick={complete.run}
          busy={complete.isBusy}
          color="bg-emerald-600 hover:bg-emerald-700"
        >
          Mark completed
        </Button>
      );
      break;
    default:
      break;
  }

  return (
    <div className="flex items-center gap-2">
      {action}
      {canExtend && (
        <button
          onClick={onOpenExtendModal}
          className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 flex items-center gap-2 transition"
        >
          <CalendarPlus size={16} />
          Extend deadline
        </button>
      )}
    </div>
  );
}

function OverviewTab({ session, loading, onNavigateToIssuance }) {
  const [drawerConfig, setDrawerConfig] = useState(null);
  const [resolveDisputeRecord, setResolveDisputeRecord] = useState(null);
  const toast = useToast();
  const resendConfirmation = useResendConfirmation(session?.id);

  if (loading) return <div className="text-center py-10"><Loader2 className="animate-spin inline" /></div>;
  if (!session) return <div className="text-slate-500">Session not found.</div>;
  const c = session.counts || {};
  const showDeliveryPanel = [
    "PUBLISHED", "CONFIRMATION_OPEN", "CONFIRMATION_CLOSED",
  ].includes(session.status);

  const handleSendReminder = async (record) => {
    try {
      await resendConfirmation.execute(record.id);
      toast.success("Reminder sent successfully");
    } catch (e) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail;
      let msg = "Failed to send reminder";

      if (status === 429) {
        msg = detail || "Maximum resend attempts reached (3 attempts allowed)";
      } else if (status === 400) {
        msg = detail || "Invalid request - record may already be confirmed or disputed";
      } else if (detail) {
        msg = detail;
      }

      toast.error(msg);
    }
  };

  const handleOpenDrawer = (status, title, columns, renderAction, headerMessage) => {
    setDrawerConfig({
      open: true,
      title,
      filter: { confirmation_status: status },
      columns,
      renderAction,
      headerMessage,
    });
  };

  const handleIssuanceCardClick = (issuanceStatus) => {
    onNavigateToIssuance(issuanceStatus);
  };

  return (
    <div className="space-y-4">
      <div className="lg:flex justify-between gap-4">
              {showDeliveryPanel && (
        <EmailDeliveryPanel batchId={session.id} />
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
        <Stat
          label="Confirmed"
          value={c.confirmed ?? 0}
          onClick={() => handleOpenDrawer("CONFIRMED", "Confirmed Records", [
            { key: "index_number", label: "Index" },
            { key: "full_name", label: "Name" },
            { key: "programme", label: "Programme" },
            { key: "class_of_degree", label: "Class" },
          ], null, null)}
        />
        <Stat
          label="Pending Confirmations"
          value={c.pending ?? 0}
          onClick={() => handleOpenDrawer("PENDING", "Pending Records", [
            { key: "index_number", label: "Index" },
            { key: "full_name", label: "Name" },
            { key: "institutional_email", label: "Email" },
            { key: "confirmation_email_status", label: "Email Status" },
          ], ["PUBLISHED", "CONFIRMATION_OPEN"].includes(session.status) ? (record) => (
            <button
              onClick={() => handleSendReminder(record)}
              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
            >
              Send Reminder
            </button>
          ) : null, null)}
        />
        <Stat
          label="Issued"
          value={c.issued ?? 0}
          onClick={() => handleIssuanceCardClick("ISSUED")}
        />
        <Stat
          label="Disputed"
          value={c.disputed ?? 0}
          onClick={() => handleOpenDrawer("DISPUTED", "Disputed Records", [
            { key: "index_number", label: "Index" },
            { key: "full_name", label: "Name" },
            { key: "dispute_type", label: "Dispute Type" },
          ], (record) => (
            <button
              onClick={() => setResolveDisputeRecord(record)}
              className="text-xs bg-amber-600 text-white px-2 py-1 rounded hover:bg-amber-700"
            >
              Resolve
            </button>
          ), null)}
        />
        <Stat
          label="Flagged"
          value={c.flagged ?? 0}
          onClick={() => handleOpenDrawer("FLAGGED", "Flagged Records", [
            { key: "index_number", label: "Index" },
            { key: "full_name", label: "Name" },
            { key: "institutional_email", label: "Email" },
          ], null, "Flagged automatically — no response before confirmation deadline.")}
        />
        <Stat
          label="Issuance failed"
          value={c.issuance_failed ?? 0}
          onClick={() => handleIssuanceCardClick("FAILED")}
        />
      </div>
      </div>


<div className="lg:flex justify-between gap-3">
      <div className="col-span-full bg-white border border-slate-200 rounded-lg p-4 text-sm text-slate-600 space-y-2 w-full">
          <div className="flex flex-wrap items-center gap-2">
            <strong>Confirmation deadline:</strong>
            <span>{formatDeadline(session.confirmation_deadline)}</span>
            <DeadlineBadge session={session} />
            <ExtendedBadge session={session} />
          </div>
          <div><strong>Template:</strong> {session.template_name}</div>
          <MultiUploadIndicator session={session} />
        </div>
        <DeadlineExtensionSection session={session} />
      </div>

      {drawerConfig && (
        <StatusRecordsDrawer
          open={drawerConfig.open}
          onClose={() => setDrawerConfig(null)}
          title={drawerConfig.title}
          batchId={session.id}
          filter={drawerConfig.filter}
          columns={drawerConfig.columns}
          renderAction={drawerConfig.renderAction}
          headerMessage={drawerConfig.headerMessage}
        />
      )}

      {resolveDisputeRecord && (
        <ResolveDisputeModal
          sessionId={session.id}
          record={resolveDisputeRecord}
          onClose={() => setResolveDisputeRecord(null)}
          onResolved={() => {
            setResolveDisputeRecord(null);
            // Refresh the session counts
            window.location.reload();
          }}
        />
      )}
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
          ? `Original: ${formatDeadline(session.confirmation_deadline_original)}`
          : ""
      }
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-200"
    >
      <History size={12} /> Extended ×{count}
    </span>
  );
}

function DeadlineExtensionSection({ session }) {
  const historyQuery = useDeadlineExtensions(session?.id);
  const extensions = readArray(historyQuery.data);
  if (extensions.length === 0) return null;

  return (
    <div className="col-span-full w-full">
      <ExtensionHistoryCard extensions={extensions} />
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
      className="bg-white p-4 space-y-3"
    >
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

function Stat({ label, value, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-lg p-4 transition-all ${
        onClick ? "cursor-pointer hover:border-blue-300 hover:shadow-md" : ""
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-2xl font-semibold text-slate-800 mt-1">{value}</div>
    </div>
  );
}

const RECORDS_PAGE_SIZE = 50;

function RecordsTab({ sessionId, isDraft }) {
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [emailStatusFilter, setEmailStatusFilter] = useState("");
  const [confirmationStatusFilter, setConfirmationStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const loadedRef = useRef(new Set());
  const sentinelRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset the accumulated list whenever filters change.
  useEffect(() => {
    setItems([]);
    setPage(1);
    loadedRef.current = new Set();
  }, [debouncedSearch, emailStatusFilter, confirmationStatusFilter]);

  const recordsQuery = useBatchRecords(sessionId, {
    page,
    page_size: RECORDS_PAGE_SIZE,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(emailStatusFilter ? { email_status: emailStatusFilter } : {}),
    ...(confirmationStatusFilter ? { confirmation_status: confirmationStatusFilter } : {}),
  });
  const data = recordsQuery.data;
  const totalCount = data?.count ?? items.length;
  const hasNext = !!data?.next;
  const isFetching = recordsQuery._query.isFetching;
  const updateRecord = useUpdateRecord(sessionId, editing?.id);
  const deleteRecord = useDeleteRecord(sessionId, editing?.id);
  const toast = useToast();
  const confirm = useConfirmDialog();

  // Accumulate each page's results once, keyed by search + page.
  useEffect(() => {
    if (!data) return;
    const key = `${debouncedSearch}|${page}`;
    if (loadedRef.current.has(key)) return;
    loadedRef.current.add(key);
    const results = readArray(data);
    setItems((prev) => (page === 1 ? results : [...prev, ...results]));
  }, [data, page, debouncedSearch]);

  // Load the next page when the sentinel scrolls into view.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNext && !isFetching) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNext, isFetching]);

  const filteredRecords = items;
  const initialLoading = isFetching && items.length === 0;

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
        `/api/registry/batches/${sessionId}/records/${record.id}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}` },
        },
      );
      if (!res.ok) throw new Error("Failed");
      toast.success("Record deleted");
      setItems((prev) => prev.filter((r) => r.id !== record.id));
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
        <select
          value={emailStatusFilter}
          onChange={(e) => setEmailStatusFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-2 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none bg-white"
        >
          <option value="">All email statuses</option>
          <option value="QUEUED">Queued</option>
          <option value="SENT">Sent</option>
          <option value="DELIVERED">Delivered</option>
          <option value="FAILED">Failed</option>
          <option value="BOUNCED">Bounced</option>
        </select>
        <select
          value={confirmationStatusFilter}
          onChange={(e) => setConfirmationStatusFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-2 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none bg-white"
        >
          <option value="">All confirmation statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="DISPUTED">Disputed</option>
          <option value="FLAGGED">Flagged</option>
        </select>
      </div>

      <Table>
        <Table.Head>
          <tr>
            <Table.HeaderCell>Index</Table.HeaderCell>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Email</Table.HeaderCell>
            <Table.HeaderCell>Programme</Table.HeaderCell>
            <Table.HeaderCell>Class</Table.HeaderCell>
            <Table.HeaderCell>Confirmation Status</Table.HeaderCell>
            <Table.HeaderCell>Email Status</Table.HeaderCell>
            <Table.HeaderCell></Table.HeaderCell>
          </tr>
        </Table.Head>
        <Table.Body>
          {initialLoading && (
            <tr><td colSpan={8} className="text-center py-8"><Loader2 className="animate-spin inline" size={20} /></td></tr>
          )}
          {!initialLoading && filteredRecords.length === 0 && (
            <tr><td colSpan={8} className="text-center py-8 text-slate-500">
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
              <Table.Cell>
                <ConfirmationStatusBadge status={r.confirmation_status} />
              </Table.Cell>
              <Table.Cell>
                <EmailStatusBadge status={r.confirmation_email_status} />
              </Table.Cell>
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

      {/* Infinite-scroll sentinel: loads the next page when visible. */}
      <div ref={sentinelRef} className="h-px" />
      {hasNext && isFetching && items.length > 0 && (
        <div className="text-center py-3">
          <Loader2 className="animate-spin inline text-slate-400" size={18} />
        </div>
      )}
      {!hasNext && items.length > 0 && (
        <div className="text-center py-3 text-xs text-slate-400">
          All {totalCount} record{totalCount !== 1 ? "s" : ""} loaded
        </div>
      )}

      {editing && (
        <EditRecordModal
          record={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setItems((prev) => prev.map((r) =>
              r.id === editing.id ? { ...r, ...updated } : r));
            setEditing(null);
          }}
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
      onSaved?.(form);
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

function ImportsTab({ sessionId, isDraft, onUploaded, onStartImportWizard }) {
  const importsQuery = useBatchImports(sessionId);
  const imports = readArray(importsQuery.data);

  return (
    <div className="space-y-4">
      {isDraft && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onStartImportWizard}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2 text-sm"
          >
            <Upload size={16} />
            Import Student Records
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
            <tr>
              <td colSpan={6} className="text-center py-8 text-slate-500">
                <p className="font-medium">No import files found for this batch.</p>
              </td>
            </tr>
          )}
          {imports.map((b) => (
            <Table.Row key={b.id}>
              <Table.Cell className="text-sm">{b.original_file_name}</Table.Cell>
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
                <div className="font-medium text-slate-700 mb-1">{b.original_file_name}</div>
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
  const disputesQuery = useBatchDisputes(sessionId);
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
                <h3 className="text-sm font-semibold text-slate-800">{r.first_name} {r.middle_name} {r.last_name}</h3>
                <code className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{r.index_number}</code>
              </div>
              <p className="text-xs text-slate-500 mb-2">
                Disputed {r.dispute_created_at?.slice(0, 16).replace("T", " ")} ·
                {r.programme} · {r.class_of_degree}
              </p>
              <div className="text-sm text-slate-700 bg-amber-50 border-l-2 border-amber-300 pl-3 py-1">
                {r.dispute_type?.replace(/_/g, ' ') || 'Other issue'}
              </div>
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
    first_name: record.first_name,
    middle_name: record.middle_name,
    last_name: record.last_name,
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
          {record.first_name} {record.middle_name} {record.last_name} · {record.index_number}
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900 mb-4">
          <strong>Dispute type:</strong> {record.dispute_type?.replace(/_/g, ' ') || 'Other'}
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
              ["first_name", "First name"],
              ["middle_name", "Middle name"],
              ["last_name", "Last name"],
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

function IssuanceBatchesTab({ session, onChanged, initialIssuanceFilter }) {
  // Issuance actions are only meaningful when the session accepts runs; the
  // service rejects any other status anyway.
  const canIssue =
    session &&
    ["CONFIRMATION_CLOSED", "ISSUANCE_IN_PROGRESS"].includes(session.status);

  return (
    <div className="space-y-5">
      {canIssue ? (
        <IssuanceRecordsTable session={session} onChanged={onChanged} initialIssuanceFilter={initialIssuanceFilter} />
      ) : (
        <div className="bg-white border border-dashed border-slate-200 rounded-lg p-4 text-sm text-slate-500">
          Certificates can only be issued once confirmation is closed. Current
          status: <strong>{session?.status}</strong>.
        </div>
      )}
    </div>
  );
}

const ISSUANCE_STATUS_META = {
  NOT_ISSUED: { label: "Not issued", cls: "bg-slate-50 text-slate-600 border border-slate-200" },
  QUEUED: { label: "Queued", cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  ISSUED: { label: "Issued", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  FAILED: { label: "Failed", cls: "bg-red-50 text-red-700 border border-red-200" },
};

function IssuanceStatusBadge({ status }) {
  const meta = ISSUANCE_STATUS_META[status] || ISSUANCE_STATUS_META.NOT_ISSUED;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

const ISSUANCE_RECORDS_PAGE_SIZE = 50;

function IssuanceRecordsTable({ session, onChanged, initialIssuanceFilter }) {
  const sessionId = session?.id;
  const toast = useToast();
  const confirm = useConfirmDialog();
  const create = useCreateIssuanceRun(sessionId);

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [debounced, setDebounced] = useState({});

  // Apply initial filter if provided
  useEffect(() => {
    if (initialIssuanceFilter) {
      setFilterType("issuance_status");
      setFilterValue(initialIssuanceFilter);
    }
  }, [initialIssuanceFilter]);

  // Pagination + selection
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [runningId, setRunningId] = useState(null); // record id or 'bulk'
  const [previewCert, setPreviewCert] = useState(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const loadedRef = useRef(new Set());

  // Dropdown options derived from the batch's own distinct values.
  const filterOptions = useRecordFilterOptions(sessionId);
  const opts = filterOptions.data || {};

  useEffect(() => {
    const t = setTimeout(() => {
      const next = { search: search.trim() };
      if (filterType && filterValue) {
        next[filterType] = filterValue;
      }
      setDebounced(next);
    }, 300);
    return () => clearTimeout(t);
  }, [search, filterType, filterValue]);

  // Reset accumulation whenever filters change.
  useEffect(() => {
    setItems([]);
    setPage(1);
    setSelected(new Set());
    loadedRef.current = new Set();
  }, [debounced]);

  const params = useMemo(() => {
    const base = {
      page,
      page_size: ISSUANCE_RECORDS_PAGE_SIZE,
      confirmation_status: "CONFIRMED",
    };
    if (debounced.search) base.search = debounced.search;
    // One active filter at a time (besides search).
    const activeKey = Object.keys(debounced).find(
      (k) => k !== "search" && debounced[k],
    );
    if (activeKey) base[activeKey] = debounced[activeKey];
    return base;
  }, [page, debounced]);

  const recordsQuery = useBatchRecords(sessionId, params);
  const data = recordsQuery.data;
  const totalCount = data?.count ?? items.length;
  const hasNext = !!data?.next;
  const isFetching = recordsQuery._query.isFetching;
  const initialLoading = isFetching && items.length === 0;

  useEffect(() => {
    if (!data) return;
    const key = `${JSON.stringify(debounced)}|${page}`;
    if (loadedRef.current.has(key)) return;
    loadedRef.current.add(key);
    const results = readArray(data);
    setItems((prev) => (page === 1 ? results : [...prev, ...results]));
  }, [data, page, debounced]);

  const failedCount = useMemo(
    () => items.filter((r) => r.issuance_status === "FAILED").length,
    [items],
  );
  const notIssuedCount = useMemo(
    () => items.filter((r) => r.issuance_status === "NOT_ISSUED").length,
    [items],
  );

  const refresh = () => {
    setItems([]);
    setPage(1);
    setSelected(new Set());
    loadedRef.current = new Set();
    recordsQuery.invalidate?.();
  };

  const runIssuance = async (filterCriteria, label) => {
    try {
      const result = await create.execute({
        filter_criteria: filterCriteria,
        notes: label || "",
      });
      const exec = result?.execution || {};
      toast.success(
        `${exec.succeeded ?? 0} issued · ${exec.failed ?? 0} failed.`,
      );
      refresh();
      onChanged?.();
    } catch (err) {
      const d = err?.response?.data;
      const msg =
        (typeof d === "string" && d) ||
        d?.detail ||
        (d && JSON.stringify(d)) ||
        err.message;
      toast.error(msg || "Failed to run issuance.");
    }
  };

  const handleRetryRow = async (record) => {
    setRunningId(record.id);
    await runIssuance(
      { record_ids: [record.id], retry_failed: true },
      `Retry ${record.full_name} (${record.index_number})`,
    );
    setRunningId(null);
  };

  const handleIssueRow = async (record) => {
    setRunningId(record.id);
    await runIssuance(
      { record_ids: [record.id] },
      `Issue ${record.full_name} (${record.index_number})`,
    );
    setRunningId(null);
  };

  const handleRetrySelected = async () => {
    if (selected.size === 0) return;
    setRunningId("bulk");
    await runIssuance(
      { record_ids: Array.from(selected), retry_failed: true },
      `Retry ${selected.size} selected records`,
    );
    setRunningId(null);
  };

  const handleRetryAllFailed = async () => {
    const ok = await confirm({
      title: "Retry all failed?",
      message: "Re-attempt issuance for every record that previously failed in this batch.",
      confirmText: "Retry all failed",
    });
    if (!ok) return;
    setRunningId("bulk");
    await runIssuance({ retry_failed: true }, "Retry all failed records");
    setRunningId(null);
  };

  const handleIssueAll = async () => {
    const ok = await confirm({
      title: "Issue all remaining?",
      message: "Issue certificates for every confirmed record that has not yet been issued.",
      confirmText: "Issue all",
    });
    if (!ok) return;
    setRunningId("bulk");
    await runIssuance({}, "Issue all remaining records");
    setRunningId(null);
  };

  const handleDownloadCert = async (record) => {
    if (!record.certificate_id) return;
    try {
      const response = await certificateAPI.download(record.certificate_id);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate_${record.certificate_number || record.index_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download certificate");
    }
  };

  const handleDownloadAllZip = async () => {
    setDownloadingZip(true);
    try {
      const zipParams = { ...(debounced.search ? { search: debounced.search } : {}) };
      const activeKey = Object.keys(debounced).find(
        (k) => k !== "search" && debounced[k],
      );
      if (activeKey) zipParams[activeKey] = debounced[activeKey];
      const blob = await downloadBatchCertificatesZip(sessionId, zipParams);
      const url = URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificates_${session.reference_name || (session.name || "batch").replace(/\s+/g, "_")}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download ZIP");
    } finally {
      setDownloadingZip(false);
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected = items.length > 0 && items.every((r) => selected.has(r.id));
  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (allVisibleSelected) return new Set();
      return new Set(items.map((r) => r.id));
    });
  };

  const busy = runningId !== null;
  const inputClass =
    "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none";

  const filterLabelMap = {
    issuance_status: "Status",
    programme: "Programme",
    class_of_degree: "Class of degree",
    faculty_name: "Faculty",
    department_name: "Department",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        {/* <h3 className="text-base font-semibold text-slate-800">Issuance records</h3> */}
        {/* <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
              {totalCount} confirmed
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700">
              {notIssuedCount} pending
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-50 text-red-700">
              {failedCount} failed
            </span>
          </div>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
            aria-label="Refresh records"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div> */}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <label htmlFor="record-search" className="sr-only">Search records</label>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="record-search"
            className={`${inputClass} pl-9 w-full`}
            placeholder="Search name / index"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="filter-type" className="sr-only">Filter by</label>
          <select
            id="filter-type"
            className={`${inputClass} bg-white min-w-[160px]`}
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setFilterValue("");
            }}
          >
            <option value="">Filter by…</option>
            <option value="issuance_status">Status</option>
            <option value="programme">Programme</option>
            <option value="class_of_degree">Class of degree</option>
            <option value="faculty_name">Faculty</option>
            <option value="department_name">Department</option>
          </select>
          {filterType && (
            <>
              <label htmlFor="filter-value" className="sr-only">{filterLabelMap[filterType]} value</label>
              <select
                id="filter-value"
                className={`${inputClass} bg-white min-w-[180px]`}
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
              >
                <option value="">
                  {filterType === "issuance_status"
                    ? "Select status"
                    : `Select ${filterLabelMap[filterType]?.toLowerCase() || ""}`}
                </option>
                {filterType === "issuance_status" && (
                  <>
                    <option value="NOT_ISSUED">Not issued</option>
                    <option value="QUEUED">Queued</option>
                    <option value="ISSUED">Issued</option>
                    <option value="FAILED">Failed</option>
                  </>
                )}
                {(opts[filterType] || []).map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </>
          )}
          {filterType && filterValue && (
            <button
              onClick={() => { setFilterType(""); setFilterValue(""); }}
              className="flex items-center gap-1 px-1 py-1 text-[10px] font-xs rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
              aria-label="Clear active filter"
            >
              <X size={10} /> {filterLabelMap[filterType]}: {filterValue}
            </button>
          )}
        </div>
      </div>

      {/* Bulk actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleIssueAll}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {runningId === "bulk" && <Loader2 size={13} className="animate-spin" />}
          Issue all remaining
        </button>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <button
          onClick={handleRetrySelected}
          disabled={busy || selected.size === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
        >
          {runningId === "bulk" && <Loader2 size={13} className="animate-spin" />}
          Retry selected ({selected.size})
        </button>
        <button
          onClick={handleRetryAllFailed}
          disabled={busy || failedCount === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50 transition"
        >
          <RefreshCw size={13} /> Retry all failed
        </button>
        <button
          onClick={handleDownloadAllZip}
          disabled={downloadingZip}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition"
          aria-label="Download all certificates as ZIP"
        >
          {downloadingZip ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          Download all
        </button>
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <caption className="sr-only">Issuance records for this batch</caption>
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider">
            <tr>
              <th scope="col" className="w-8 px-2 py-2">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all visible records"
                />
              </th>
              <th scope="col" className="text-left px-3 py-2 font-semibold">Name</th>
              <th scope="col" className="text-left px-3 py-2 font-semibold">Programme</th>
              <th scope="col" className="text-left px-3 py-2 font-semibold">Class</th>
              <th scope="col" className="text-left px-3 py-2 font-semibold">Faculty / Dept</th>
              <th scope="col" className="text-left px-3 py-2 font-semibold">Status</th>
              <th scope="col" className="text-right px-3 py-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {initialLoading ? (
              <>
                {[1, 2, 3, 4, 5].map((s) => (
                  <tr key={s} className="animate-pulse">
                    <td className="px-2 py-3"><div className="h-4 w-4 bg-slate-200 rounded" /></td>
                    <td className="px-3 py-3 space-y-1">
                      <div className="h-4 w-32 bg-slate-200 rounded" />
                      <div className="h-3 w-20 bg-slate-200 rounded" />
                    </td>
                    <td className="px-3 py-3"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                    <td className="px-3 py-3 space-y-1">
                      <div className="h-4 w-20 bg-slate-200 rounded" />
                      <div className="h-3 w-16 bg-slate-200 rounded" />
                    </td>
                    <td className="px-3 py-3"><div className="h-5 w-14 bg-slate-200 rounded-full" /></td>
                    <td className="px-3 py-3 text-right"><div className="h-8 w-8 bg-slate-200 rounded-md inline-block" /></td>
                  </tr>
                ))}
              </>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center">
                  <div className="inline-flex flex-col items-center gap-2 text-slate-400">
                    <Inbox size={32} strokeWidth={1.5} />
                    <p className="text-sm font-medium text-slate-500">No records match your filters</p>
                    <button
                      onClick={() => { setSearch(""); setFilterType(""); setFilterValue(""); }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Reset filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((r) => {
                const rowBusy = runningId === r.id;
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        aria-label={`Select ${r.full_name}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-800">{r.full_name}</div>
                      <div className="text-xs text-slate-400">{r.index_number}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{r.programme || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{r.class_of_degree || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">
                      <div>{r.faculty_name || "—"}</div>
                      <div className="text-xs text-slate-400">{r.department_name || ""}</div>
                    </td>
                    <td className="px-3 py-2">
                      <IssuanceStatusBadge status={r.issuance_status} />
                      {r.issuance_status === "FAILED" && r.issuance_error && (
                        <div className="text-xs text-red-500 mt-0.5 max-w-[200px] truncate" title={r.issuance_error}>
                          {r.issuance_error}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.issuance_status === "FAILED" ? (
                        <button
                          onClick={() => handleRetryRow(r)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50 transition"
                        >
                          {rowBusy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                          Retry
                        </button>
                      ) : r.issuance_status === "ISSUED" ? (
                        <div className="flex items-center justify-end gap-0.5">
                          {r.certificate_id ? (
                            <>
                              <button
                                onClick={() =>
                                  setPreviewCert({
                                    id: r.certificate_id,
                                    certificate_number: r.certificate_number,
                                    student_name: r.full_name,
                                  })
                                }
                                aria-label="View certificate"
                                className="inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => handleDownloadCert(r)}
                                aria-label="Download certificate PDF"
                                className="inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition"
                              >
                                <Download size={15} />
                              </button>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                              <CheckCircle2 size={12} /> Issued
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleIssueRow(r)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50 transition"
                        >
                          {rowBusy ? <Loader2 size={12} className="animate-spin" /> : null}
                          Issue
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {hasNext && (
        <div className="flex justify-center">
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={isFetching}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {isFetching && <Loader2 size={13} className="animate-spin" />}
            Load more
          </button>
        </div>
      )}

      {previewCert && (
        <CertificatePreview
          certificate={previewCert}
          onClose={() => setPreviewCert(null)}
        />
      )}
    </div>
  );
}

function CertificatesIssuedSection({ session, runs }) {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightCertId = searchParams.get('highlight_cert');

  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [runFilter, setRunFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [previewCert, setPreviewCert] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const certsQuery = useBatchCertificates(session?.id, {
    search,
    ...(runFilter !== 'all' ? { issuance_run: runFilter } : {}),
    ...(classFilter !== 'all' ? { class_of_degree: classFilter } : {}),
    page_size: 200,
  });

  const certs = readArray(certsQuery.data?.results);
  const totalCount = certsQuery.data?.count || 0;

  useEffect(() => {
    if (highlightCertId || totalCount > 0) {
      setExpanded(true);
    }
  }, [highlightCertId, totalCount]);

  useEffect(() => {
    if (highlightCertId) {
      searchParams.delete('highlight_cert');
      setSearchParams(searchParams, { replace: true });
    }
  }, [highlightCertId]);

  const classOptions = useMemo(() => {
    const all = certs.map((c) => c.honors).filter(Boolean);
    return [...new Set(all)];
  }, [certs]);

  const runOptions = useMemo(() => {
    return runs.filter((r) => r.succeeded_count > 0);
  }, [runs]);

  const formatRunLabel = (run) => {
    const date = run.created_at
      ? new Date(run.created_at).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '';
    const criteria = run.filter_criteria || {};
    if (Object.keys(criteria).length === 0) return `All records — ${date}`;
    const parts = [];
    if (criteria.faculty_ids?.length) parts.push(`${criteria.faculty_ids.length} faculty`);
    if (criteria.department_ids?.length) parts.push(`${criteria.department_ids.length} dept`);
    if (criteria.honors?.length) parts.push(`${criteria.honors.length} honors`);
    if (criteria.retry_failed) parts.push('retry failed');
    return `${parts.join(', ')} — ${date}`;
  };

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      const blob = await downloadBatchCertificatesZip(session.id, {
        search,
        ...(runFilter !== 'all' ? { issuance_run: runFilter } : {}),
        ...(classFilter !== 'all' ? { class_of_degree: classFilter } : {}),
      });
      const url = URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificates_${session.reference_name || session.name.replace(/\s+/g, '_')}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download ZIP');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadOne = async (cert) => {
    try {
      const response = await certificateAPI.download(cert.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate_${cert.certificate_number || cert.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download certificate');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isPreIssuance = session?.status &&
    ['DRAFT', 'PUBLISHED', 'CONFIRMATION_OPEN', 'CONFIRMATION_CLOSED'].includes(session.status);

  if (isPreIssuance && totalCount === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-500 text-sm">
        No certificates have been issued yet. Certificates will appear here once issuance begins.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-slate-200 hover:bg-slate-50 transition-colors"
      >
        <span className="text-sm font-medium text-slate-700">
          Certificates Issued ({totalCount})
        </span>
        {expanded ? (
          <ChevronUp size={18} className="text-slate-400" />
        ) : (
          <ChevronDown size={18} className="text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, index, or cert ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>
            <select
              value={runFilter}
              onChange={(e) => setRunFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
            >
              <option value="all">All runs</option>
              {runOptions.map((r) => (
                <option key={r.id} value={r.id}>{formatRunLabel(r)}</option>
              ))}
            </select>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
            >
              <option value="all">All classes</option>
              {classOptions.map((h) => (
                <option key={h} value={h}>{h.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <button
              onClick={handleDownloadAll}
              disabled={downloading || totalCount === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {downloading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              Download All
            </button>
          </div>

          {certsQuery.isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="animate-spin inline" size={20} />
            </div>
          ) : certs.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500">
              No certificates match the current filter.
            </div>
          ) : (
            <Table>
              <Table.Head>
                <tr>
                  <Table.HeaderCell>Certificate ID</Table.HeaderCell>
                  <Table.HeaderCell>Student Name</Table.HeaderCell>
                  <Table.HeaderCell>Index Number</Table.HeaderCell>
                  <Table.HeaderCell>Programme</Table.HeaderCell>
                  <Table.HeaderCell>Class of Degree</Table.HeaderCell>
                  <Table.HeaderCell>Issued At</Table.HeaderCell>
                  <Table.HeaderCell>Run</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
                </tr>
              </Table.Head>
              <Table.Body>
                {certs.map((cert) => {
                  const isHighlighted = highlightCertId && cert.id === highlightCertId;
                  return (
                    <Table.Row key={cert.id} className={isHighlighted ? 'bg-amber-50' : ''}>
                      <Table.Cell className="text-sm font-medium text-blue-600">
                        {cert.certificate_number || '—'}
                      </Table.Cell>
                      <Table.Cell className="text-sm">{cert.student_name}</Table.Cell>
                      <Table.Cell className="text-sm text-slate-500">
                        {cert.index_number || '—'}
                      </Table.Cell>
                      <Table.Cell className="text-sm">{cert.program || '—'}</Table.Cell>
                      <Table.Cell className="text-sm">
                        {cert.honors_display || cert.honors || '—'}
                      </Table.Cell>
                      <Table.Cell className="text-sm text-slate-500">
                        {formatDate(cert.generated_date)}
                      </Table.Cell>
                      <Table.Cell className="text-xs text-slate-500">
                        {cert.issuance_run_id
                          ? (runOptions.find((r) => r.id === cert.issuance_run_id)
                              ? formatRunLabel(runOptions.find((r) => r.id === cert.issuance_run_id))
                              : '—')
                          : '—'}
                      </Table.Cell>
                      <Table.Cell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPreviewCert(cert)}
                            title="View certificate"
                            className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleDownloadOne(cert)}
                            title="Download PDF"
                            className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
          )}
        </div>
      )}

      {previewCert && (
        <CertificatePreview
          certificate={previewCert}
          onClose={() => setPreviewCert(null)}
        />
      )}
    </div>
  );
}

// ── Email Delivery Panel ────────────────────────────────────────────────────

function CircularProgress({ value, complete, size = 64 }) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, value));
  const offset = circumference - (pct / 100) * circumference;
  const color = complete ? "#34d399" : "#60a5fa"; // emerald-400 vs blue-400

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block shrink-0">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
      <text
        x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className="text-[11px] font-bold fill-white"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

function EmailDeliveryPanel({ batchId }) {
  const { summary, complete, error } = useEmailDeliveryStream(batchId, {
    enabled: !!batchId,
  });
  const [showFailures, setShowFailures] = useState(false);
  const toast = useToast();

  if (!summary) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="animate-spin" size={16} />
          Loading email delivery status…
        </div>
      </div>
    );
  }

  const total = summary.total || 0;
  const terminal = summary.terminal_count || 0;
  const failed = (summary.failed || 0) + (summary.bounced || 0);
  const pct = summary.completion_percentage || 0;
  const inProgress = !complete && pct < 100;

  return (
    <div className="bg-(--color-brand) border border-slate-200 rounded-lg p-4 space-y-3 w-full">
      <div className="gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 text-white font-medium mb-4">
<div className="flex">
              <h1 className="mr-2">Confirmation email delivery</h1>
            {inProgress && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-(--color-success) animate-pulse" /> Sending
              </span>
            )}
            {complete && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium">
                <CheckCircle2 size={10} /> Done
              </span>
            )}
</div>

          <div className="mt-1 text-xs text-white/70">
            {terminal} of {total} processed
          </div>
          </div>



          {failed > 0 && (
            <button
              onClick={() => setShowFailures(true)}
              className="mt-1 text-xs text-white/80 hover:text-white underline"
            >
              View failures ({failed})
            </button>
          )}
        </div>
        {/* Circular progress */}
        <CircularProgress value={pct} complete={complete} size={72} />
      </div>

      {/* Count pills */}
      <div className="flex flex-wrap gap-2">
        <CountPill label="Queued" value={summary.queued || 0} color="slate" />
        <CountPill label="Sent" value={summary.sent || 0} color="emerald" />
        <CountPill label="Delivered" value={summary.delivered || 0} color="blue" />
        {summary.failed > 0 && (
          <CountPill label="Failed" value={summary.failed} color="red" />
        )}
        {summary.bounced > 0 && (
          <CountPill label="Bounced" value={summary.bounced} color="amber" />
        )}
      </div>

      {error && (
        <div className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
          Live stream disconnected. Polling summary every 5s as fallback.
        </div>
      )}

      <FailuresModal
        open={showFailures}
        batchId={batchId}
        onClose={() => setShowFailures(false)}
      />
    </div>
  );
}

function CountPill({ label, value, color }) {
  const colorMap = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-800",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs ${colorMap[color] || colorMap.slate}`}>
      <span className="font-medium">{value}</span>
      <span className="opacity-80">{label}</span>
    </span>
  );
}

// ── Failures Modal ─────────────────────────────────────────────────────────

function FailuresModal({ open, batchId, onClose }) {
  const PAGE_SIZE = 50;
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [allFailures, setAllFailures] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const sentinelRef = useRef(null);

  const failuresQuery = useEmailDeliveryFailures(batchId, {
    status: statusFilter || null,
    page,
    pageSize: PAGE_SIZE,
  });
  const resendOne = useResendConfirmation(batchId);
  const resendAll = useResendFailedConfirmations(batchId);
  const toast = useToast();
  const confirm = useConfirmDialog();

  // Reset accumulated list when filter changes
  useEffect(() => {
    setPage(1);
    setAllFailures([]);
    setTotalCount(0);
  }, [statusFilter]);

  // Append new page results
  useEffect(() => {
    const data = failuresQuery.data;
    if (!data) return;
    const results = readArray(data.results);
    setTotalCount(data.count || 0);
    setAllFailures((prev) => {
      if (page === 1) return results;
      // De-duplicate by record_id
      const existingIds = new Set(prev.map((f) => f.record_id));
      const newItems = results.filter((f) => !existingIds.has(f.record_id));
      return [...prev, ...newItems];
    });
  }, [failuresQuery.data, page]);

  // IntersectionObserver to trigger next page
  useEffect(() => {
    if (!open) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          const hasMore = allFailures.length < totalCount;
          const isFetching = failuresQuery._query?.isFetching;
          if (hasMore && !isFetching) {
            setPage((p) => p + 1);
          }
        }
      },
      { rootMargin: "100px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, allFailures.length, totalCount, failuresQuery._query?.isFetching]);

  const hasMore = allFailures.length < totalCount;
  const isLoadingMore = failuresQuery._query?.isFetching && !failuresQuery.isLoading;

  const handleResendOne = async (recordId) => {
    try {
      await resendOne.execute(recordId);
      toast.success("Resent successfully");
      failuresQuery.invalidate?.();
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.detail || "Failed to resend";
      if (status === 429) toast.error(msg);
      else toast.error(msg);
    }
  };

  const handleResendAll = async () => {
    const eligible = allFailures.filter((f) => f.can_resend).length;
    if (eligible === 0) {
      toast.error("No eligible records to resend.");
      return;
    }
    const ok = await confirm({
      title: "Resend all failed confirmations?",
      message: `This will resend confirmation emails to ${eligible} eligible failed record(s).`,
      confirmText: "Resend all",
    });
    if (!ok) return;
    try {
      await resendAll.execute();
      toast.success(`Resent to eligible records`);
      failuresQuery.invalidate?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Bulk resend failed");
    }
  };

  const humanReason = (reason) => {
    const r = (reason || "").toLowerCase();
    if (r.includes("invalid")) return "Invalid email address";
    if (r.includes("dns")) return "DNS lookup failed";
    if (r.includes("connection")) return "Server connection error";
    if (r.includes("timeout")) return "Connection timeout";
    if (r.includes("blocked")) return "Blocked by recipient server";
    if (r.includes("quota")) return "Mailbox full / quota exceeded";
    if (r.includes("bounced")) return "Message bounced";
    return reason || "Unknown error";
  };

  return (
    <Drawer open={open} onClose={onClose} title="Failed deliveries" fullWidth>
      <p className="text-xs text-slate-500 mb-4">
        Review failed confirmation emails and resend where appropriate.
      </p>

      <div className="flex items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
        >
          <option value="">All failures</option>
          <option value="FAILED">Failed</option>
          <option value="BOUNCED">Bounced</option>
        </select>
        <button
          onClick={handleResendAll}
          disabled={resendAll.isExecuting || allFailures.filter((f) => f.can_resend).length === 0}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {resendAll.isExecuting ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Resend all eligible ({allFailures.filter((f) => f.can_resend).length})
        </button>
      </div>

      {failuresQuery.isLoading && allFailures.length === 0 && (
        <div className="text-center py-10">
          <Loader2 className="animate-spin inline text-slate-400" size={24} />
        </div>
      )}
      {!failuresQuery.isLoading && allFailures.length === 0 && (
        <div className="text-center py-10 text-sm text-slate-500">
          No failed deliveries matching the selected filter.
        </div>
      )}
      {allFailures.length > 0 && (
        <>
          <Table>
            <Table.Head>
              <tr>
                <Table.HeaderCell>Student</Table.HeaderCell>
                <Table.HeaderCell>Index</Table.HeaderCell>
                <Table.HeaderCell>Email</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Reason</Table.HeaderCell>
                <Table.HeaderCell>Attempts</Table.HeaderCell>
                <Table.HeaderCell></Table.HeaderCell>
              </tr>
            </Table.Head>
            <Table.Body>
              {allFailures.map((f) => (
                <Table.Row key={f.record_id}>
                  <Table.Cell className="text-sm font-medium text-slate-800">{f.student_name}</Table.Cell>
                  <Table.Cell className="text-sm font-mono">{f.index_number}</Table.Cell>
                  <Table.Cell className="text-sm text-slate-600">{f.institutional_email}</Table.Cell>
                  <Table.Cell>
                    <EmailStatusBadge status={f.status} />
                  </Table.Cell>
                  <Table.Cell className="text-sm text-slate-600 max-w-[200px] truncate" title={f.failure_reason}>
                    {humanReason(f.failure_reason)}
                  </Table.Cell>
                  <Table.Cell className="text-sm text-slate-500">{f.resend_attempts}/3</Table.Cell>
                  <Table.Cell className="text-right">
                    {f.can_resend ? (
                      <button
                        onClick={() => handleResendOne(f.record_id)}
                        disabled={resendOne.isExecuting}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                      >
                        Resend
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Max attempts</span>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} className="h-8 flex items-center justify-center">
            {isLoadingMore && <Loader2 className="animate-spin text-slate-400" size={18} />}
            {!hasMore && allFailures.length > 0 && (
              <span className="text-xs text-slate-400">All {allFailures.length} failures loaded</span>
            )}
          </div>
        </>
      )}
    </Drawer>
  );
}

function ConfirmationStatusBadge({ status }) {
  const styles = {
    PENDING: "bg-slate-100 text-slate-700",
    CONFIRMED: "bg-emerald-50 text-emerald-700",
    DISPUTED: "bg-amber-50 text-amber-800",
    FLAGGED: "bg-red-50 text-red-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${styles[status] || "bg-slate-100"}`}>
      {status || "—"}
    </span>
  );
}

function EmailStatusBadge({ status }) {
  const styles = {
    QUEUED: "bg-slate-100 text-slate-700",
    SENT: "bg-emerald-50 text-emerald-700",
    DELIVERED: "bg-blue-50 text-blue-700",
    FAILED: "bg-red-50 text-red-700",
    BOUNCED: "bg-amber-50 text-amber-800",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${styles[status] || "bg-slate-100"}`}>
      {status || "—"}
    </span>
  );
}

// ── Existing components ───────────────────────────────────────────────────

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

