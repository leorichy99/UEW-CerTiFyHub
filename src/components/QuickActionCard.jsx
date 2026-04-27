import React from "react";

const paletteMap = {
  brand: {
    solid: "bg-[var(--color-brand-dark)] text-white border-[var(--color-brand-dark)]",
    muted: "bg-white text-[var(--color-brand-dark)] border-white/70",
    iconGhost: "text-white/10",
    iconSolid: "text-white/90",
    iconMuted: "text-[var(--color-brand-dark)]/25",
    shadowSolid: "hover:shadow-[0_22px_40px_-18px_rgba(27,28,94,0.7)]",
    shadowMuted: "hover:shadow-[0_18px_34px_-18px_rgba(27,28,94,0.28)]",
  },
  blue: {
    solid: "bg-blue-600 text-white border-blue-600",
    muted: "bg-white text-blue-700 border-blue-100",
    iconGhost: "text-white/10",
    iconSolid: "text-white/90",
    iconMuted: "text-blue-600/20",
    shadowSolid: "hover:shadow-[0_22px_40px_-18px_rgba(37,99,235,0.55)]",
    shadowMuted: "hover:shadow-[0_18px_34px_-18px_rgba(37,99,235,0.26)]",
  },
  emerald: {
    solid: "bg-emerald-600 text-white border-emerald-600",
    muted: "bg-white text-emerald-700 border-emerald-100",
    iconGhost: "text-white/10",
    iconSolid: "text-white/90",
    iconMuted: "text-emerald-600/20",
    shadowSolid: "hover:shadow-[0_22px_40px_-18px_rgba(5,150,105,0.55)]",
    shadowMuted: "hover:shadow-[0_18px_34px_-18px_rgba(5,150,105,0.26)]",
  },
  violet: {
    solid: "bg-violet-600 text-white border-violet-600",
    muted: "bg-white text-violet-700 border-violet-100",
    iconGhost: "text-white/10",
    iconSolid: "text-white/90",
    iconMuted: "text-violet-600/20",
    shadowSolid: "hover:shadow-[0_22px_40px_-18px_rgba(139,92,246,0.55)]",
    shadowMuted: "hover:shadow-[0_18px_34px_-18px_rgba(139,92,246,0.26)]",
  },
  amber: {
    solid: "bg-amber-500 text-white border-amber-500",
    muted: "bg-white text-amber-700 border-amber-100",
    iconGhost: "text-white/10",
    iconSolid: "text-white/90",
    iconMuted: "text-amber-600/20",
    shadowSolid: "hover:shadow-[0_22px_40px_-18px_rgba(245,158,11,0.55)]",
    shadowMuted: "hover:shadow-[0_18px_34px_-18px_rgba(245,158,11,0.26)]",
  },
};

export default function QuickActionCard({
  title,
  description,
  Icon,
  tone = "brand",
  variant = "solid",
  onClick,
  className = "",
}) {
  const palette = paletteMap[tone] || paletteMap.brand;
  const isSolid = variant === "solid";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[1.35rem] border px-5 py-4 text-left transition-all duration-300 ${isSolid ? palette.solid : palette.muted} ${isSolid ? palette.shadowSolid : palette.shadowMuted} hover:-translate-y-0.5 ${className}`}
    >
      <Icon className={`pointer-events-none absolute -right-3 -bottom-3 h-20 w-20 rotate-[-18deg] transition-transform duration-300 group-hover:scale-110 ${isSolid ? palette.iconGhost : palette.iconMuted}`} strokeWidth={1.6} />
      <div className="relative z-10 flex min-h-18 flex-col justify-center">
        <p className="text-base font-bold leading-tight">{title}</p>
        {description ? (
          <p className={`mt-1 text-xs leading-5 ${isSolid ? "text-white/80" : "text-slate-500"}`}>
            {description}
          </p>
        ) : null}
      </div>
    </button>
  );
}
