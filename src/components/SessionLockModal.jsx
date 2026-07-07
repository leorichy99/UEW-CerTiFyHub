import React, { useState, useRef, useEffect } from "react";
import { authAPI } from "../services/api";
import { Lock, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function SessionLockModal({ open, onUnlock }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPassword("");
      setError("");
      setLoading(false);
      // Focus the input after the modal opens
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Trap focus inside the modal
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault(); // non-dismissible
      }
      if (e.key === "Tab") {
        const focusable = document.querySelectorAll(
          '[data-lock-modal] [tabindex]:not([tabindex="-1"]), [data-lock-modal] input, [data-lock-modal] button'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim() || loading) return;

    setLoading(true);
    setError("");

    try {
      const { data } = await authAPI.reAuthenticate(password);
      if (data.access) {
        localStorage.setItem("accessToken", data.access);
        onUnlock();
        setPassword("");
      } else {
        setError("Unable to unlock session.");
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || "Invalid password.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      data-lock-modal
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      aria-label="Session locked"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Lock size={22} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Session Locked</h2>
          <p className="mt-1 text-sm text-slate-500">
            You&apos;ve been inactive for 15 minutes. Enter your password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label htmlFor="lock-password" className="sr-only">
              Password
            </label>
            <input
              ref={inputRef}
              id="lock-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              disabled={loading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              disabled={loading}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <div
              className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
              aria-live="polite"
            >
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Unlocking...
              </>
            ) : (
              "Unlock Session"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
