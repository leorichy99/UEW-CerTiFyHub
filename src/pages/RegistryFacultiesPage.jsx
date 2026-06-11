/**
 * RegistryFacultiesPage
 *
 * Super-Admin-only management of Faculty and Department reference data
 * used by the registry pipeline (congregation sessions, student records).
 */

import React, { useMemo, useState } from "react";
import { Building2, Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import {
  useFaculties,
  useDepartments,
  useCreateFaculty,
  useUpdateFaculty,
  useDeleteFaculty,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from "../hooks/registry/useFaculties.js";
import { useToast } from "../components/ToastContainer";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import Table from "../components/ui/Table";

const _inputClass = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400";

function readArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

export default function RegistryFacultiesPage() {
  const toast = useToast();
  const confirm = useConfirmDialog();
  const [tab, setTab] = useState("faculties");
  const [facultyForm, setFacultyForm] = useState(null); // { id?, name, code, is_active }
  const [departmentForm, setDepartmentForm] = useState(null);

  const facultiesQuery = useFaculties();
  const departmentsQuery = useDepartments();

  const faculties = useMemo(() => readArray(facultiesQuery.data), [facultiesQuery.data]);
  const departments = useMemo(() => readArray(departmentsQuery.data), [departmentsQuery.data]);

  const createFaculty = useCreateFaculty();
  const updateFaculty = useUpdateFaculty(facultyForm?.id);
  const deleteFacultyMutation = useDeleteFaculty(facultyForm?.id);

  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment(departmentForm?.id);

  const handleSaveFaculty = async () => {
    if (!facultyForm?.name?.trim() || !facultyForm?.code?.trim()) {
      toast.error("Name and code are required");
      return;
    }
    try {
      if (facultyForm.id) {
        await updateFaculty.execute({
          name: facultyForm.name,
          code: facultyForm.code,
          is_active: facultyForm.is_active ?? true,
        });
      } else {
        await createFaculty.execute({
          name: facultyForm.name,
          code: facultyForm.code,
          is_active: facultyForm.is_active ?? true,
        });
      }
      toast.success("Faculty saved");
      setFacultyForm(null);
      facultiesQuery.invalidate();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save faculty");
    }
  };

  const handleDeleteFaculty = async (faculty) => {
    const ok = await confirm({
      title: "Delete faculty?",
      message: `Delete "${faculty.name}"? This cannot be undone.`,
      confirmText: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await fetch(`/api/registry/faculties/${faculty.id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
        },
      });
      toast.success("Faculty deleted");
      facultiesQuery.invalidate();
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  const handleSaveDepartment = async () => {
    if (!departmentForm?.name?.trim() || !departmentForm?.code?.trim() || !departmentForm?.faculty) {
      toast.error("Faculty, name, and code are required");
      return;
    }
    try {
      if (departmentForm.id) {
        await updateDepartment.execute({
          faculty: departmentForm.faculty,
          name: departmentForm.name,
          code: departmentForm.code,
          is_active: departmentForm.is_active ?? true,
        });
      } else {
        await createDepartment.execute({
          faculty: departmentForm.faculty,
          name: departmentForm.name,
          code: departmentForm.code,
          is_active: departmentForm.is_active ?? true,
        });
      }
      toast.success("Department saved");
      setDepartmentForm(null);
      departmentsQuery.invalidate();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save department");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-slate-200">
        {[
          ["faculties", "Faculties"],
          ["departments", "Departments"],
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

      {tab === "faculties" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold text-slate-700">Faculties</h2>
            <button
              onClick={() => setFacultyForm({ name: "", code: "", is_active: true })}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
            >
              <Plus size={16} /> New faculty
            </button>
          </div>

          <Table>
            <Table.Head>
              <tr>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>Code</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell></Table.HeaderCell>
              </tr>
            </Table.Head>
            <Table.Body>
              {facultiesQuery.isLoading && (
                <tr><td colSpan={4} className="text-center py-8"><Loader2 className="animate-spin inline" size={20} /></td></tr>
              )}
              {!facultiesQuery.isLoading && faculties.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-slate-500">No faculties yet</td></tr>
              )}
              {faculties.map(f => (
                <Table.Row key={f.id}>
                  <Table.Cell className="text-sm">{f.name}</Table.Cell>
                  <Table.Cell className="text-sm font-mono text-slate-600">{f.code}</Table.Cell>
                  <Table.Cell className="text-sm">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                      f.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {f.is_active ? "Active" : "Inactive"}
                    </span>
                  </Table.Cell>
                  <Table.Cell className="text-right">
                    <button
                      onClick={() => setFacultyForm(f)}
                      className="text-slate-500 hover:text-blue-600 mr-2"
                      aria-label="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteFaculty(f)}
                      className="text-slate-500 hover:text-red-600"
                      aria-label="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}

      {tab === "departments" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold text-slate-700">Departments</h2>
            <button
              onClick={() => setDepartmentForm({
                name: "", code: "", is_active: true,
                faculty: faculties[0]?.id || "",
              })}
              disabled={faculties.length === 0}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <Plus size={16} /> New department
            </button>
          </div>

          <Table>
            <Table.Head>
              <tr>
                <Table.HeaderCell>Faculty</Table.HeaderCell>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>Code</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell></Table.HeaderCell>
              </tr>
            </Table.Head>
            <Table.Body>
              {departmentsQuery.isLoading && (
                <tr><td colSpan={5} className="text-center py-8"><Loader2 className="animate-spin inline" size={20} /></td></tr>
              )}
              {!departmentsQuery.isLoading && departments.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-slate-500">No departments yet</td></tr>
              )}
              {departments.map(d => (
                <Table.Row key={d.id}>
                  <Table.Cell className="text-sm">{d.faculty_name}</Table.Cell>
                  <Table.Cell className="text-sm">{d.name}</Table.Cell>
                  <Table.Cell className="text-sm font-mono text-slate-600">{d.code}</Table.Cell>
                  <Table.Cell className="text-sm">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                      d.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {d.is_active ? "Active" : "Inactive"}
                    </span>
                  </Table.Cell>
                  <Table.Cell className="text-right">
                    <button
                      onClick={() => setDepartmentForm(d)}
                      className="text-slate-500 hover:text-blue-600"
                      aria-label="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}

      {facultyForm && (
        <Modal title={facultyForm.id ? "Edit faculty" : "New faculty"} onClose={() => setFacultyForm(null)}>
          <div className="space-y-3">
            <Field label="Name">
              <input
                value={facultyForm.name}
                onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })}
                className={_inputClass}
              />
            </Field>
            <Field label="Code">
              <input
                value={facultyForm.code}
                onChange={(e) => setFacultyForm({ ...facultyForm, code: e.target.value })}
                className={_inputClass}
              />
            </Field>
            <Field label="Active">
              <input
                type="checkbox"
                checked={facultyForm.is_active ?? true}
                onChange={(e) => setFacultyForm({ ...facultyForm, is_active: e.target.checked })}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setFacultyForm(null)} className="px-3 py-2 text-sm text-slate-600">Cancel</button>
              <button onClick={handleSaveFaculty} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
            </div>
          </div>
        </Modal>
      )}

      {departmentForm && (
        <Modal title={departmentForm.id ? "Edit department" : "New department"} onClose={() => setDepartmentForm(null)}>
          <div className="space-y-3">
            <Field label="Faculty">
              <select
                value={departmentForm.faculty}
                onChange={(e) => setDepartmentForm({ ...departmentForm, faculty: e.target.value })}
                className={_inputClass}
              >
                {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </Field>
            <Field label="Name">
              <input
                value={departmentForm.name}
                onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                className={_inputClass}
              />
            </Field>
            <Field label="Code">
              <input
                value={departmentForm.code}
                onChange={(e) => setDepartmentForm({ ...departmentForm, code: e.target.value })}
                className={_inputClass}
              />
            </Field>
            <Field label="Active">
              <input
                type="checkbox"
                checked={departmentForm.is_active ?? true}
                onChange={(e) => setDepartmentForm({ ...departmentForm, is_active: e.target.checked })}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDepartmentForm(null)} className="px-3 py-2 text-sm text-slate-600">Cancel</button>
              <button onClick={handleSaveDepartment} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        {children}
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

