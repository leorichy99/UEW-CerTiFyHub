import React from "react";

const paletteMap = {
  neutral: {
    solid: "bg-slate-800 text-white border-slate-800",
    muted: "bg-white text-slate-700 border-slate-200",
    chipMuted: "bg-slate-100 text-slate-600",
  },
  positive: {
    solid: "bg-emerald-600 text-white border-emerald-600",
    muted: "bg-white text-emerald-700 border-emerald-100",
    chipMuted: "bg-emerald-50 text-emerald-600",
  },
  negative: {
    solid: "bg-red-600 text-white border-red-600",
    muted: "bg-white text-red-700 border-red-100",
    chipMuted: "bg-red-50 text-red-600",
  },
  warning: {
    solid: "bg-amber-500 text-white border-amber-500",
    muted: "bg-white text-amber-700 border-amber-100",
    chipMuted: "bg-amber-50 text-amber-600",
  },
  info: {
    solid: "bg-blue-600 text-white border-blue-600",
    muted: "bg-white text-blue-700 border-blue-100",
    chipMuted: "bg-blue-50 text-blue-600",
  },
};

export default function QuickActionCard({
  title,
  description,
  Icon,
  tone = "neutral",
  variant = "solid",
  onClick,
  className = "",
}) {
  const palette = paletteMap[tone] || paletteMap.neutral;
  const isSolid = variant === "solid";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-start gap-3 rounded-xl border px-5 py-4 text-left shadow-sm transition-all duration-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 ${isSolid ? palette.solid : palette.muted} ${className}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-105 ${isSolid ? "bg-white/15 text-white" : palette.chipMuted}`}
      >
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        {description ? (
          <p className={`mt-1 text-xs leading-5 ${isSolid ? "text-white/80" : "text-slate-500"}`}>
            {description}
          </p>
        ) : null}
      </div>
    </button>
  );
}
