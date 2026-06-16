import React from "react";
import { ArrowUpRight } from "lucide-react";

const paletteMap = {
  neutral: {
    card: "bg-white",
    borderTop: "border-t-2 border-slate-200",
    iconWrap: "bg-slate-100 text-slate-600",
    trendWrap: "bg-slate-100 text-slate-700",
    text: "text-slate-900",
    textMuted: "text-slate-500",
  },
  positive: {
    card: "bg-white",
    borderTop: "border-t-2 border-emerald-200",
    iconWrap: "bg-emerald-50 text-emerald-600",
    trendWrap: "bg-emerald-50 text-emerald-700",
    text: "text-slate-900",
    textMuted: "text-slate-500",
  },
  negative: {
    card: "bg-white",
    borderTop: "border-t-2 border-red-200",
    iconWrap: "bg-red-50 text-red-500",
    trendWrap: "bg-red-50 text-red-700",
    text: "text-slate-900",
    textMuted: "text-slate-500",
  },
  warning: {
    card: "bg-white",
    borderTop: "border-t-2 border-amber-200",
    iconWrap: "bg-amber-50 text-amber-600",
    trendWrap: "bg-amber-50 text-amber-700",
    text: "text-slate-900",
    textMuted: "text-slate-500",
  },
  info: {
    card: "bg-white",
    borderTop: "border-t-2 border-blue-200",
    iconWrap: "bg-blue-50 text-blue-600",
    trendWrap: "bg-blue-50 text-blue-700",
    text: "text-slate-900",
    textMuted: "text-slate-500",
  },
};

export default function SummaryStatCard({
  title,
  value,
  Icon,
  tone = "neutral",
  trend,
  trendPositive = true,
  subtitle,
  valueSuffix = "",
}) {
  const palette = paletteMap[tone] || paletteMap.neutral;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl px-4 py-3 transition-all duration-300 ${palette.card} ${palette.borderTop} shadow-md hover:shadow-lg border border-slate-200`}
    >
      <div className="flex flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className={`text-sm font-medium uppercase tracking-wide ${palette.textMuted}`}>
              {title}
            </p>
            <p className={`mt-1 text-3xl font-bold tracking-tight ${palette.text}`}>
              {value}
              {valueSuffix}
            </p>
          </div>

{/* stat icon */}
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${palette.iconWrap} transition-transform duration-300 group-hover:scale-105 mb-3`}>
            <Icon size={18} strokeWidth={1} />
          </div>
        </div>

        {/* trend */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {trend ? (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${palette.trendWrap}`}>
              <ArrowUpRight size={10} className={!trendPositive ? "rotate-90" : ""} />
              {trend}
            </span>
          ) : null}
          {subtitle ? (
            <span className={`text-xs font-medium ${palette.textMuted}`}>
              {subtitle}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
