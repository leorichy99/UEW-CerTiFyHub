

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Loader2, CheckCircle2, AlertTriangle, XCircle,
  ShieldCheck, FileEdit, Printer, GripVertical,
} from "lucide-react";

import { confirmationAPI } from "../services/publicApi";
import uewLogo from "../assets/uew-logo.svg";
import DisputeForm from "../components/DisputeForm";
import DisputeSummary from "../components/DisputeSummary";

const STATUS_BAD = {
  invalid:
    "We couldn't find your record. Please double-check that you opened the most recent email and used the link without modification.",
  expired:
    "Your confirmation link has expired. Contact your faculty office to receive a new link.",
  closed:
    "This congregation session is no longer accepting confirmations.",
};

function assembleName(components, order) {
  const parts = order.map((k) => components[k]).filter(Boolean);
  return parts.join(" ");
}

function ReadOnlyField({ label, value, onReportIssue }) {
  return (
    <div className="border-b border-slate-100 py-2.5 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
          <div className="text-sm text-slate-800 mt-0.5">{value || <span className="text-slate-400">—</span>}</div>
        </div>
        {onReportIssue && (
          <button
            onClick={onReportIssue}
            className="shrink-0 text-[11px] text-slate-400 hover:text-(--color-brand-dark) underline underline-offset-2"
          >
            Report an issue
          </button>
        )}
      </div>
    </div>
  );
}

function NamePillWidget({ components, initialOrder, onOrderChange }) {
  const [order, setOrder] = useState(initialOrder);
  const [dragging, setDragging] = useState(null);

  const activeKeys = useCallback(
    () => order.filter((k) => components[k]),
    [order, components]
  );

  const preview = assembleName(components, order);

  const move = (fromIndex, toIndex) => {
    const keys = activeKeys();
    const item = keys[fromIndex];
    const rest = keys.filter((_, i) => i !== fromIndex);
    const next = [...rest.slice(0, toIndex), item, ...rest.slice(toIndex)];
    setOrder(next);
    onOrderChange?.(next);
  };

  const keys = activeKeys();

  return (
    <div className="border-b border-slate-100 py-4">
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Full name</div>
      <p className="text-xs text-slate-500 mb-3">
        Drag the pills to arrange your name in the order you want on your certificate.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {keys.map((key, index) => (
          <div
            key={key}
            draggable
            onDragStart={(e) => {
              setDragging(index);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => setDragging(null)}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragging !== null && dragging !== index) {
                move(dragging, index);
              }
              setDragging(null);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium cursor-grab active:cursor-grabbing select-none transition
              ${dragging === index ? "bg-blue-100 text-blue-700 ring-2 ring-blue-300" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}
            `}
          >
            <GripVertical size={14} className="text-slate-400" />
            {components[key]}
          </div>
        ))}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
        <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">Certificate preview</div>
        <div className="text-sm font-semibold text-slate-800">{preview}</div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  const { token } = useParams();
  const [search] = useSearchParams();
  const indexNumber = search.get("ix") || search.get("index_number") || "";

  const [state, setState] = useState({ loading: true });
  const [view, setView] = useState("review"); // review | dispute-form | dispute-summary | done-confirmed | done-disputed
  const [disputes, setDisputes] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [nameOrder, setNameOrder] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true });
    confirmationAPI.lookup(token, indexNumber)
      .then((res) => {
        if (!cancelled) {
          setState({ data: res.data });
          const record = res.data.record;
          setNameOrder(record.name_order || ["first_name", "other_names", "last_name"]);
          if (record.confirmation_status === "CONFIRMED") {
            setView("done-confirmed");
          } else if (record.confirmation_status === "DISPUTED") {
            setView("done-disputed");
          }
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const code = err?.response?.data?.code || "invalid";
        setState({ error: { code, message: err?.response?.data?.detail } });
      });
    return () => { cancelled = true; };
  }, [token, indexNumber]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await confirmationAPI.confirm(token, indexNumber, nameOrder);
      setView("done-confirmed");
    } catch (err) {
      setState({ error: {
        code: err?.response?.data?.code || "invalid",
        message: err?.response?.data?.detail,
      } });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisputeSubmit = async (disputesData) => {
    setSubmitting(true);
    try {
      await confirmationAPI.dispute(token, indexNumber, null, disputesData);
      setView("done-disputed");
    } catch (err) {
      setState({ error: {
        code: err?.response?.data?.code || "invalid",
        message: err?.response?.data?.detail,
      } });
    } finally {
      setSubmitting(false);
    }
  };

  const openDisputeForm = () => {
    setDisputes([]);
    setView("dispute-form");
  };

  const openDisputeSummary = (disputesData) => {
    setDisputes(disputesData);
    setView("dispute-summary");
  };

  return (
    <div className="min-h-screen relative">
      {/* Full-page background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/uew-grad.jpg')" }}
      />
      {/* Right-to-left gradient overlay: danger → brand */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to left, rgba(225, 29, 72, 0.82), rgba(36, 37, 118, 0.82))",
        }}
      />

      <div className="relative z-10">
        <header className="max-w-3xl mx-auto flex flex-col items-center pt-8 pb-4">
          <img src={uewLogo} alt="UEW" className="h-24 w-24 mb-3" />
          <h1 className="text-xl font-bold text-white text-center">Confirm your details</h1>
        </header>

        <main className="max-w-3xl mx-auto p-6">
        {state.loading && (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
            <Loader2 className="animate-spin mx-auto text-blue-600" size={32} />
            <p className="text-sm text-slate-500 mt-3">Looking up your record…</p>
          </div>
        )}

        {state.error && (
          <ErrorPanel code={state.error.code} detail={state.error.message} />
        )}

        {state.data && view === "review" && (
          <ReviewPanel
            payload={state.data}
            nameOrder={nameOrder}
            onNameOrderChange={setNameOrder}
            onConfirm={handleConfirm}
            onStartDispute={openDisputeForm}
            onFieldDispute={openDisputeForm}
            submitting={submitting}
          />
        )}

        {state.data && view === "dispute-form" && (
          <DisputeForm
            record={state.data.record}
            onCancel={() => setView("review")}
            onSubmit={openDisputeSummary}
            submitting={submitting}
          />
        )}

        {state.data && view === "dispute-summary" && (
          <DisputeSummary
            disputes={disputes}
            onEdit={() => setView("dispute-form")}
            onConfirm={handleDisputeSubmit}
            onCancel={() => setView("review")}
            submitting={submitting}
          />
        )}

        {view === "done-confirmed" && <SuccessPanel kind="confirmed" />}
        {view === "done-disputed" && <SuccessPanel kind="disputed" />}
      </main>
      </div>
    </div>
  );
}

function ReviewPanel({ payload, nameOrder, onNameOrderChange, onConfirm, onStartDispute, onFieldDispute, submitting }) {
  const { record, batch } = payload;
  const hasNameChange = nameOrder && JSON.stringify(nameOrder) !== JSON.stringify(record.name_order);

  const nameComponents = {
    first_name: record.first_name,
    other_names: record.other_names,
    last_name: record.last_name,
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900 mb-4">
          Please review your details carefully. You can drag your name components into the order you want on your certificate. If any other detail is wrong, click "Report an issue" next to it.
        </div>

        <NamePillWidget
          components={nameComponents}
          initialOrder={nameOrder}
          onOrderChange={onNameOrderChange}
        />

        <div className="mt-2">
          <button
            onClick={() => onFieldDispute("Full name", record.full_name)}
            className="text-[11px] text-slate-400 hover:text-amber-600 underline underline-offset-2"
          >
            Is a name spelled incorrectly or missing?
          </button>
        </div>

        <ReadOnlyField label="Index number" value={record.index_number} />
        <ReadOnlyField
          label="Programme"
          value={record.programme}
          onReportIssue={() => onFieldDispute("Programme", record.programme)}
        />
        <ReadOnlyField
          label="Class of degree"
          value={record.class_of_degree}
          onReportIssue={() => onFieldDispute("Class of degree", record.class_of_degree)}
        />

        {hasNameChange && (
          <div className="mt-3 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
            <AlertTriangle size={12} className="inline mr-1" />
            You have rearranged your name. The order shown in the certificate preview above will be used.
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="flex-1 bg-emerald-600 text-white px-4 py-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center justify-center gap-2 font-medium transition-all"
        >
          <ShieldCheck size={18} />
          Everything is correct — confirm
        </button>
        <button
          onClick={onStartDispute}
          disabled={submitting}
          className="flex-1 border border-slate-300 text-white hover:bg-slate-50 hover:text-(--color-text-primary) px-4 py-3 rounded-lg disabled:opacity-50 inline-flex items-center justify-center gap-2 font-medium transition-all"
        >
          <FileEdit size={18} />
          Report other issue
        </button>
      </div>
    </div>
  );
}

function SuccessPanel({ kind }) {
  const handlePrint = () => window.print();

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
      {kind === "confirmed" ? (
        <>
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            Confirmation received
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Thank you. Your details have been confirmed. You will receive a follow-up email when your certificate is ready.
          </p>
        </>
      ) : (
        <>
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 text-amber-600 rounded-full mb-4">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            Dispute submitted
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            We've recorded your note. The registrar's office will review it and email you with the next steps.
            You can safely close this page.
          </p>
        </>
      )}
      <button
        onClick={handlePrint}
        className="mt-6 inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
        aria-label="Print this page"
      >
        <Printer size={16} />
        Print / Save for your records
      </button>
    </div>
  );
}

function ErrorPanel({ code, detail }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 text-red-600 rounded-full mb-4">
        <XCircle size={32} />
      </div>
      <h2 className="text-xl font-semibold text-slate-800 mb-2">
        We couldn't open your confirmation page
      </h2>
      <p className="text-sm text-slate-600 max-w-md mx-auto">
        {STATUS_BAD[code] || detail || "Please contact your faculty office for help."}
      </p>
    </div>
  );
}
