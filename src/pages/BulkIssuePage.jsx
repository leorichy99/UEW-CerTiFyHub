import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/ToastContainer";
import { templateAPI, studentAPI, certificateAPI } from "../services/api";
import { useDropzone } from "react-dropzone";
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
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchPaused, setBatchPaused] = useState(false);
  const [batchComplete, setBatchComplete] = useState(false);
  const [batchStats, setBatchStats] = useState({
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
  });
  const [activityFeed, setActivityFeed] = useState([]);
  const [previewPdfUrl, setPreviewPdfUrl] = useState("");
  const batchStartRef = useRef(0);
  const pauseRef = useRef(false);
  const cancelRef = useRef(false);
  const xlsxRef = useRef(null);
  const xlsxPromiseRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();

  const loadXLSX = async () => {
    if (xlsxRef.current) return xlsxRef.current;
    if (!xlsxPromiseRef.current) {
      xlsxPromiseRef.current = import("xlsx").then((mod) => {
        xlsxRef.current = mod;
        return mod;
      });
    }
    return xlsxPromiseRef.current;
  };

  useEffect(() => {
    return () => {
      if (previewPdfUrl) window.URL.revokeObjectURL(previewPdfUrl);
    };
  }, [previewPdfUrl]);

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

  const normalizeStudentRow = (row) => {
    const next = { ...(row || {}) };
    for (const k of Object.keys(next)) {
      const v = next[k];
      if (typeof v === "string") next[k] = v.trim();
    }
    if (typeof next.email === "string") next.email = next.email.trim().toLowerCase();
    if (typeof next.student_id === "string") next.student_id = next.student_id.trim();
    if (typeof next.full_name === "string") next.full_name = next.full_name.trim();
    if (typeof next.program === "string") next.program = next.program.trim();
    return next;
  };

  const findDuplicateValues = (rows, key) => {
    const counts = new Map();
    for (const r of rows) {
      const raw = r?.[key];
      let v = raw === undefined || raw === null ? "" : String(raw).trim();
      if (key === "email") v = v.toLowerCase();
      if (!v) continue;
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    return Array.from(counts.entries())
      .filter(([, c]) => c > 1)
      .map(([v, c]) => ({ value: v, count: c }));
  };

  const findDuplicateIndices = (rows, key) => {
    const idxByVal = new Map();
    for (let i = 0; i < rows.length; i += 1) {
      const raw = rows[i]?.[key];
      let v = raw === undefined || raw === null ? "" : String(raw).trim();
      if (key === "email") v = v.toLowerCase();
      if (!v) continue;
      const list = idxByVal.get(v) || [];
      list.push(i);
      idxByVal.set(v, list);
    }
    return Array.from(idxByVal.entries())
      .filter(([, idxs]) => idxs.length > 1)
      .map(([value, idxs]) => ({ value, idxs }));
  };

  const dedupeRowsKeepFirst = (rows, keys) => {
    const seenByKey = new Map();
    for (const k of keys) seenByKey.set(k, new Set());

    const out = [];
    const removed = [];

    for (let i = 0; i < rows.length; i += 1) {
      const r = rows[i];

      let isDuplicate = false;
      for (const k of keys) {
        const raw = r?.[k];
        let v = raw === undefined || raw === null ? "" : String(raw).trim();
        if (!v) continue;
        if (k === "email") v = v.toLowerCase();

        const seenSet = seenByKey.get(k);
        if (seenSet?.has(v)) {
          isDuplicate = true;
          break;
        }
      }

      if (isDuplicate) {
        removed.push({ index: i, row: r });
        continue;
      }

      // mark as seen only when we keep the row
      for (const k of keys) {
        const raw = r?.[k];
        let v = raw === undefined || raw === null ? "" : String(raw).trim();
        if (!v) continue;
        if (k === "email") v = v.toLowerCase();
        seenByKey.get(k)?.add(v);
      }

      out.push(r);
    }

    return { rows: out, removed };
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const formatSeconds = (secs) => {
    const s = Math.max(0, Math.floor(secs || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    if (h > 0) return `${h}h ${m}m ${r}s`;
    if (m > 0) return `${m}m ${r}s`;
    return `${r}s`;
  };

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
    reader.onload = async (e) => {
      try {
        const XLSX = await loadXLSX();
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
        toast.error("Failed to read spreadsheet. Please upload a valid Excel file.");
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
      const parsed = xlsxRef.current?.SSF?.parse_date_code?.(value);
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

      return normalizeStudentRow(mapped);
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

  const duplicateSummary = (() => {
    const rows = (mappedRows || []).map(normalizeStudentRow);
    if (!rows || rows.length === 0) return { emails: [], studentIds: [], totalDupRows: 0 };

    const emails = findDuplicateIndices(rows, "email");
    const studentIds = findDuplicateIndices(rows, "student_id");

    const dupRowIdx = new Set();
    for (const d of emails) for (const idx of d.idxs) dupRowIdx.add(idx);
    for (const d of studentIds) for (const idx of d.idxs) dupRowIdx.add(idx);

    return { emails, studentIds, totalDupRows: dupRowIdx.size };
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
        toast.error("Please upload your records file.");
        return;
      }
      setActiveStep(2);
      return;
    }
    if (activeStep === 2) {
      if (!canGoToStep3) {
        const missing = missingRequiredFields.map(fieldLabel);
        toast.error(
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
        toast.error("Please choose a template.");
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
      toast.error("Please choose a template.");
      return;
    }
    if (!mappedRows || mappedRows.length === 0) {
      toast.error("Please upload and map your records.");
      return;
    }
    if (validationSummary.invalidCount > 0) {
      toast.error(
        "Some records are missing required fields. Please fix the mapping or the file and try again.",
      );
      return;
    }

    const normalizedRows = mappedRows.map(normalizeStudentRow);
    const dupStudentIds = findDuplicateValues(normalizedRows, "student_id");
    const dupEmails = findDuplicateValues(normalizedRows, "email");
    if (dupStudentIds.length > 0 || dupEmails.length > 0) {
      const parts = [];
      if (dupStudentIds.length > 0) {
        parts.push(
          `Duplicate University ID(s) found in the file: ${dupStudentIds
            .slice(0, 4)
            .map((d) => d.value)
            .join(", ")}${dupStudentIds.length > 4 ? "..." : ""}`,
        );
      }
      if (dupEmails.length > 0) {
        parts.push(
          `Duplicate email(s) found in the file: ${dupEmails
            .slice(0, 4)
            .map((d) => d.value)
            .join(", ")}${dupEmails.length > 4 ? "..." : ""}`,
        );
      }
      toast.error(`${parts.join("\n")}\nRemove duplicates in Data Validation to continue.`);
      return;
    }

    setIssuing(true);
    setBatchComplete(false);
    setBatchPaused(false);
    pauseRef.current = false;
    cancelRef.current = false;
    setActivityFeed([]);
    setBatchStats({ total: normalizedRows.length, processed: 0, success: 0, failed: 0 });
    batchStartRef.current = Date.now();
    setBatchOpen(true);
    try {
      const studentsRes = await studentAPI.bulkCreate(normalizedRows);
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

      const studentByEmail = new Map();
      const studentByStudentId = new Map();
      for (const s of createdStudents) {
        const sid = s?.student_id ? String(s.student_id).trim() : "";
        const em = s?.email ? String(s.email).trim().toLowerCase() : "";
        if (sid) studentByStudentId.set(sid, s);
        if (em) studentByEmail.set(em, s);
      }

      const issuedIds = [];
      for (let i = 0; i < normalizedRows.length; i += 1) {
        if (cancelRef.current) {
          setActivityFeed((prev) => [
            { type: "info", label: "Batch canceled", at: Date.now() },
            ...prev,
          ]);
          break;
        }

        while (pauseRef.current) {
          await sleep(150);
          if (cancelRef.current) break;
        }
        if (cancelRef.current) break;

        const row = normalizedRows[i];
        const rowEmail = row?.email ? String(row.email).trim().toLowerCase() : "";
        const rowSid = row?.student_id ? String(row.student_id).trim() : "";
        const student =
          (rowEmail && studentByEmail.get(rowEmail)) ||
          (rowSid && studentByStudentId.get(rowSid));

        const studentId = student?.id;
        try {
          if (!studentId) throw new Error("Student not found after import");
          const certRes = await certificateAPI.create({
            student: studentId,
            template: selectedTemplate,
            status: "ISSUED",
            student_name: row?.full_name || student?.full_name || "",
            degree_type: "BSC",
            honors: "PASS",
            program: row?.program || student?.program || "",
            date_awarded: dateAwarded || row?.graduation_date,
          });

          const cert = certRes?.data;
          if (cert?.id) issuedIds.push(cert.id);

          setBatchStats((prev) => ({
            ...prev,
            processed: prev.processed + 1,
            success: prev.success + 1,
          }));

          setActivityFeed((prev) => [
            {
              type: "success",
              label: `Generated: ${cert?.student_name || row?.full_name || "Student"}`,
              at: Date.now(),
            },
            ...prev,
          ]);

          if (cert?.id) {
            try {
              const pdfRes = await certificateAPI.download(cert.id);
              const blob = new Blob([pdfRes.data], { type: "application/pdf" });
              const url = window.URL.createObjectURL(blob);
              setPreviewPdfUrl((prevUrl) => {
                if (prevUrl) window.URL.revokeObjectURL(prevUrl);
                return url;
              });
            } catch (e) {
              setActivityFeed((prev) => [
                {
                  type: "warn",
                  label: `Preview failed: ${cert?.student_name || row?.full_name || "Student"}`,
                  at: Date.now(),
                },
                ...prev,
              ]);
            }
          }
        } catch (e) {
          console.error("Failed issuing certificate row", i, e);
          setBatchStats((prev) => ({
            ...prev,
            processed: prev.processed + 1,
            failed: prev.failed + 1,
          }));
          setActivityFeed((prev) => [
            {
              type: "error",
              label: `Failed: ${row?.full_name || "Student"}`,
              at: Date.now(),
            },
            ...prev,
          ]);
        }
      }

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

      setBatchComplete(true);

      toast.success("Bulk issuance complete!");
      navigate("/certificates");
    } catch (err) {
      console.error("Issuance failed:", err);
      const details = err?.response?.data;
      const rawMessage =
        (typeof details === "string" && details) ||
        details?.error ||
        details?.detail ||
        (details ? JSON.stringify(details) : "");

      const isIntegrity = /IntegrityError/i.test(String(rawMessage || ""));
      const isUnique = /UNIQUE|unique constraint/i.test(String(rawMessage || ""));
      const message =
        isIntegrity || isUnique
          ? "Student creation failed due to duplicate data (University ID/email already exists or duplicates are in the uploaded file). Please remove duplicates and try again."
          : rawMessage;
      toast.error(
        message
          ? `Failed to issue certificates. ${message}`
          : "Failed to issue certificates.",
      );
    } finally {
      setIssuing(false);
    }
  };

  const liveStats = useMemo(() => {
    const elapsed = (Date.now() - (batchStartRef.current || 0)) / 1000;
    const processed = batchStats.processed || 0;
    const total = batchStats.total || 0;
    const ratePerMin = elapsed > 0 ? (processed / elapsed) * 60 : 0;
    const remaining = Math.max(0, total - processed);
    const etaSecs = ratePerMin > 0 ? (remaining / ratePerMin) * 60 : 0;
    const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
    return {
      elapsedSecs: elapsed,
      ratePerMin,
      remaining,
      etaSecs,
      pct,
    };
  }, [batchStats]);

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
      {batchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              if (!issuing) setBatchOpen(false);
            }}
          />

          <div className="relative w-full max-w-6xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 bg-white">
              <div>
                <div className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                  Batch Processing
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {batchComplete
                    ? "Batch complete"
                    : batchPaused
                      ? "Paused"
                      : issuing
                        ? "Processing batch..."
                        : "Ready"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!issuing) {
                      setBatchOpen(false);
                      return;
                    }
                    const next = !pauseRef.current;
                    pauseRef.current = next;
                    setBatchPaused(next);
                    setActivityFeed((prev) => [
                      {
                        type: "info",
                        label: next ? "Paused batch" : "Resumed batch",
                        at: Date.now(),
                      },
                      ...prev,
                    ]);
                  }}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {batchPaused ? "Resume" : "Pause"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!issuing) return;
                    cancelRef.current = true;
                    pauseRef.current = false;
                    setBatchPaused(false);
                  }}
                  className="h-9 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  disabled={!issuing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!issuing) setBatchOpen(false);
                  }}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={issuing}
                  title={issuing ? "Wait for completion or cancel" : "Close"}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
              <div className="lg:col-span-2 border-b lg:border-b-0 lg:border-r border-slate-200">
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                            Progress
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-700">
                            {batchStats.processed} of {batchStats.total} processed
                          </div>
                        </div>

                        <div className="relative h-20 w-20">
                          <svg viewBox="0 0 36 36" className="h-20 w-20">
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#E2E8F0"
                              strokeWidth="3"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#1D4ED8"
                              strokeWidth="3"
                              strokeDasharray={`${liveStats.pct}, 100`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-sm font-extrabold text-slate-900">
                              {liveStats.pct}%
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-blue-700"
                          style={{ width: `${liveStats.pct}%` }}
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <div>
                          <div className="text-[11px] text-slate-500">Success</div>
                          <div className="text-sm font-extrabold text-emerald-700">
                            {batchStats.success}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500">Failed</div>
                          <div className="text-sm font-extrabold text-rose-700">
                            {batchStats.failed}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500">Rate</div>
                          <div className="text-sm font-extrabold text-slate-900">
                            {Math.round(liveStats.ratePerMin || 0)}/min
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                        ETA Remaining
                      </div>
                      <div className="mt-2 text-3xl font-extrabold text-slate-900">
                        {issuing && batchStats.processed > 0
                          ? formatSeconds(liveStats.etaSecs)
                          : "--"}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Elapsed: {formatSeconds(liveStats.elapsedSecs)}
                      </div>
                      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                        Live Certificate Generation Preview updates after each successful generation.
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                      <div className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                        Live Certificate Generation Preview
                      </div>
                      <div className="text-[11px] font-bold text-emerald-700">
                        {issuing ? "LIVE" : batchComplete ? "DONE" : ""}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4">
                      {previewPdfUrl ? (
                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                          <iframe
                            title="Certificate preview"
                            src={previewPdfUrl}
                            className="h-105 w-full"
                          />
                        </div>
                      ) : (
                        <div className="h-105 rounded-xl border border-dashed border-slate-200 bg-white flex items-center justify-center text-sm text-slate-500">
                          Preview will appear here as certificates are generated.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                    Activity Feed
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500">
                    {Math.round(liveStats.ratePerMin || 0)} certs / min
                  </div>
                </div>

                <div className="mt-4 space-y-2 max-h-170 overflow-auto pr-1">
                  {activityFeed.length === 0 ? (
                    <div className="text-sm text-slate-500 rounded-xl border border-slate-200 bg-white p-4">
                      No activity yet.
                    </div>
                  ) : (
                    activityFeed.slice(0, 50).map((item, idx) => (
                      <div
                        key={idx}
                        className={`rounded-xl border bg-white p-3 text-sm ${
                          item.type === "success"
                            ? "border-emerald-200"
                            : item.type === "error"
                              ? "border-rose-200"
                              : item.type === "warn"
                                ? "border-amber-200"
                                : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-semibold text-slate-800">
                            {item.label}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                            {new Date(item.at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

                {duplicateSummary.totalDupRows > 0 && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        Duplicate values detected in your uploaded file. This will cause student creation to fail.
                        <div className="mt-1 text-xs text-amber-800">
                          Duplicated rows: {duplicateSummary.totalDupRows}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={issuing}
                        onClick={() => {
                          const normalized = mappedRows.map(normalizeStudentRow);
                          const { rows: deduped, removed } = dedupeRowsKeepFirst(normalized, ["student_id", "email"]);
                          if (removed.length === 0) {
                            toast.success("No duplicates found.");
                            return;
                          }
                          setMappedRows(deduped);
                          toast.success(`Removed ${removed.length} duplicate row(s) (kept first occurrence).`);
                        }}
                        className="shrink-0 rounded-lg bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
                        title="Remove duplicate rows (keep first)"
                      >
                        Remove duplicates
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 text-xs">
                      {duplicateSummary.emails.length > 0 && (
                        <div>
                          <div className="font-bold text-amber-900">Duplicate emails</div>
                          <div className="mt-1 text-amber-900">
                            {duplicateSummary.emails.slice(0, 4).map((d) => (
                              <div key={d.value}>
                                {d.value} (rows {d.idxs.map((x) => x + 1).join(", ")})
                              </div>
                            ))}
                            {duplicateSummary.emails.length > 4 && <div>...</div>}
                          </div>
                        </div>
                      )}

                      {duplicateSummary.studentIds.length > 0 && (
                        <div>
                          <div className="font-bold text-amber-900">Duplicate University IDs</div>
                          <div className="mt-1 text-amber-900">
                            {duplicateSummary.studentIds.slice(0, 4).map((d) => (
                              <div key={d.value}>
                                {d.value} (rows {d.idxs.map((x) => x + 1).join(", ")})
                              </div>
                            ))}
                            {duplicateSummary.studentIds.length > 4 && <div>...</div>}
                          </div>
                        </div>
                      )}
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
