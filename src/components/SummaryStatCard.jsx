import React from "react";
import { ArrowUpRight } from "lucide-react";

const paletteMap = {
  brand: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),rgba(255,255,255,0)_58%)]",
    iconWrap: "bg-white/12 text-white/90",
    iconGhost: "text-white/10",
    trendWrap: "bg-white/12 text-white/90 ring-1 ring-white/10",
    text: "text-white",
    textMuted: "text-white/70",
    border: "border-white/10",
    card: "bg-[var(--color-brand-dark)]",
    hoverShadow: "hover:shadow-[0_24px_50px_-18px_rgba(27,28,94,0.7)]",
  },
  blue: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.18),rgba(37,99,235,0)_58%)]",
    iconWrap: "bg-blue-100 text-blue-600",
    iconGhost: "text-blue-600/10",
    trendWrap: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
    text: "text-slate-900",
    textMuted: "text-slate-500",
    border: "border-slate-200",
    card: "bg-white",
    hoverShadow: "hover:shadow-[0_24px_50px_-18px_rgba(37,99,235,0.28)] hover:bg-[var(--color-brand-dark)] hover:text-white",
  },
  emerald: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(5,150,105,0.2),rgba(5,150,105,0)_58%)]",
    iconWrap: "bg-emerald-100 text-emerald-600",
    iconGhost: "text-emerald-600/10",
    trendWrap: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    text: "text-slate-900",
    textMuted: "text-slate-500",
    border: "border-slate-200",
    card: "bg-white",
    hoverShadow: "hover:shadow-[0_24px_50px_-18px_rgba(5,150,105,0.28)] hover:bg-[var(--color-brand-dark)] hover:text-white",
  },
  red: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.18),rgba(220,38,38,0)_58%)]",
    iconWrap: "bg-red-100 text-red-500",
    iconGhost: "text-red-500/10",
    trendWrap: "bg-red-50 text-red-700 ring-1 ring-red-100",
    text: "text-slate-900",
    textMuted: "text-slate-500",
    border: "border-slate-200",
    card: "bg-white",
    hoverShadow: "hover:shadow-[0_24px_50px_-18px_rgba(220,38,38,0.28)] hover:bg-[var(--color-brand-dark)] hover:text-white",
  },
  amber: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),rgba(245,158,11,0)_58%)]",
    iconWrap: "bg-amber-100 text-amber-600",
    iconGhost: "text-amber-600/10",
    trendWrap: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
    text: "text-slate-900",
    textMuted: "text-slate-500",
    border: "border-slate-200",
    card: "bg-white",
    hoverShadow: "hover:shadow-[0_24px_50px_-18px_rgba(245,158,11,0.28)] hover:bg-[var(--color-brand-dark)] hover:text-white",
  },
  slate: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(71,85,105,0.18),rgba(71,85,105,0)_58%)]",
    iconWrap: "bg-slate-100 text-slate-600",
    iconGhost: "text-slate-500/10",
    trendWrap: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    text: "text-slate-900",
    textMuted: "text-slate-500",
    border: "border-slate-200",
    card: "bg-white",
    hoverShadow: "hover:shadow-[0_24px_50px_-18px_rgba(71,85,105,0.28)] hover:bg-[var(--color-brand-dark)] hover:text-white",
  },
  violet: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.18),rgba(139,92,246,0)_58%)]",
    iconWrap: "bg-violet-100 text-violet-600",
    iconGhost: "text-violet-600/10",
    trendWrap: "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
    text: "text-slate-900",
    textMuted: "text-slate-500",
    border: "border-slate-200",
    card: "bg-white",
    hoverShadow: "hover:shadow-[0_24px_50px_-18px_rgba(139,92,246,0.28)] hover:bg-[var(--color-brand-dark)] hover:text-white",
  },
};

export default function SummaryStatCard({
  title,
  value,
  Icon,
  tone = "brand",
  trend,
  trendPositive = true,
  subtitle,
  valueSuffix = "",
}) {
  const palette = paletteMap[tone] || paletteMap.brand;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl px-4 py-4 transition-all duration-300 ${palette.card} shadow-[0_16px_38px_-22px_rgba(15,23,42,0.35)] ${palette.hoverShadow}`}
    >
      <div className={`pointer-events-none absolute inset-0 ${palette.glow}`} />
      <Icon className={`pointer-events-none absolute -right-3 -bottom-4 h-28 w-28 rotate-[-18deg] transition-transform duration-300 group-hover:scale-110 ${palette.iconGhost}`} strokeWidth={1.5} />
      <div className="relative z-10 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-lg font-black uppercase ${palette.textMuted} group-hover:text-white/70`}>
              {title}
            </p>
            <p className={`mt-2 text-4xl font-black tracking-tight ${palette.text} group-hover:text-white`}>
              {value}
              {valueSuffix}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {trend ? (
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-300 ${palette.trendWrap} group-hover:bg-white/12 group-hover:text-white group-hover:ring-white/10`}>
              <ArrowUpRight size={12} className={!trendPositive ? "rotate-90" : ""} />
              {trend}
            </span>
          ) : null}
          {subtitle ? (
            <span className={`text-xs font-medium ${palette.textMuted} group-hover:text-white/75`}>
              {subtitle}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
