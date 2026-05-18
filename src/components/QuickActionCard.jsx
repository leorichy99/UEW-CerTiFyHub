import React from "react";

const paletteMap = {
  neutral: {
    solid: "bg-slate-800 text-white border-slate-800",
    muted: "bg-white text-slate-700 border-slate-200",
    iconGhost: "text-white/10",
    iconSolid: "text-white/90",
    iconMuted: "text-slate-400/20",
    shadowSolid: "hover:shadow-md",
    shadowMuted: "hover:shadow-sm",
  },
  positive: {
    solid: "bg-emerald-600 text-white border-emerald-600",
    muted: "bg-white text-emerald-700 border-emerald-100",
    iconGhost: "text-white/10",
    iconSolid: "text-white/90",
    iconMuted: "text-emerald-600/20",
    shadowSolid: "hover:shadow-md",
    shadowMuted: "hover:shadow-sm",
  },
  negative: {
    solid: "bg-red-600 text-white border-red-600",
    muted: "bg-white text-red-700 border-red-100",
    iconGhost: "text-white/10",
    iconSolid: "text-white/90",
    iconMuted: "text-red-600/20",
    shadowSolid: "hover:shadow-md",
    shadowMuted: "hover:shadow-sm",
  },
  warning: {
    solid: "bg-amber-500 text-white border-amber-500",
    muted: "bg-white text-amber-700 border-amber-100",
    iconGhost: "text-white/10",
    iconSolid: "text-white/90",
    iconMuted: "text-amber-600/20",
    shadowSolid: "hover:shadow-md",
    shadowMuted: "hover:shadow-sm",
  },
  info: {
    solid: "bg-blue-600 text-white border-blue-600",
    muted: "bg-white text-blue-700 border-blue-100",
    iconGhost: "text-white/10",
    iconSolid: "text-white/90",
    iconMuted: "text-blue-600/20",
    shadowSolid: "hover:shadow-md",
    shadowMuted: "hover:shadow-sm",
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
      className={`group relative overflow-hidden rounded-2xl border px-5 py-4 text-left transition-all duration-300 ${isSolid ? palette.solid : palette.muted} ${isSolid ? palette.shadowSolid : palette.shadowMuted} ${className}`}
    >
      <Icon className={`pointer-events-none absolute -right-3 -bottom-3 h-20 w-20 rotate-[-18deg] transition-transform duration-300 group-hover:scale-110 ${isSolid ? palette.iconGhost : palette.iconMuted}`} strokeWidth={1.6} />
      <div className="relative z-10 flex min-h-18 flex-col justify-center">
        <p className="text-base font-extrabold leading-tight">{title}</p>
        {description ? (
          <p className={`mt-1 text-xs leading-5 ${isSolid ? "text-white/80" : "text-slate-500"}`}>
            {description}
          </p>
        ) : null}
      </div>
    </button>
  );
}
