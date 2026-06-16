/**
 * CongregationsListPage
 *
 * Slice 5 entry point for the registry redesign. Lists every Congregation
 * (one per academic year), surfaces derived status + aggregate counts, and
 * lets Super-Admins spin up a new year with a single dialog.
 */

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Plus, Loader2, X, CalendarDays } from "lucide-react";

import {
  useCongregations, useCreateCongregation,
} from "../hooks/registry/useCongregations.js";
import { useToast } from "../components/ToastContainer";
import PageTitle from "../components/PageTitle";
import Table from "../components/ui/Table";

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

function readArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

export default function CongregationsListPage() {
  const [showCreate, setShowCreate] = useState(false);
  const query = useCongregations();
  const items = useMemo(() => readArray(query.data), [query.data]);

  return (
    <div className="space-y-6">
      <PageTitle>Congregations</PageTitle>
      <div className="flex justify-between items-center">
        <div className="text-sm text-slate-500">
          {items.length} congregation{items.length === 1 ? "" : "s"}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
        >
          <Plus size={16} /> New congregation
        </button>
      </div>

      <Table>
        <Table.Head>
          <tr>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Year</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Sessions</Table.HeaderCell>
            <Table.HeaderCell>Records</Table.HeaderCell>
          </tr>
        </Table.Head>
        <Table.Body>
          {query.isLoading && (
            <tr>
              <td colSpan={5} className="text-center py-8">
                <Loader2 className="animate-spin inline" size={20} />
              </td>
            </tr>
          )}
          {!query.isLoading && items.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center py-8 text-slate-500">
                No congregations yet. Create the first one to start scheduling sessions.
              </td>
            </tr>
          )}
          {items.map((c) => (
            <Table.Row key={c.id}>
              <Table.Cell className="text-sm">
                <Link
                  to={`/admin/congregations/${c.id}`}
                  className="font-medium text-blue-600 hover:underline inline-flex items-center gap-2"
                >
                  <GraduationCap size={14} className="text-slate-400" />
                  {c.name}
                </Link>
              </Table.Cell>
              <Table.Cell className="text-sm text-slate-700">{c.year}</Table.Cell>
              <Table.Cell className="text-sm">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                    STATUS_STYLES[c.status] || "bg-slate-100"
                  }`}
                >
                  {STATUS_LABELS[c.status] || c.status}
                </span>
              </Table.Cell>
              <Table.Cell className="text-sm text-slate-700">
                {c.session_count ?? 0}
              </Table.Cell>
              <Table.Cell className="text-sm text-slate-700">
                {c.counts?.total ?? 0}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      {showCreate && (
        <CreateCongregationModal
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

function CreateCongregationModal({ onClose, onCreated }) {
  const create = useCreateCongregation();
  const toast = useToast();
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({
    name: `${currentYear} Congregation`,
    year: currentYear,
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await create.execute({
        name: form.name.trim(),
        year: Number(form.year),
        description: form.description.trim(),
      });
      toast.success("Congregation created.");
      onCreated?.();
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        JSON.stringify(err?.response?.data || {}) ||
        err.message;
      toast.error(detail || "Failed to create congregation.");
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
            New congregation
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
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-slate-600">
            Year
            <input
              type="number"
              className={`${inputClass} mt-1`}
              value={form.year}
              min={2000}
              max={2100}
              onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
              required
            />
          </label>
        </div>

        <label className="block text-xs text-slate-600">
          Description (optional)
          <textarea
            className={`${inputClass} mt-1 resize-none`}
            rows={2}
            maxLength={500}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
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
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
