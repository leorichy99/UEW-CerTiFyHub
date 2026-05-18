import { Check } from "lucide-react";

const STEPS = [
  { num: 1, label: "Identity" },
  { num: 2, label: "Authorisation" },
  { num: 3, label: "Permissions" },
  { num: 4, label: "Review" },
];

export default function StepIndicator({ currentStep, completedSteps, onStepClick }) {
  return (
    <>
      {/* Desktop */}
      <nav aria-label="Provisioning steps" className="hidden sm:flex items-center justify-center gap-0 select-none">
        {STEPS.map((step, idx) => {
          const isCompleted = completedSteps.has(step.num);
          const isCurrent = currentStep === step.num;
          const isFuture = !isCompleted && !isCurrent;

          return (
            <div key={step.num} className="flex items-center">
              {/* Connector line */}
              {idx > 0 && (
                <div
                  className={`w-16 h-0.5 transition-colors duration-200 ${
                    isCompleted || isCurrent ? "bg-blue-500" : "bg-slate-200"
                  }`}
                />
              )}

              {/* Node + label */}
              <button
                type="button"
                disabled={!isCompleted}
                onClick={() => isCompleted && onStepClick(step.num)}
                aria-current={isCurrent ? "step" : undefined}
                className={`flex flex-col items-center gap-1.5 group ${
                  isCompleted ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <span
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-extrabold transition-all duration-200 ${
                    isCompleted
                      ? "bg-blue-600 text-white group-hover:bg-blue-700"
                      : isCurrent
                      ? "bg-blue-600 text-white ring-4 ring-blue-100"
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}
                >
                  {isCompleted ? <Check size={14} strokeWidth={3} /> : step.num}
                </span>
                <span
                  className={`text-[11px] font-medium whitespace-nowrap ${
                    isCompleted
                      ? "text-blue-600 group-hover:text-blue-700"
                      : isCurrent
                      ? "text-blue-700 font-semibold"
                      : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
              </button>
            </div>
          );
        })}
      </nav>

      {/* Mobile */}
      <div className="sm:hidden flex items-center justify-center gap-3">
        <span className="text-sm font-semibold text-blue-700">
          Step {currentStep} of 4
        </span>
        <span className="text-sm text-slate-500">
          — {STEPS[currentStep - 1].label}
        </span>
      </div>
    </>
  );
}
