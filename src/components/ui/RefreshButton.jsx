import { RotateCcw } from "lucide-react";

/**
 * RefreshButton — consistent refresh affordance across dashboards.
 */
export default function RefreshButton({
  onClick,
  spinning = true,
  size = 25,
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
      className={`text-slate-500 transition-colors duration-200 disabled:opacity-60 ${className}`}
    >
      <RotateCcw size={size} className={spinning ? "animate-spin" : ""} />
    </button>
  );
}
