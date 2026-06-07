/**
 * ConfirmationPage
 *
 * Public, unauthenticated page where a student lands from the link in their
 * confirmation invitation email. URL: /confirm/:token?ix=<index_number>
 *
 * UX:
 *  1. On mount, look up the (token, index) pair.
 *  2. Show their pre-filled record. They can:
 *       - Confirm everything is correct.
 *       - Raise a dispute (free-text note).
 *  3. After either action, show a success screen.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  GraduationCap, Loader2, CheckCircle2, AlertTriangle, XCircle,
  ShieldCheck, FileEdit, Printer,
} from "lucide-react";

import { confirmationAPI } from "../services/publicApi";
import uewLogo from "../assets/uew-logo.svg";

const STATUS_BAD = {
  invalid:
    "We couldn't find your record. Please double-check that you opened the most recent email and used the link without modification.",
  expired:
    "Your confirmation link has expired. Contact your faculty office to receive a new link.",
  closed:
    "This congregation session is no longer accepting confirmations.",
};

function Field({ label, value, editable = false, onChange, name }) {
  if (!editable) {
    return (
      <div className="border-b border-slate-100 py-2 last:border-b-0">
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-sm text-slate-800 mt-0.5">{value || <span className="text-slate-400">—</span>}</div>
      </div>
    );
  }
  return (
    <div className="border-b border-slate-100 py-2 last:border-b-0">
      <label htmlFor={`field-${name}`} className="text-xs uppercase tracking-wide text-slate-500">{label}</label>
      <input
        id={`field-${name}`}
        type="text"
        value={value || ""}
        onChange={(e) => onChange?.(name, e.target.value)}
        className="mt-0.5 w-full text-sm text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
      />
    </div>
  );
}

export default function ConfirmationPage() {
  const { token } = useParams();
  const [search] = useSearchParams();
  const indexNumber = search.get("ix") || search.get("index_number") || "";

  const [state, setState] = useState({ loading: true });
  const [view, setView] = useState("review"); // review | dispute | done-confirmed | done-disputed
  const [disputeNote, setDisputeNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editedRecord, setEditedRecord] = useState({});

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true });
    confirmationAPI.lookup(token, indexNumber)
      .then((res) => { if (!cancelled) setState({ data: res.data }); })
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

  const handleDispute = async () => {
    if (!disputeNote.trim()) return;
    setSubmitting(true);
    try {
      await confirmationAPI.dispute(token, indexNumber, disputeNote.trim());
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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <img src={uewLogo} alt="UEW" className="h-8 w-8" />
          <div>
            <h1 className="text-base font-bold text-slate-800">UEW CerTiFyHub</h1>
            <p className="text-xs text-slate-500">University of Education, Winneba</p>
          </div>
        </div>
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
            editedRecord={editedRecord}
            onEdit={(name, value) => setEditedRecord((prev) => ({ ...prev, [name]: value }))}
            onConfirm={handleConfirm}
            onStartDispute={() => setView("dispute")}
            submitting={submitting}
          />
        )}

        {state.data && view === "dispute" && (
          <DisputePanel
            payload={state.data}
            note={disputeNote}
            setNote={setDisputeNote}
            onCancel={() => setView("review")}
            onSubmit={handleDispute}
            submitting={submitting}
          />
        )}

        {view === "done-confirmed" && <SuccessPanel kind="confirmed" />}
        {view === "done-disputed" && <SuccessPanel kind="disputed" />}
      </main>
    </div>
  );
}

function ReviewPanel({ payload, editedRecord, onEdit, onConfirm, onStartDispute, submitting }) {
  const { record, session } = payload;
  const valueOf = (name) => (name in editedRecord ? editedRecord[name] : record[name]);
  const hasChanges = Object.keys(editedRecord).length > 0;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <GraduationCap className="text-blue-600" size={24} />
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Confirm your details for {session.generated_name || session.name}
            </h2>
            <p className="text-sm text-slate-500">
              Academic year: <strong>{session.academic_year}</strong>
            </p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900 mb-4">
          Please review your details carefully. You can edit fields directly below if anything is incorrect. Fields with changes will be flagged for review.
        </div>

        <Field label="Index number" name="index_number" value={valueOf("index_number")} editable onChange={onEdit} />
        <Field label="Full name" name="full_name" value={valueOf("full_name")} editable onChange={onEdit} />
        <Field label="Programme" name="programme" value={valueOf("programme")} editable onChange={onEdit} />
        <Field label="Class of degree" name="class_of_degree" value={valueOf("class_of_degree")} editable onChange={onEdit} />
        <Field label="Date of completion" name="date_of_completion" value={valueOf("date_of_completion")} editable onChange={onEdit} />
        <Field label="Faculty" name="faculty_name" value={valueOf("faculty_name")} editable onChange={onEdit} />
        <Field label="Department" name="department_name" value={valueOf("department_name")} editable onChange={onEdit} />
        <Field label="Institutional email" name="institutional_email" value={valueOf("institutional_email")} editable onChange={onEdit} />

        {hasChanges && (
          <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            <AlertTriangle size={12} className="inline mr-1" />
            You have made changes. Submitting will flag these for registrar review rather than auto-confirming.
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="flex-1 bg-emerald-600 text-white px-4 py-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center justify-center gap-2 font-medium"
        >
          <ShieldCheck size={18} />
          {hasChanges ? "Submit changes for review" : "Everything is correct — confirm"}
        </button>
        <button
          onClick={onStartDispute}
          disabled={submitting}
          className="flex-1 border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-3 rounded-lg disabled:opacity-50 inline-flex items-center justify-center gap-2 font-medium"
        >
          <FileEdit size={18} />
          Report other issue
        </button>
      </div>
    </div>
  );
}

function DisputePanel({ payload, note, setNote, onCancel, onSubmit, submitting }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Tell us what's wrong</h2>
        <p className="text-sm text-slate-500 mt-1">
          Be as specific as possible. For example: <em>"My name is misspelled — it should be Jane Adwoa Doe."</em>
          The registrar's office will review your note and may contact you for documentation.
        </p>
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Describe the issue…"
        className="w-full min-h-[150px] px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
      />

      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting || !note.trim()}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {submitting ? <Loader2 className="animate-spin" size={16} /> : <FileEdit size={16} />}
          Submit dispute
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
