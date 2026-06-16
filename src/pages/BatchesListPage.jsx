/**
 * BatchesListPage
 *
 * Flat list of certificate batches (sessions). Replaces the two-tier
 * Congregation → Session navigation with a single batch-centric view.
 */

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Plus, Loader2, X, FileText } from "lucide-react";

import {
  useBatches, useCreateBatch,
} from "../hooks/registry/useBatches.js";
import { useTemplates } from "../hooks/templates/useTemplates.js";
import { useToast } from "../components/ToastContainer";
import PageTitle from "../components/PageTitle";
import Table from "../components/ui/Table";

const inputClass =
  "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400";

const STATUS_STYLES = {
  DRAFT: "bg-slate-100 text-slate-700",
  PUBLISHED: "bg-blue-100 text-blue-700",
  CONFIRMATION_OPEN: "bg-sky-100 text-sky-700",
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

export default function BatchesListPage() {
  const [showCreate, setShowCreate] = useState(false);
  const query = useBatches();
  const items = useMemo(() => readArray(query.data), [query.data]);

  return (
    <div className="space-y-6">
      <PageTitle>Certificate Batches</PageTitle>
      <div className="flex justify-between items-center">
        <div className="text-sm text-slate-500">
          {items.length} batch{items.length === 1 ? "" : "es"}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
        >
          <Plus size={16} /> Create batch
        </button>
      </div>

      <Table>
        <Table.Head>
          <tr>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Year</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Records</Table.HeaderCell>
            <Table.HeaderCell>Issued</Table.HeaderCell>
            <Table.HeaderCell>Created</Table.HeaderCell>
          </tr>
        </Table.Head>
        <Table.Body>
          {query.isLoading && (
            <tr>
              <td colSpan={6} className="text-center py-8">
                <Loader2 className="animate-spin inline" size={20} />
              </td>
            </tr>
          )}
          {!query.isLoading && items.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center py-8 text-slate-500">
                No batches yet. Create the first batch to start issuing certificates.
              </td>
            </tr>
          )}
          {items.map((s) => (
            <Table.Row key={s.id}>
              <Table.Cell className="text-sm">
                <Link
                  to={`/admin/batches/${s.id}`}
                  className="font-medium text-blue-600 hover:underline inline-flex items-center gap-2"
                >
                  <Package size={14} className="text-slate-400" />
                  {s.name}
                </Link>
              </Table.Cell>
              <Table.Cell className="text-sm text-slate-700">{s.year}</Table.Cell>
              <Table.Cell className="text-sm">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                    STATUS_STYLES[s.status] || "bg-slate-100"
                  }`}
                >
                  {STATUS_LABELS[s.status] || s.status}
                </span>
              </Table.Cell>
              <Table.Cell className="text-sm text-slate-700">
                {s.counts?.total ?? 0}
              </Table.Cell>
              <Table.Cell className="text-sm text-slate-700">
                {s.counts?.issued ?? 0}
              </Table.Cell>
              <Table.Cell className="text-sm text-slate-500">
                {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      {showCreate && (
        <CreateBatchModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            query.invalidate?.();
          }}
        />
      )}
    </div>
  );
}

function CreateBatchModal({ onClose, onCreated }) {
  const create = useCreateBatch();
  const templatesQuery = useTemplates();
  const templates = useMemo(() => readArray(templatesQuery.data), [templatesQuery.data]);
  const toast = useToast();

  const defaultDeadline = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, []);

  const [form, setForm] = useState({
    name: "",
    certificate_template: "",
    confirmation_deadline: defaultDeadline,
  });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.certificate_template) {
      toast.error("Please select a certificate template.");
      return;
    }
    setSubmitting(true);
    try {
      const iso = new Date(form.confirmation_deadline).toISOString();
      await create.execute({
        name: form.name.trim(),
        certificate_template: form.certificate_template,
        confirmation_deadline: iso,
      });
      toast.success("Batch created.");
      onCreated?.();
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        JSON.stringify(err?.response?.data || {}) ||
        err.message;
      toast.error(detail || "Failed to create batch.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">
            Create certificate batch
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <label className="block text-xs text-slate-600">
          Name
          <input
            className={`${inputClass} mt-1`}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. 2026 Certificates"
            required
          />
        </label>

        <label className="block text-xs text-slate-600">
          Certificate template
          <select
            className={`${inputClass} mt-1`}
            value={form.certificate_template}
            onChange={(e) => setForm((f) => ({ ...f, certificate_template: e.target.value }))}
            required
          >
            <option value="">Select a template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs text-slate-600">
          Confirmation deadline
          <input
            type="datetime-local"
            className={`${inputClass} mt-1`}
            value={form.confirmation_deadline}
            onChange={(e) => setForm((f) => ({ ...f, confirmation_deadline: e.target.value }))}
            required
          />
        </label>

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
            disabled={submitting}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Create batch
          </button>
        </div>
      </form>
    </div>
  );
}
