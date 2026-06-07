/**
 * CongregationTemplatesPage
 *
 * Admin view for reusable congregation schedules. List + create + edit +
 * activate/deactivate. The "apply to congregation" action lives on the
 * congregation detail page so it stays close to the target.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Plus, Loader2, LayoutTemplate, X, Trash2, Pencil, Power,
} from "lucide-react";

import {
  useCongregationTemplates, useCreateCongregationTemplate,
  useUpdateCongregationTemplate, useDeleteCongregationTemplate,
} from "../hooks/registry/useCongregationTemplates.js";
import { useApiQuery } from "../hooks/api/useApiQuery.js";
import { useToast } from "../components/ToastContainer";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import Table from "../components/ui/Table";

const inputClass =
  "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400";

const SCOPE_CHOICES = [
  ["INSTITUTION", "Institution"],
  ["FACULTY", "Faculty"],
  ["DEPARTMENT", "Department"],
];

function readArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

export default function CongregationTemplatesPage() {
  const query = useCongregationTemplates();
  const templates = useMemo(() => readArray(query.data), [query.data]);
  const [editing, setEditing] = useState(null); // null | "new" | {template}

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-sm text-slate-500">
          {templates.length} template{templates.length === 1 ? "" : "s"}
        </div>
        <button
          onClick={() => setEditing("new")}
          className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
        >
          <Plus size={16} /> New template
        </button>
      </div>

      <Table>
        <Table.Head>
          <tr>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Sessions</Table.HeaderCell>
            <Table.HeaderCell>Active</Table.HeaderCell>
            <Table.HeaderCell>Sourced from</Table.HeaderCell>
            <Table.HeaderCell />
          </tr>
        </Table.Head>
        <Table.Body>
          {query.isLoading && (
            <tr>
              <td colSpan={5} className="text-center py-8">
                <Loader2 className="animate-spin inline" />
              </td>
            </tr>
          )}
          {!query.isLoading && templates.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center py-8 text-slate-500">
                No templates yet. Create one to standardise session
                scheduling across congregations.
              </td>
            </tr>
          )}
          {templates.map((t) => (
            <TemplateRow
              key={t.id}
              template={t}
              onEdit={() => setEditing({ template: t })}
              onChanged={() => query.invalidate?.()}
            />
          ))}
        </Table.Body>
      </Table>

      {editing && (
        <TemplateEditorModal
          existing={editing === "new" ? null : editing.template}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            query.invalidate?.();
          }}
        />
      )}
    </div>
  );
}

function TemplateRow({ template, onEdit, onChanged }) {
  const update = useUpdateCongregationTemplate(template.id);
  const del = useDeleteCongregationTemplate(template.id);
  const toast = useToast();
  const confirm = useConfirmDialog();

  const toggleActive = async () => {
    try {
      await update.execute({ is_active: !template.is_active });
      toast.success(`Template ${template.is_active ? "deactivated" : "activated"}.`);
      onChanged?.();
    } catch (e) {
      toast.error("Failed to toggle status.");
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete template?",
      message:
        `"${template.name}" will be removed. Congregations already ` +
        `instantiated from it are unaffected.`,
      confirmText: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await del.execute();
      toast.success("Template deleted.");
      onChanged?.();
    } catch (e) {
      toast.error("Failed to delete.");
    }
  };

  return (
    <Table.Row>
      <Table.Cell className="text-sm">
        <div className="font-medium text-slate-800 inline-flex items-center gap-2">
          <LayoutTemplate size={14} className="text-indigo-500" />
          {template.name}
        </div>
        {template.description && (
          <div className="text-xs text-slate-500 mt-0.5">
            {template.description}
          </div>
        )}
      </Table.Cell>
      <Table.Cell className="text-sm text-slate-700">
        {(template.session_defs || []).length}
      </Table.Cell>
      <Table.Cell className="text-sm">
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs ${
            template.is_active
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {template.is_active ? "Active" : "Inactive"}
        </span>
      </Table.Cell>
      <Table.Cell className="text-sm text-slate-500">
        {template.sourced_from_congregation_name || "—"}
      </Table.Cell>
      <Table.Cell className="text-right">
        <div className="inline-flex items-center gap-1">
          <button
            onClick={toggleActive}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
            title={template.is_active ? "Deactivate" : "Activate"}
          >
            <Power size={14} />
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded hover:bg-rose-50 text-rose-600"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </Table.Cell>
    </Table.Row>
  );
}

// ── Editor modal ───────────────────────────────────────────────────────────

function blankSessionDef(n) {
  return {
    session_number: n,
    name_pattern: "{year} Congregation · Session {n}",
    scope_type: "INSTITUTION",
    ceremony_day_offset: 0,
    confirmation_window_days: 14,
    issuance_instructions: "",
    default_faculty: "",
    default_department: "",
    default_certificate_template: "",
  };
}

function TemplateEditorModal({ existing, onClose, onSaved }) {
  const create = useCreateCongregationTemplate();
  const update = useUpdateCongregationTemplate(existing?.id);
  const toast = useToast();
  // Certificate templates list — the picker fuels each session def.
  const certificatesQuery = useApiQuery("/templates/", {
    params: { page_size: 200 },
  });
  const certificateTemplates = readArray(certificatesQuery.data);

  const [name, setName] = useState(existing?.name || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [defs, setDefs] = useState(() =>
    existing?.session_defs?.length
      ? existing.session_defs.map((sd) => ({
          session_number: sd.session_number,
          name_pattern: sd.name_pattern || "",
          scope_type: sd.scope_type,
          ceremony_day_offset: sd.ceremony_day_offset ?? 0,
          confirmation_window_days: sd.confirmation_window_days ?? 14,
          issuance_instructions: sd.issuance_instructions || "",
          default_faculty: sd.default_faculty || "",
          default_department: sd.default_department || "",
          default_certificate_template: sd.default_certificate_template || "",
        }))
      : [blankSessionDef(1)],
  );
  const [submitting, setSubmitting] = useState(false);

  const addSessionDef = () => {
    const next = defs.length
      ? Math.max(...defs.map((d) => Number(d.session_number) || 0)) + 1
      : 1;
    setDefs((arr) => [...arr, blankSessionDef(next)]);
  };
  const removeSessionDef = (idx) =>
    setDefs((arr) => arr.filter((_, i) => i !== idx));
  const patchDef = (idx, patch) =>
    setDefs((arr) =>
      arr.map((d, i) => (i === idx ? { ...d, ...patch } : d)),
    );

  const submit = async (e) => {
    e.preventDefault();
    if (defs.length === 0) {
      toast.error("Add at least one session definition.");
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim(),
      session_defs: defs.map((d) => ({
        ...d,
        session_number: Number(d.session_number),
        ceremony_day_offset: Number(d.ceremony_day_offset),
        confirmation_window_days: Number(d.confirmation_window_days),
        default_faculty: d.default_faculty || null,
        default_department: d.default_department || null,
        default_certificate_template: d.default_certificate_template || null,
      })),
    };
    setSubmitting(true);
    try {
      if (existing) {
        await update.execute(payload);
        toast.success("Template updated.");
      } else {
        await create.execute(payload);
        toast.success("Template created.");
      }
      onSaved?.();
    } catch (err) {
      const data = err?.response?.data;
      const msg =
        (typeof data === "string" && data) ||
        data?.detail ||
        (data && JSON.stringify(data)) ||
        err.message;
      toast.error(msg || "Failed to save template.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800 inline-flex items-center gap-2">
            <LayoutTemplate size={16} className="text-indigo-600" />
            {existing ? "Edit template" : "New template"}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block text-xs text-slate-600">
            Name
            <input
              className={`${inputClass} mt-1`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block text-xs text-slate-600">
            Description (optional)
            <input
              className={`${inputClass} mt-1`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-700">
              Session blueprints
            </div>
            <button
              type="button"
              onClick={addSessionDef}
              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              <Plus size={12} /> Add session
            </button>
          </div>

          {defs.map((d, idx) => (
            <div
              key={idx}
              className="border border-slate-200 rounded-lg p-3 space-y-3 bg-slate-50/40"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-slate-600">
                  Session {d.session_number}
                </div>
                {defs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSessionDef(idx)}
                    className="text-rose-600 hover:bg-rose-50 p-1 rounded"
                    title="Remove"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <label className="block text-xs text-slate-600 col-span-2">
                  Name pattern
                  <input
                    className={`${inputClass} mt-1`}
                    value={d.name_pattern}
                    onChange={(e) =>
                      patchDef(idx, { name_pattern: e.target.value })
                    }
                    placeholder="{year} Congregation · Session {n}"
                    required
                  />
                </label>
                <label className="block text-xs text-slate-600">
                  Session #
                  <input
                    type="number"
                    min={1}
                    className={`${inputClass} mt-1`}
                    value={d.session_number}
                    onChange={(e) =>
                      patchDef(idx, { session_number: e.target.value })
                    }
                  />
                </label>
                <label className="block text-xs text-slate-600">
                  Scope
                  <select
                    className={`${inputClass} mt-1`}
                    value={d.scope_type}
                    onChange={(e) =>
                      patchDef(idx, { scope_type: e.target.value })
                    }
                  >
                    {SCOPE_CHOICES.map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <label className="block text-xs text-slate-600">
                  Day offset (from ceremony month)
                  <input
                    type="number"
                    className={`${inputClass} mt-1`}
                    value={d.ceremony_day_offset}
                    onChange={(e) =>
                      patchDef(idx, { ceremony_day_offset: e.target.value })
                    }
                  />
                </label>
                <label className="block text-xs text-slate-600">
                  Confirmation window (days before)
                  <input
                    type="number"
                    min={0}
                    className={`${inputClass} mt-1`}
                    value={d.confirmation_window_days}
                    onChange={(e) =>
                      patchDef(idx, { confirmation_window_days: e.target.value })
                    }
                  />
                </label>
                <label className="block text-xs text-slate-600 col-span-2">
                  Default certificate template
                  <select
                    className={`${inputClass} mt-1`}
                    value={d.default_certificate_template || ""}
                    onChange={(e) =>
                      patchDef(idx, {
                        default_certificate_template: e.target.value || "",
                      })
                    }
                  >
                    <option value="">— pick at apply-time —</option>
                    {certificateTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>

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
            {existing ? "Save changes" : "Create template"}
          </button>
        </div>
      </form>
    </div>
  );
}
