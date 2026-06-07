import React, { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, FileText, Users, Award, ArrowRight, Loader2 } from "lucide-react";
import { templateAPI } from "../services/api";

const BRAND = "#242576";

export default function DashboardFirstRun({ totalStudents = 0, onNavigate, onDismiss }) {
  const reduce = useReducedMotion();
  const [templatesCount, setTemplatesCount] = useState(null); // null = loading

  useEffect(() => {
    let active = true;
    templateAPI
      .getAll()
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.results || [];
        if (active) setTemplatesCount(list.length);
      })
      .catch(() => {
        if (active) setTemplatesCount(0);
      });
    return () => {
      active = false;
    };
  }, []);

  const steps = useMemo(
    () => [
      {
        key: "template",
        title: "Create a certificate template",
        description: "Design the layout, fields, and seal your certificates will use.",
        cta: "Create template",
        Icon: FileText,
        route: "/templates/new",
        done: (templatesCount ?? 0) > 0,
      },
      {
        key: "students",
        title: "Add student records",
        description: "Set up a congregation and import the students you will certify.",
        cta: "Add students",
        Icon: Users,
        route: "/admin/congregations",
        done: totalStudents > 0,
      },
      {
        key: "issue",
        title: "Issue your first certificate",
        description: "Generate a real certificate and watch it verify. You go live.",
        cta: "Issue certificate",
        Icon: Award,
        route: "/admin/certificates",
        done: false,
      },
    ],
    [templatesCount, totalStudents],
  );

  const completed = steps.filter((s) => s.done).length;
  const activeIndex = steps.findIndex((s) => !s.done);
  const loadingTemplates = templatesCount === null;
  const pct = Math.round((completed / steps.length) * 100);

  return (
    <motion.section
      aria-labelledby="firstrun-title"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.4 }}
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 id="firstrun-title" className="text-2xl font-bold tracking-tight text-slate-900">
            Set up your certificate system
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Three steps to issue your first verified certificate.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="self-start rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 sm:self-auto"
        >
          Skip for now
        </button>
      </div>

      <div className="px-6 pt-5">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>
            {completed} of {steps.length} complete
          </span>
          <span>{pct}%</span>
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Setup progress"
        >
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: BRAND }}
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: reduce ? 0 : 0.5 }}
          />
        </div>
      </div>

      <ol className="divide-y divide-slate-100 px-6 py-2">
        {steps.map((step, i) => {
          const isActive = i === activeIndex;
          const { Icon } = step;
          return (
            <li
              key={step.key}
              aria-current={isActive ? "step" : undefined}
              className="flex items-center gap-4 py-4"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  step.done
                    ? "bg-emerald-50 text-emerald-600"
                    : isActive
                      ? "text-white"
                      : "bg-slate-100 text-slate-400"
                }`}
                style={isActive && !step.done ? { backgroundColor: BRAND } : undefined}
              >
                {step.done ? <Check size={18} /> : <Icon size={18} strokeWidth={1.75} />}
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold ${
                    step.done ? "text-slate-400" : "text-slate-900"
                  }`}
                >
                  {step.title}
                </p>
                {!step.done ? (
                  <p className="mt-0.5 text-xs text-slate-500">{step.description}</p>
                ) : null}
              </div>

              {step.done ? (
                <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  Done
                </span>
              ) : isActive ? (
                <button
                  type="button"
                  onClick={() => onNavigate?.(step.route)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ backgroundColor: BRAND }}
                >
                  {step.cta}
                  <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate?.(step.route)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  {step.cta}
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {loadingTemplates ? (
        <div className="flex items-center gap-2 px-6 pb-5 text-xs text-slate-400">
          <Loader2 size={12} className="animate-spin" /> Checking your setup
        </div>
      ) : null}
    </motion.section>
  );
}
