

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Loader2, CheckCircle2, AlertTriangle, XCircle,
  ShieldCheck, FileEdit, Printer,
} from "lucide-react";

import { confirmationAPI } from "../services/publicApi";
import uewLogo from "../assets/uew-logo.svg";
import DisputeForm from "../components/DisputeForm";

const STATUS_BAD = {
  invalid:
    "We couldn't find your record. Please double-check that you opened the most recent email and used the link without modification.",
  expired:
    "Your confirmation link has expired. Contact your faculty office to receive a new link.",
  closed:
    "This congregation session is no longer accepting confirmations.",
};

function ReadOnlyField({ label, value }) {
  return (
    <div className="border-b border-slate-100 py-2.5 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
          <div className="text-sm text-slate-800 mt-0.5">{value || <span className="text-slate-400">—</span>}</div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  const { token } = useParams();
  const [search] = useSearchParams();
  const indexNumber = search.get("ix") || search.get("index_number") || "";

  const [state, setState] = useState({ loading: true });
  const [view, setView] = useState("review"); // review | dispute-form | done-confirmed | done-disputed
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true });
    confirmationAPI.lookup(token, indexNumber)
      .then((res) => {
        if (!cancelled) {
          setState({ data: res.data });
          const record = res.data.record;
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
      await confirmationAPI.confirm(token, indexNumber);
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

  const handleDisputeSubmit = async (formData) => {
    setSubmitting(true);
    try {
      await confirmationAPI.dispute(formData);
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
    setView("dispute-form");
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
            onConfirm={handleConfirm}
            onStartDispute={openDisputeForm}
            submitting={submitting}
          />
        )}

        {state.data && view === "dispute-form" && (
          <DisputeForm
            record={state.data.record}
            onCancel={() => setView("review")}
            onSubmit={handleDisputeSubmit}
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

function ReviewPanel({ payload, onConfirm, onStartDispute, submitting }) {
  const { record, batch } = payload;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900 mb-4">
          Please review your details carefully. If any information is incorrect, click "Report an issue" below.
        </div>

        <div className="space-y-1">
          <ReadOnlyField label="First Name" value={record.first_name} />
          <ReadOnlyField label="Middle Name" value={record.middle_name} />
          <ReadOnlyField label="Last Name" value={record.last_name} />
          <ReadOnlyField label="Index number" value={record.index_number} />
          <ReadOnlyField
          label="Programme"
          value={record.programme}
          onReportIssue={() => onFieldDispute("Programme", record.programme)}
        />
        <ReadOnlyField
          label="Class of degree"
          value={record.class_of_degree}
        />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="flex-1 bg-emerald-600 text-white px-4 py-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center justify-center gap-2 font-medium transition-all"
        >
          <ShieldCheck size={18} />
          Confirm
        </button>
        <button
          onClick={onStartDispute}
          disabled={submitting}
          className="flex-1 border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-3 rounded-lg disabled:opacity-50 inline-flex items-center justify-center gap-2 font-medium transition-all"
        >
          <FileEdit size={18} />
          Report Issue
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
