import React, { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

// DEPRECATED: Use useConfirmDialog() hook instead.
// Kept for backward compatibility until all callers are migrated.
export function confirmDialog(options) {
  // This will throw if called outside a ConfirmDialogProvider.
  // Callers should migrate to the useConfirmDialog() hook.
  console.warn(
    "confirmDialog() is deprecated. Use the useConfirmDialog() hook instead."
  );
  throw new Error(
    "confirmDialog() can no longer be called imperatively. Migrate to useConfirmDialog() hook."
  );
}

// React component alternative — also delegates to the context
export const ConfirmDialog = ({ message, onConfirm, onCancel, open }) => {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement;
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => {
        const firstBtn = dialogRef.current?.querySelector("button");
        if (firstBtn) firstBtn.focus();
      });
    }
    return () => {
      document.body.style.overflow = "";
      if (
        previousFocusRef.current &&
        typeof previousFocusRef.current.focus === "function"
      ) {
        previousFocusRef.current.focus();
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4"
      >
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3
              id="confirm-title"
              className="text-lg font-semibold text-slate-900 mb-2"
            >
              Confirm Action
            </h3>
            <p id="confirm-desc" className="text-slate-600">
              {message}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="h-10 px-4 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
