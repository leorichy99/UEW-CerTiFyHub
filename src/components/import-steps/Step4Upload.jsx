import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function Step4Upload({
  importBatchId,
  progress,
  error,
}) {
  const isComplete = progress?.complete;
  const isFailed = progress?.status === "FAILED";
  const percent = progress?.percent || 0;

  const total = progress?.total_rows ?? progress?.total ?? 0;
  const processed = progress?.processed ?? 0;
  const valid = progress?.success_count ?? progress?.valid ?? 0;
  const skipped = progress?.skipped_count ?? progress?.skipped ?? 0;
  const errors = progress?.errors ?? 0;

  const StatCard = ({ value, label, tone }) => {
    const toneMap = {
      neutral: { bg: "bg-slate-50", text: "text-slate-700", labelText: "text-slate-500" },
      success: { bg: "bg-emerald-50", text: "text-emerald-700", labelText: "text-emerald-600" },
      warning: { bg: "bg-amber-50", text: "text-amber-700", labelText: "text-amber-600" },
      danger:  { bg: "bg-red-50",    text: "text-red-700",    labelText: "text-red-600" },
    };
    const t = toneMap[tone] || toneMap.neutral;
    return (
      <div className={`${t.bg} rounded-lg p-3 text-center`}>
        <div className={`text-lg font-semibold ${t.text}`}>{value}</div>
        <div className={`text-[10px] uppercase tracking-wide ${t.labelText}`}>{label}</div>
      </div>
    );
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 py-8">
      {/* ── Loading state ── */}
      {!isComplete && !isFailed && (
        <div className="space-y-5">
          <div className="text-center space-y-2">
            <Loader2 className="animate-spin mx-auto text-blue-600" size={36} />
            <p className="text-base font-medium text-slate-800">Importing student records…</p>
            <p className="text-sm text-slate-500">Please do not close this window.</p>
          </div>

          <div className="space-y-2">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>{percent}%</span>
              <span>{processed} / {total} rows</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <StatCard value={processed} label="Processed" tone="neutral" />
            <StatCard value={valid} label="Valid" tone="success" />
            <StatCard value={skipped} label="Skipped" tone="warning" />
            <StatCard value={errors} label="Errors" tone="danger" />
          </div>
        </div>
      )}

      {/* ── Complete state ── */}
      {isComplete && !isFailed && (
        <div className="space-y-5 text-center">
          <div className="space-y-2">
            <CheckCircle2 className="mx-auto text-emerald-600" size={40} />
            <p className="text-base font-medium text-slate-800">Import complete</p>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <StatCard value={total} label="Total" tone="neutral" />
            <StatCard value={valid} label="Imported" tone="success" />
            <StatCard value={skipped} label="Skipped" tone="warning" />
            <StatCard value={errors} label="Errors" tone="danger" />
          </div>
        </div>
      )}

      {/* ── Failed state ── */}
      {isFailed && (
        <div className="space-y-4 text-center">
          <div className="space-y-2">
            <XCircle className="mx-auto text-red-600" size={40} />
            <p className="text-base font-medium text-slate-800">Import failed</p>
          </div>
          <p className="text-sm text-slate-600 max-w-sm mx-auto">
            The import could not be completed. Please check the error details and try again.
          </p>
          {error && (
            <div className="text-left max-w-sm mx-auto">
              <p className="text-xs font-medium text-red-700 mb-1">Error details</p>
              <p className="text-xs text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
