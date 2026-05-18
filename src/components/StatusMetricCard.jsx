import { motion, useReducedMotion } from "framer-motion";

const TONE_STYLES = {
  emerald:  { bg: "bg-emerald-50",  border: "border-emerald-200",  text: "text-emerald-700"  },
  sky:      { bg: "bg-sky-50",      border: "border-sky-200",      text: "text-sky-700"      },
  amber:    { bg: "bg-amber-50",    border: "border-amber-200",    text: "text-amber-700"    },
  rose:     { bg: "bg-rose-50",     border: "border-rose-200",     text: "text-rose-700"     },
  slate:    { bg: "bg-slate-50",    border: "border-slate-200",    text: "text-slate-600"    },
  violet:   { bg: "bg-violet-50",  border: "border-violet-200",  text: "text-violet-700"  },
};

export default function StatusMetricCard({ label, value, status, tone = "slate", delay = 0 }) {
  const shouldReduceMotion = useReducedMotion();
  const style = TONE_STYLES[tone] || TONE_STYLES.slate;
  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.35, delay }}
      className={`flex flex-col gap-1 rounded-xl border ${style.border} ${style.bg} p-3`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>
      <span className="text-2xl font-extrabold tracking-tight text-slate-900">
        {value}
      </span>
      {status && (
        <span className={`text-[10px] font-semibold ${style.text}`}>
          {status}
        </span>
      )}
    </motion.div>
  );
}
