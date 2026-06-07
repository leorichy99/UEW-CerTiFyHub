import React from "react";
import { Check } from "lucide-react";

export default function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((label, index) => {
        const stepNum = index + 1;
        const isCompleted = currentStep > stepNum;
        const isCurrent = currentStep === stepNum;

        return (
          <React.Fragment key={stepNum}>
            {index > 0 && (
              <div
                className={`h-px w-6 transition-colors ${
                  isCompleted || isCurrent ? "bg-blue-500" : "bg-slate-200"
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isCompleted
                    ? "bg-blue-600 text-white"
                    : isCurrent
                    ? "bg-blue-100 text-blue-700 border-2 border-blue-500"
                    : "bg-slate-100 text-slate-400 border-2 border-slate-200"
                }`}
              >
                {isCompleted ? <Check size={14} /> : stepNum}
              </div>
              <span
                className={`text-[10px] font-medium ${
                  isCurrent ? "text-blue-700" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
