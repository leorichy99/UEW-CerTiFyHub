import { useState, useCallback, useEffect } from "react";
import { Check, ChevronRight, ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useImportWizard } from "../hooks/registry/useImportWizard.js";
import Step1Upload from "./import-steps/Step1Upload.jsx";
import Step2Mapping from "./import-steps/Step2Mapping.jsx";
import Step3Review from "./import-steps/Step3Review.jsx";
import Step4Upload from "./import-steps/Step4Upload.jsx";

const STEPS = [
  { num: 1, label: "Import", desc: "Upload your CSV or Excel file" },
  { num: 2, label: "Mapping", desc: "Match columns to system fields" },
  { num: 3, label: "Review", desc: "Preview and validate records" },
  { num: 4, label: "Upload", desc: "Confirm and start the import" },
];

const STEP_LABELS = ["Import", "Field Mapping", "Review", "Upload"];

function CircularProgress({ value, total }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? value / total : 0;
  const offset = circumference - pct * circumference;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="block">
      <circle
        cx="22" cy="22" r={radius}
        fill="none" stroke="#e2e8f0" strokeWidth="4"
      />
      <circle
        cx="22" cy="22" r={radius}
        fill="none" stroke="#2563eb" strokeWidth="4"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
      <text
        x="22" y="22" textAnchor="middle" dominantBaseline="central"
        className="text-[9px] font-semibold fill-slate-700"
      >
        {value}/{total}
      </text>
    </svg>
  );
}

export default function ImportWizard({ batchId, onBack, onComplete }) {
  const wizard = useImportWizard(batchId);
  const [tempFileId, setTempFileId] = useState(null);
  const [stepError, setStepError] = useState("");
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    wizard.reset();
    setTempFileId(null);
    setStepError("");
    setDirection(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = useCallback(async () => {
    setStepError("");
    setDirection(1);

    if (wizard.currentStep === 1) {
      try {
        const id = await wizard.uploadTempFile();
        setTempFileId(id);
        wizard.nextStep();
      } catch {
        // error already set in wizard state
      }
      return;
    }

    if (wizard.currentStep === 2) {
      if (!wizard.validateMapping()) return;
      wizard.nextStep();
      wizard.loadPreview(tempFileId).catch(() => {});
      return;
    }

    if (wizard.currentStep === 3) {
      wizard.nextStep();
      try {
        await wizard.startImport(tempFileId);
      } catch (e) {
        setStepError(e?.response?.data?.detail || "Import failed to start.");
      }
      return;
    }

    if (wizard.currentStep === 4) {
      onComplete?.();
    }
  }, [wizard, tempFileId, onComplete]);

  const handlePrev = useCallback(() => {
    setStepError("");
    setDirection(-1);
    wizard.prevStep();
  }, [wizard]);

  const currentStepIndex = wizard.currentStep - 1;
  const prevLabel = currentStepIndex > 0 ? STEPS[currentStepIndex - 1].label : null;
  const nextLabel = currentStepIndex < STEPS.length - 1 ? STEPS[currentStepIndex + 1].label : "Finish";

  const canGoNext = () => {
    if (wizard.currentStep === 1) {
      return !!wizard.file && wizard.parsedColumns.length > 0 && !wizard.parseError;
    }
    if (wizard.currentStep === 2) {
      const allRequiredMapped = [
        "index_number", "first_name", "last_name", "institutional_email",
        "programme", "class_of_degree", "date_of_completion",
      ].every((f) => !!wizard.mapping[f]);
      const dupes = Object.values(wizard.mapping).filter(Boolean);
      const hasDupes = dupes.length !== new Set(dupes).size;
      return allRequiredMapped && !hasDupes;
    }
    if (wizard.currentStep === 3) {
      const hasIssues = wizard.preview?.issues?.length > 0;
      return !hasIssues || wizard.skipInvalid;
    }
    if (wizard.currentStep === 4) {
      return wizard.progress?.complete || wizard.progress?.status === "FAILED";
    }
    return false;
  };

  const variants = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 24 : -24 }),
    center: { opacity: 1, x: 0 },
    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -24 : 24 }),
  };

  return (
    <div className="h-screen flex bg-white">
      {/* Left sidebar */}
      <div className="w-[200px] flex flex-col border-r border-slate-200 bg-white shrink-0">
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">
            Import Student Records
          </h2>
        </div>
        <div className="flex-1 flex flex-col gap-4 p-6">
          {STEPS.map((step) => {
            const isCompleted = wizard.currentStep > step.num;
            const isCurrent = wizard.currentStep === step.num;
            return (
              <div key={step.num} className="flex items-start gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 mt-0.5 transition-colors ${
                    isCompleted
                      ? "bg-blue-600 text-white"
                      : isCurrent
                      ? "bg-blue-100 text-blue-700 ring-2 ring-blue-500"
                      : "bg-slate-100 text-slate-400 ring-2 ring-slate-200"
                  }`}
                >
                  {isCompleted ? <Check size={12} /> : step.num}
                </div>
                <div className="flex flex-col">
                  <span
                    className={`text-sm font-semibold ${
                      isCurrent ? "text-blue-700" : "text-slate-700"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="text-xs text-slate-500 leading-snug">
                    {step.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-6 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-slate-500 hover:text-slate-700 transition underline-offset-2 hover:underline"
          >
            Cancel
          </button>
          <CircularProgress value={wizard.currentStep} total={STEPS.length} />
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: 'var(--color-bg-page)' }}>
        {/* Content */}
        <div className="flex-1 overflow-auto px-8 py-6">
          {stepError && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              {stepError}
            </div>
          )}

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={wizard.currentStep}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              {wizard.currentStep === 1 && (
                <Step1Upload
                  file={wizard.file}
                  columns={wizard.parsedColumns}
                  rowCount={wizard.rowCount}
                  error={wizard.parseError}
                  onFileSelect={wizard.parseFile}
                />
              )}

              {wizard.currentStep === 2 && (
                <Step2Mapping
                  columns={wizard.parsedColumns}
                  mapping={wizard.mapping}
                  onUpdateMapping={wizard.updateMapping}
                  error={wizard.mappingError}
                />
              )}

              {wizard.currentStep === 3 && (
                <Step3Review
                  preview={wizard.preview}
                  loading={wizard.previewLoading}
                  skipInvalid={wizard.skipInvalid}
                  onToggleSkipInvalid={wizard.setSkipInvalid}
                />
              )}

              {wizard.currentStep === 4 && (
                <Step4Upload
                  importBatchId={wizard.importBatchId}
                  progress={wizard.progress}
                  error={wizard.sseError || stepError}
                  onComplete={onComplete}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div>
            {prevLabel && (
              <button
                type="button"
                onClick={handlePrev}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 transition"
              >
                <ArrowLeft size={14} />
                Previous: {prevLabel}
              </button>
            )}
          </div>
          <button
            type="button"
            disabled={!canGoNext()}
            onClick={handleNext}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition"
          >
            {wizard.currentStep === 4 ? "Finish" : `Next: ${nextLabel}`}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
