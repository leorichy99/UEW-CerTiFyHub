import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { authAPI } from "../services/api";
import { Loader2, CheckCircle, XCircle, Eye, EyeOff, ShieldCheck, ArrowLeft } from "lucide-react";

const PASSWORD_RULES = [
  { id: "length", label: "At least 12 characters", test: (p) => p.length >= 12 },
  { id: "upper", label: "At least one uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "At least one lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "At least one number", test: (p) => /\d/.test(p) },
  { id: "special", label: "At least one special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function SetupAccountPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState("loading"); // loading | form | success | error
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStep("error");
      setError("No setup token provided.");
      return;
    }
    // Token validation happens server-side on submit; just show the form
    setStep("form");
  }, [token]);

  const allRulesPass = PASSWORD_RULES.every((r) => r.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = allRulesPass && passwordsMatch && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");

    try {
      await authAPI.setupAccount({ token, password, password_confirm: confirmPassword });
      setStep("success");
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.response?.data?.password?.[0] || "Setup failed. The link may have expired.";
      setError(detail);
      setStep("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-4">
          <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
          <h1 className="text-2xl font-extrabold text-slate-800">Account Ready</h1>
          <p className="text-slate-600 text-sm">
            Your password has been set successfully. You can now log in with your institutional email and new password.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (step === "error" && !password) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-4">
          <XCircle className="h-14 w-14 text-red-500 mx-auto" />
          <h1 className="text-2xl font-extrabold text-slate-800">Setup Failed</h1>
          <p className="text-slate-600 text-sm">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="mt-4 w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <ShieldCheck className="h-12 w-12 text-blue-600 mx-auto" />
          <h1 className="text-2xl font-extrabold text-slate-800">Set Your Password</h1>
          <p className="text-sm text-slate-500">
            Your account has been provisioned. Please create a secure password to activate your access.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition"
                placeholder="Min 12 characters"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition"
              placeholder="Re-enter your password"
              autoComplete="new-password"
            />
          </div>

          {/* Password strength checklist */}
          <ul className="space-y-1.5 text-xs">
            {PASSWORD_RULES.map((rule) => {
              const pass = rule.test(password);
              return (
                <li key={rule.id} className={`flex items-center gap-2 ${pass ? "text-green-600" : "text-slate-400"}`}>
                  {pass ? <CheckCircle size={14} /> : <span className="h-3.5 w-3.5 rounded-full border border-slate-300 inline-block" />}
                  {rule.label}
                </li>
              );
            })}
            <li className={`flex items-center gap-2 ${passwordsMatch ? "text-green-600" : "text-slate-400"}`}>
              {passwordsMatch ? <CheckCircle size={14} /> : <span className="h-3.5 w-3.5 rounded-full border border-slate-300 inline-block" />}
              Passwords match
            </li>
          </ul>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Setting up..." : "Activate Account"}
          </button>
        </form>

        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition"
          >
            <ArrowLeft size={14} />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
