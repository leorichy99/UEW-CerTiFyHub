import { useState, useEffect } from "react";
import { useToast } from "./ToastContainer";
import { useAuth } from "../context/AuthContext";
import { templateAPI, certificateAPI } from "../services/api";
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  Award,
} from "lucide-react";

/**
 * BulkIssueDialog — a 2-step modal for issuing certificates to pre-selected students.
 *
 * Props:
 *   open        – boolean, controls visibility
 *   onClose     – () => void
 *   students    – array of student objects (the selected rows from StudentsPage)
 *   onComplete  – () => void, called after successful issuance
 */
export default function BulkIssueDialog({ open, onClose, students = [], onComplete }) {
  const toast = useToast();
  const { user } = useAuth();
  const isSuperAdmin = user?.profile?.role === 'SUPER_ADMIN';
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [dateAwarded, setDateAwarded] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSelectedTemplate("");
    setDateAwarded(new Date().toISOString().split("T")[0]);
    setIssuing(false);

    (async () => {
      setLoadingTemplates(true);
      try {
        const res = await templateAPI.getAll();
        const all = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setTemplates(isSuperAdmin ? all : all.filter(t => !t.is_locked));
      } catch {
        toast.error("Failed to load templates.");
      } finally {
        setLoadingTemplates(false);
      }
    })();
  }, [open]);

  if (!open) return null;

  const templateName =
    templates.find((t) => t.id === selectedTemplate)?.name || "";

  const handleIssue = async () => {
    if (!selectedTemplate) {
      toast.error("Please choose a template.");
      return;
    }
    if (!students.length) {
      toast.error("No students selected.");
      return;
    }

    const studentIds = students.map((s) => s.id);
    setIssuing(true);

    try {
      toast.success(
        `Starting bulk issuance for ${studentIds.length} student${studentIds.length > 1 ? "s" : ""}...`
      );

      const issueRes = await certificateAPI.bulkIssue({
        template_id: selectedTemplate,
        student_ids: studentIds,
        date_awarded: dateAwarded,
      });

      const issuedCerts = Array.isArray(issueRes?.data) ? issueRes.data : [];

      if (issuedCerts.length > 0) {
        const certIds = issuedCerts.map((c) => c.id).filter(Boolean);
        if (certIds.length > 0) {
          toast.success(
            `${certIds.length} certificate${certIds.length > 1 ? "s" : ""} generated! Preparing PDF download...`
          );
          try {
            const bundleRes = await certificateAPI.bulkBundle(certIds);
            const blob = new Blob([bundleRes.data], {
              type: "application/pdf",
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute(
              "download",
              `bulk_certificates_${Date.now()}.pdf`
            );
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
          } catch {
            toast.error(
              "Certificates were issued but PDF download failed. You can download them individually."
            );
          }
        }
      }

      toast.success(
        `Bulk issuance complete! ${issuedCerts.length} of ${studentIds.length} certificate${studentIds.length > 1 ? "s" : ""} issued.`
      );
      onComplete?.();
      onClose();
    } catch (err) {
      console.error("Bulk issuance failed:", err);
      const details = err?.response?.data;
      const rawMessage =
        (typeof details === "string" && details) ||
        details?.error ||
        details?.detail ||
        (details ? JSON.stringify(details) : "");
      toast.error(
        rawMessage
          ? `Bulk issuance failed. ${rawMessage}`
          : "Bulk issuance failed."
      );
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <Award size={18} className="text-blue-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Issue Certificates
              </h2>
              <p className="text-xs text-slate-500">
                {students.length} student{students.length !== 1 ? "s" : ""}{" "}
                selected
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                  step === 1
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {step > 1 ? <Check size={12} /> : "1"}
              </span>
              <span className={step === 1 ? "font-semibold text-slate-900" : ""}>
                Template
              </span>
              <div className="w-6 h-px bg-slate-200" />
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                  step === 2
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                2
              </span>
              <span className={step === 2 ? "font-semibold text-slate-900" : ""}>
                Review
              </span>
            </div>

            <button
              onClick={onClose}
              disabled={issuing}
              className="text-slate-400 hover:text-slate-600 transition disabled:opacity-50"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-5">
              {/* Date picker */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Calendar size={14} />
                  Date Awarded
                </label>
                <input
                  type="date"
                  value={dateAwarded}
                  onChange={(e) => setDateAwarded(e.target.value)}
                  className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Templates grid */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3">
                  Choose Certificate Template
                </h3>
                {loadingTemplates ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <FileText
                      size={36}
                      className="mx-auto mb-3 opacity-50"
                    />
                    <p className="text-sm">No templates available.</p>
                    <p className="text-xs mt-1">
                      Create a template first before issuing certificates.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {templates.map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => setSelectedTemplate(t.id)}
                        className={`text-left rounded-xl border-2 transition bg-white overflow-hidden ${
                          selectedTemplate === t.id
                            ? "border-blue-600 ring-2 ring-blue-600/10"
                            : "border-slate-200 hover:border-blue-300"
                        }`}
                      >
                        <div className="p-3">
                          <div className="text-sm font-bold text-slate-900 truncate">
                            {t.name}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {t.updated_at
                              ? `Updated ${new Date(t.updated_at).toLocaleDateString()}`
                              : ""}
                          </div>
                          {selectedTemplate === t.id && (
                            <div className="mt-1.5 text-[11px] font-bold text-blue-700">
                              Selected
                            </div>
                          )}
                        </div>
                        <div className="h-20 bg-slate-50 border-t border-slate-100" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-xs text-slate-500">Students</div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    {students.length}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-xs text-slate-500">Template</div>
                  <div className="text-sm font-bold text-slate-900 truncate mt-1">
                    {templateName}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-xs text-slate-500">Date Awarded</div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {dateAwarded}
                  </div>
                </div>
              </div>

              {/* Student preview table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-500 tracking-widest uppercase">
                    Student Preview
                    {students.length > 50 && ` (showing first 50 of ${students.length})`}
                  </span>
                </div>
                <div className="overflow-auto max-h-64">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">
                          #
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">
                          ID
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">
                          Name
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">
                          Program
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {students.slice(0, 50).map((s, i) => (
                        <tr key={s.id}>
                          <td className="px-4 py-2 text-xs text-slate-500">
                            {i + 1}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-800">
                            {s.student_id}
                          </td>
                          <td className="px-4 py-2 text-sm font-medium text-slate-900">
                            {s.full_name}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-500">
                            {s.program}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => (step === 1 ? onClose() : setStep(1))}
            disabled={issuing}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 text-sm font-medium transition"
          >
            <ChevronLeft size={16} />
            {step === 1 ? "Cancel" : "Back"}
          </button>

          {step === 1 ? (
            <button
              type="button"
              onClick={() => {
                if (!selectedTemplate) {
                  toast.error("Please choose a template.");
                  return;
                }
                setStep(2);
              }}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-blue-700 text-white font-semibold hover:bg-blue-800 text-sm transition"
            >
              Review
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleIssue}
              disabled={issuing}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-50 text-sm transition"
            >
              {issuing ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Issuing...
                </>
              ) : (
                <>
                  <Award size={16} />
                  Issue {students.length} Certificate
                  {students.length !== 1 ? "s" : ""}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
