import { Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export default function Step4Upload({
  importBatchId,
  progress,
  error,
  onComplete,
}) {
  const isComplete = progress?.complete;
  const isFailed = progress?.status === "FAILED";


  const percent = progress?.percent || 0;

  return (
    <div className="space-y-6 py-4">
      {!isComplete && !isFailed && (
        <>
          <div className="text-center">
            <Loader2 className="animate-spin mx-auto text-blue-600 mb-3" size={32} />
            <p className="text-base font-medium text-slate-800">
              Importing student records…
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Import batch #{importBatchId?.slice(0, 8)}
            </p>
          </div>

          <div className="space-y-2">
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>{percent}%</span>
              <span>
                {progress?.processed ?? 0} / {progress?.total ?? 0} rows
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-lg font-semibold text-slate-800">
                {progress?.processed ?? 0}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">
                Processed
              </div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3">
              <div className="text-lg font-semibold text-emerald-700">
                {progress?.valid ?? 0}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-emerald-600">
                Valid
              </div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="text-lg font-semibold text-amber-700">
                {progress?.skipped ?? 0}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-amber-600">
                Skipped
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-lg font-semibold text-red-700">
                {progress?.errors ?? 0}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-red-600">
                Errors
              </div>
            </div>
          </div>
        </>
      )}

      {isComplete && !isFailed && (
        <div className="text-center space-y-3">
          <CheckCircle2 className="mx-auto text-emerald-600" size={40} />
          <p className="text-base font-medium text-slate-800">Import complete</p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="font-semibold text-slate-800">{progress?.total_rows ?? progress?.total ?? 0}</div>
              <div className="text-xs text-slate-500">Total processed</div>
            </div>
            <div>
              <div className="font-semibold text-emerald-700">{progress?.success_count ?? progress?.valid ?? 0}</div>
              <div className="text-xs text-slate-500">Successfully imported</div>
            </div>
            <div>
              <div className="font-semibold text-amber-700">{progress?.skipped_count ?? progress?.skipped ?? 0}</div>
              <div className="text-xs text-slate-500">Skipped (issues)</div>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Click Finish to return to the imports list.
          </p>
        </div>
      )}

      {isFailed && (
        <div className="text-center space-y-3">
          <XCircle className="mx-auto text-red-600" size={40} />
          <p className="text-base font-medium text-slate-800">Import failed</p>
          <p className="text-sm text-slate-600">
            The import could not be completed due to a system error.
          </p>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded p-2">{error}</p>
          )}
          <p className="text-xs text-slate-500">
            Click Finish to return to the imports list.
          </p>
        </div>
      )}
    </div>
  );
}
