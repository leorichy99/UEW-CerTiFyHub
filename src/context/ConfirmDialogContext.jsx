import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { AlertTriangle, X, CheckCircle, Info } from "lucide-react";

const ConfirmDialogContext = createContext(null);

const COLOR_MAP = {
  danger: {
    bg: "bg-red-600",
    hover: "hover:bg-red-700",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    btnText: "text-white",
  },
  warning: {
    bg: "bg-amber-600",
    hover: "hover:bg-amber-700",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    btnText: "text-white",
  },
  success: {
    bg: "bg-emerald-600",
    hover: "hover:bg-emerald-700",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    btnText: "text-white",
  },
  primary: {
    bg: "bg-(--color-brand)",
    hover: "hover:bg-(--color-brand-dark)",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    btnText: "text-white",
  },
};

const ICON_MAP = {
  danger: AlertTriangle,
  warning: AlertTriangle,
  success: CheckCircle,
  primary: Info,
};

export function ConfirmDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      const config =
        typeof options === "string"
          ? { title: "Confirm Action", message: options }
          : { title: "Confirm Action", message: "", ...options };

      setDialog({
        ...config,
        resolve,
      });
    });
  }, []);

  const handleResolve = useCallback(
    (value) => {
      if (dialog) {
        dialog.resolve(value);
        setDialog(null);
      }
    },
    [dialog]
  );

  useEffect(() => {
    if (dialog) {
      previousFocusRef.current = document.activeElement;
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => {
        const firstBtn = dialogRef.current?.querySelector("button");
        if (firstBtn) firstBtn.focus();
      });
    } else {
      document.body.style.overflow = "";
      if (
        previousFocusRef.current &&
        typeof previousFocusRef.current.focus === "function"
      ) {
        previousFocusRef.current.focus();
      }
    }
  }, [dialog]);

  useEffect(() => {
    if (!dialog) return;
    const handleKey = (e) => {
      if (e.key === "Escape") {
        handleResolve(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [dialog, handleResolve]);

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleResolve(false);
          }}
        >
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-desc"
            className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4 w-full"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    COLOR_MAP[dialog.variant || "danger"].iconBg
                  }`}
                >
                  {(() => {
                    const Icon = ICON_MAP[dialog.variant || "danger"] || AlertTriangle;
                    return (
                      <Icon
                        className={`w-6 h-6 ${
                          COLOR_MAP[dialog.variant || "danger"].iconColor
                        }`}
                      />
                    );
                  })()}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  id="confirm-title"
                  className="text-lg font-semibold text-slate-900 mb-2"
                >
                  {dialog.title}
                </h3>
                {dialog.content ? (
                  <div id="confirm-desc" className="text-slate-600">
                    {dialog.content}
                  </div>
                ) : (
                  <p id="confirm-desc" className="text-slate-600">
                    {dialog.message}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => handleResolve(false)}
                className="h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                {dialog.cancelLabel || "Cancel"}
              </button>
              <button
                onClick={() => handleResolve(true)}
                className={`h-10 px-4 text-sm font-medium rounded-lg transition ${
                  COLOR_MAP[dialog.variant || "danger"].btnText
                } ${COLOR_MAP[dialog.variant || "danger"].bg} ${
                  COLOR_MAP[dialog.variant || "danger"].hover
                }`}
              >
                {dialog.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error(
      "useConfirmDialog must be used within a ConfirmDialogProvider"
    );
  }
  return context;
}
