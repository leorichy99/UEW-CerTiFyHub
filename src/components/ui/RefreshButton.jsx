import { RefreshCw } from "lucide-react";

/**
 * RefreshButton — consistent refresh affordance across dashboards.
 */
export default function RefreshButton({
  onClick,
  spinning = false,
  size = 18,
  className = "",
  title = "Refresh data",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={spinning}
      aria-label={title}
      title={title}
      className={`rounded-lg border border-slate-200 p-2.5 text-slate-500 shadow-sm transition-colors duration-200 hover:bg-slate-50 disabled:opacity-60 ${className}`}
    >
      <RefreshCw size={size} className={spinning ? "animate-spin" : ""} />
    </button>
  );
}
