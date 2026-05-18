import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown, MapPin, Clock, Monitor, FileText, Award, XCircle, Shield, CheckCircle, Activity } from "lucide-react";

const ACTION_COLORS = {
  issued:       { dot: "bg-emerald-500", ring: "ring-emerald-200", line: "bg-emerald-200", icon: Award, iconColor: "text-emerald-600" },
  revoked:      { dot: "bg-rose-500",    ring: "ring-rose-200",    line: "bg-rose-200",    icon: XCircle, iconColor: "text-rose-600" },
  imports:      { dot: "bg-violet-500",  ring: "ring-violet-200",  line: "bg-violet-200",  icon: CheckCircle, iconColor: "text-violet-600" },
  admin_changes:{ dot: "bg-amber-500",   ring: "ring-amber-200",   line: "bg-amber-200",   icon: Shield, iconColor: "text-amber-600" },
  other:        { dot: "bg-slate-400",   ring: "ring-slate-200",   line: "bg-slate-200",   icon: Activity, iconColor: "text-slate-600" },
};

export default function ExpandableTimelineRow({
  event,
  isLast = false,
  delay = 0,
}) {
  const shouldReduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const colors = ACTION_COLORS[event.actionType] || ACTION_COLORS.other;
  const ActionIcon = colors.icon;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.3, delay }}
      className="group relative flex gap-3"
    >
      {/* Timeline connector */}
      <div className="flex flex-col items-center pt-2">
        <div className="relative">
          <div
            className={`h-3 w-3 rounded-full ${colors.dot} ring-[4px] ${colors.ring} ring-offset-2 transition-transform group-hover:scale-110`}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <ActionIcon size={10} className={colors.iconColor} />
          </div>
        </div>
        {!isLast && (
          <div className={`mt-2 w-0.5 flex-1 ${colors.line} opacity-40`} />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-5">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-slate-50/80"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">{event.title}</p>
            <div className="mt-1 flex items-center gap-2">
              {event.certificateId && event.certificateId !== "—" && (
                <span className="text-xs text-slate-500 font-mono">{event.certificateId}</span>
              )}
              {event.program && event.program !== "—" && (
                <span className="text-xs text-slate-400">· {event.program}</span>
              )}
              {event.actor && (
                <span className="text-xs text-slate-400">by {event.actor}</span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[11px] text-slate-400">{event.timeAgo}</span>
            <ChevronDown
              size={14}
              className={`shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </div>
        </button>

        <AnimatePresence>
          {expanded && event.details && (
            <motion.div
              initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/60 p-3 space-y-2">
                {event.certificateId && event.certificateId !== "—" && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <FileText size={12} className="text-slate-400" />
                    <span className="font-mono">Certificate ID: {event.certificateId}</span>
                  </div>
                )}
                {event.program && event.program !== "—" && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Activity size={12} className="text-slate-400" />
                    <span>Program: {event.program}</span>
                  </div>
                )}
                {event.details.ip && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin size={12} />
                    <span>IP: {event.details.ip}</span>
                  </div>
                )}
                {event.details.timestamp && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock size={12} />
                    <span>{event.details.timestamp}</span>
                  </div>
                )}
                {event.details.device && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Monitor size={12} />
                    <span>{event.details.device}</span>
                  </div>
                )}
                {event.details.changes && (
                  <div className="flex items-start gap-2 text-xs text-slate-500">
                    <FileText size={12} className="mt-0.5 shrink-0" />
                    <span className="whitespace-pre-wrap">{event.details.changes}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
