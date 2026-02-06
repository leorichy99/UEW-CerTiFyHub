import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { studentAPI, templateAPI, certificateAPI } from "../services/api";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import {
  Upload,
  FileText,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";

export default function BulkIssuePage() {
  const [templates, setTemplates] = useState([]);
  const [activeStep, setActiveStep] = useState(1);

  const [uploadedFile, setUploadedFile] = useState(null);
  const [rawRows, setRawRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({});
  const [mappedRows, setMappedRows] = useState([]);

  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [dateAwarded, setDateAwarded] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tempRes] = await Promise.all([templateAPI.getAll()]);
        setTemplates(tempRes.data);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const requiredFields = [
    "student_id",
    "full_name",
    "email",
    "program",
    "graduation_date",
  ];

  const clearUpload = () => {
    setUploadedFile(null);
    setRawRows([]);
    setColumns([]);
    setMapping({});
    setMappedRows([]);
    setActiveStep(1);
  };

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles?.[0];
    if (!file) return;

    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        setRawRows(Array.isArray(json) ? json : []);
        const nextColumns = json?.[0] ? Object.keys(json[0]) : [];
        setColumns(nextColumns);
        setMapping({});
        setMappedRows([]);
        setActiveStep(2);
      } catch (err) {
        console.error("Failed to parse spreadsheet:", err);
        alert("Failed to read spreadsheet. Please upload a valid Excel file.");
        clearUpload();
      }
    };
    reader.readAsBinaryString(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    multiple: false,
  });

  const systemFields = [
    { value: "student_id", label: "University ID" },
    { value: "full_name", label: "Student Full Name" },
    { value: "email", label: "Email" },
    { value: "program", label: "Program of Study" },
    { value: "graduation_date", label: "Graduation Date" },
    { value: "cohort", label: "Cohort (optional)" },
  ];

  const mappedFieldCount = Object.values(mapping).filter(Boolean).length;

  const normalizeGraduationDate = (value) => {
    if (value === undefined || value === null || String(value).trim() === "") {
      return value;
    }

    if (value instanceof Date) {
      return value.toISOString().split("T")[0];
    }

    if (typeof value === "number") {
      const parsed = XLSX.SSF?.parse_date_code?.(value);
      if (parsed?.y && parsed?.m && parsed?.d) {
        const dt = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
        return dt.toISOString().split("T")[0];
      }
    }

    const dt = new Date(value);
    if (!isNaN(dt.getTime())) {
      return dt.toISOString().split("T")[0];
    }

    return value;
  };

  const buildMappedRows = () => {
    const nextRows = rawRows.map((row) => {
      const mapped = {};
      for (const excelCol of Object.keys(mapping)) {
        const field = mapping[excelCol];
        if (!field) continue;
        mapped[field] = row?.[excelCol];
      }

      if (Object.prototype.hasOwnProperty.call(mapped, "graduation_date")) {
        mapped.graduation_date = normalizeGraduationDate(mapped.graduation_date);
      }

      return mapped;
    });
    setMappedRows(nextRows);
    return nextRows;
  };

  const validationSummary = (() => {
    const rows = mappedRows;
    if (!rows || rows.length === 0) {
      return { invalidCount: 0, missingByField: {}, validPercent: 0 };
    }

    const missingByField = requiredFields.reduce((acc, f) => {
      acc[f] = 0;
      return acc;
    }, {});

    let invalidCount = 0;
    for (const row of rows) {
      let rowValid = true;
      for (const f of requiredFields) {
        const v = row?.[f];
        const ok = v !== undefined && v !== null && String(v).trim() !== "";
        if (!ok) {
          missingByField[f] += 1;
          rowValid = false;
        }
      }
      if (!rowValid) invalidCount += 1;
    }

    const validPercent = Math.round(
      ((rows.length - invalidCount) / rows.length) * 100,
    );
    return { invalidCount, missingByField, validPercent };
  })();

  const canGoToStep2 = uploadedFile && rawRows.length > 0;
  const canGoToStep3 =
    canGoToStep2 &&
    requiredFields.every((f) => Object.values(mapping).includes(f));
  const canGoToStep4 = canGoToStep3 && Boolean(selectedTemplate);

  const missingRequiredFields = requiredFields.filter(
    (f) => !Object.values(mapping).includes(f),
  );

  const fieldLabel = (field) =>
    systemFields.find((f) => f.value === field)?.label || field;

  const goNext = () => {
    if (activeStep === 1) {
      if (!canGoToStep2) {
        alert("Please upload your records file.");
        return;
      }
      setActiveStep(2);
      return;
    }
    if (activeStep === 2) {
      if (!canGoToStep3) {
        const missing = missingRequiredFields.map(fieldLabel);
        alert(
          missing.length > 0
            ? `Please map the required fields before continuing. Missing: ${missing.join(", ")}`
            : "Please map the required fields before continuing.",
        );
        return;
      }
      buildMappedRows();
      setActiveStep(3);
      return;
    }
    if (activeStep === 3) {
      if (!canGoToStep4) {
        alert("Please choose a template.");
        return;
      }
      setActiveStep(4);
      return;
    }
  };

  const goBack = () => {
    setActiveStep((s) => Math.max(1, s - 1));
  };

  const handleIssue = async () => {
    if (!selectedTemplate) {
      alert("Please choose a template.");
      return;
    }
    if (!mappedRows || mappedRows.length === 0) {
      alert("Please upload and map your records.");
      return;
    }
    if (validationSummary.invalidCount > 0) {
      alert(
        "Some records are missing required fields. Please fix the mapping or the file and try again.",
      );
      return;
    }

    setIssuing(true);
    try {
      const studentsRes = await studentAPI.bulkCreate(mappedRows);
      const createdStudents = Array.isArray(studentsRes?.data)
        ? studentsRes.data
        : Array.isArray(studentsRes?.data?.students)
          ? studentsRes.data.students
          : [];

      if (!Array.isArray(createdStudents) || createdStudents.length === 0) {
        throw new Error("No students were created");
      }

      const studentIds = createdStudents
        .map((s) => s?.id)
        .filter((id) => id !== undefined && id !== null);

      if (studentIds.length === 0) {
        throw new Error("No student ids returned");
      }

      const issueRes = await certificateAPI.bulkIssue({
        template_id: selectedTemplate,
        student_ids: studentIds,
        date_awarded: dateAwarded,
      });

      const issued = issueRes?.data;
      const issuedIds = Array.isArray(issued)
        ? issued.map((c) => c?.id).filter(Boolean)
        : [];

      if (issuedIds.length > 0) {
        const bundleRes = await certificateAPI.bulkBundle(issuedIds);
        const blob = new Blob([bundleRes.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "bulk_certificates.pdf");
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }

      alert("Bulk issuance complete!");
      navigate("/certificates");
    } catch (err) {
      console.error("Issuance failed:", err);
      const details = err?.response?.data;
      const message =
        (typeof details === "string" && details) ||
        details?.error ||
        details?.detail ||
        (details ? JSON.stringify(details) : "");
      alert(
        message
          ? `Failed to issue certificates. ${message}`
          : "Failed to issue certificates.",
      );
    } finally {
      setIssuing(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  const StepPill = ({ step, title }) => {
    const isActive = activeStep === step;
    const isDone = activeStep > step;
    return (
      <div className="flex items-center gap-3">
        <div
          className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
            isDone
              ? "bg-blue-600 text-white"
              : isActive
                ? "bg-blue-600/10 text-blue-700 border border-blue-200"
                : "bg-slate-100 text-slate-500"
          }`}
        >
          {isDone ? <Check size={14} /> : step}
        </div>
        <div>
          <div
            className={`text-xs font-semibold ${
              isActive ? "text-slate-900" : "text-slate-500"
            }`}
          >
            {title}
          </div>
        </div>
      </div>
    );
  };

  const progressPercent = Math.round((activeStep / 4) * 100);

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Bulk Upload & Field Mapping
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Bulk certificate issuance in 4 guided steps.
          </p>
        </div>
        <div className="min-w-55">
          <div className="flex items-center justify-end gap-3 text-[10px] font-bold tracking-widest text-slate-400">
            <span>STEP {activeStep} OF 4</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-blue-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <StepPill step={1} title="Upload records" />
            <div className="h-6 w-px bg-slate-200" />
            <StepPill step={2} title="Field mapping" />
            <div className="h-6 w-px bg-slate-200" />
            <StepPill step={3} title="Choose template" />
            <div className="h-6 w-px bg-slate-200" />
            <StepPill step={4} title="Data validation" />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-2">
              <Calendar size={14} />
              Date awarded
            </label>
            <input
              type="date"
              value={dateAwarded}
              onChange={(e) => setDateAwarded(e.target.value)}
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="p-6 bg-slate-50/60">
          {activeStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Upload Student Records
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Supported formats: .xls, .xlsx
                  </p>
                </div>
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl px-6 py-12 text-center cursor-pointer transition bg-white ${
                  isDragActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-blue-300"
                }`}
              >
                <input {...getInputProps()} />
                <div className="mx-auto h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <FileText size={28} className="text-slate-500" />
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  Drag and drop your file here
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Or click to browse from your computer
                </div>

                {uploadedFile && (
                  <div className="mt-6 flex items-center justify-center">
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Check size={14} />
                      </div>
                      <div className="text-xs font-semibold text-slate-800 max-w-65 truncate">
                        {uploadedFile.name}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearUpload();
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Field Mapping
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Map your spreadsheet columns to system fields.
                  </p>
                </div>
                <div className="text-xs text-slate-500">
                  <span className="font-bold text-emerald-700">
                    {mappedFieldCount}/{systemFields.length}
                  </span>{" "}
                  mapped
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-500 tracking-widest uppercase">
                    Source column (from Excel)
                  </div>
                  <div className="text-xs font-bold text-slate-500 tracking-widest uppercase">
                    System field (CertHub)
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {columns.map((col, idx) => (
                    <div
                      key={col}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 py-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold tracking-widest px-2 py-1 rounded bg-slate-100 text-slate-500">
                          Column {String.fromCharCode(65 + (idx % 26))}
                        </span>
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {String(col).toUpperCase()}
                        </div>
                      </div>

                      <div>
                        <select
                          className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={mapping[col] || ""}
                          onChange={(e) =>
                            setMapping((prev) => ({
                              ...prev,
                              [col]: e.target.value,
                            }))
                          }
                        >
                          <option value="">-- Skip --</option>
                          {systemFields.map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                        {requiredFields.includes(mapping[col]) && (
                          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                            Required
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Choose Template
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Select the certificate template to use for this batch.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <button
                    type="button"
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`text-left rounded-2xl border transition bg-white overflow-hidden ${
                      selectedTemplate === template.id
                        ? "border-blue-600 ring-2 ring-blue-600/10"
                        : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="p-4">
                      <div className="text-sm font-bold text-slate-900 truncate">
                        {template.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {template?.updated_at
                          ? `Updated ${new Date(template.updated_at).toLocaleDateString()}`
                          : ""}
                      </div>
                      {selectedTemplate === template.id && (
                        <div className="mt-2 text-[11px] font-bold text-blue-700">
                          Selected
                        </div>
                      )}
                    </div>
                    <div className="h-28 bg-slate-50 border-t border-slate-100" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Data Validation
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Review your mapped data before issuing certificates.
                  </p>
                </div>
                <div className="text-xs font-bold text-slate-600">
                  Validation progress:{" "}
                  <span className="text-blue-700">
                    {isNaN(validationSummary.validPercent)
                      ? 0
                      : validationSummary.validPercent}
                    %
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-slate-500">Records</div>
                    <div className="text-xl font-extrabold text-slate-900">
                      {mappedRows.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Invalid rows</div>
                    <div
                      className={`text-xl font-extrabold ${
                        validationSummary.invalidCount > 0
                          ? "text-rose-700"
                          : "text-emerald-700"
                      }`}
                    >
                      {validationSummary.invalidCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Template</div>
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {templates.find((t) => t.id === selectedTemplate)?.name ||
                        ""}
                    </div>
                  </div>
                </div>

                {validationSummary.invalidCount > 0 && (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    Some rows are missing required fields:
                    <div className="mt-2 text-xs font-semibold">
                      {requiredFields.map((f) => (
                        <div key={f}>
                          {f}: {validationSummary.missingByField?.[f] || 0}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-500 tracking-widest uppercase">
                    Preview (first 20 rows)
                  </div>
                </div>
                <div className="overflow-auto min-w-80">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-white sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">
                          #
                        </th>
                        {requiredFields.map((f) => (
                          <th
                            key={f}
                            className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest"
                          >
                            {f}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                      {mappedRows.slice(0, 20).map((row, i) => (
                        <tr key={i}>
                          <td className="px-6 py-4 text-xs text-slate-500">
                            {i + 1}
                          </td>
                          {requiredFields.map((f) => {
                            const v = row?.[f];
                            const ok =
                              v !== undefined &&
                              v !== null &&
                              String(v).trim() !== "";
                            return (
                              <td
                                key={f}
                                className={`px-6 py-4 text-sm ${
                                  ok
                                    ? "text-slate-800"
                                    : "text-rose-700 font-bold"
                                }`}
                              >
                                {ok ? String(v) : "Missing"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={activeStep === 1 || issuing}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <ChevronLeft size={16} />
            Back
          </button>

          <div className="flex items-center gap-3">
            {activeStep < 4 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={issuing}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-50"
              >
                Next
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleIssue}
                disabled={issuing || validationSummary.invalidCount > 0}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-50"
              >
                {issuing ? "Issuing..." : "Process & Validate"}
                <Upload size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
