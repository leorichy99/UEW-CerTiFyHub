/* eslint-disable react/no-unescaped-entities */
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import {
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import uewLogo from "../assets/uew-logo.svg";
import AuthBrandingPanel from "../components/ui/AuthBrandingPanel";

export default function Login() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = "Login — UEW CerTiFyHub";
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(formData.username, formData.password);
      navigate("/");
    } catch (err) {
      setError("Invalid credentials. Please try again.");
    }
    finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-white">
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[3fr_2fr]">
        <AuthBrandingPanel subtitle="Welcome back!" />

        <div className="flex items-center justify-center p-6 lg:p-10 bg-white">
          <div className="w-full max-w-md">
            <div className="flex items-center justify-center">
              <img src={uewLogo} alt="UEW Logo" className="h-24 w-24" width={96} height={96} />
            </div>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm p-8">
              <h1 className="text-xl font-extrabold text-slate-900">Login</h1>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2" role="alert">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="login-email" className="text-xs font-semibold text-slate-600">Email / Username</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail size={16} className="text-slate-400" />
                    </div>
                    <input
                      id="login-email"
                      type="text"
                      placeholder="Enter your email"
                      className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                      value={formData.username}
                      onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="login-password" className="text-xs font-semibold text-slate-600">Password</label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock size={16} className="text-slate-400" />
                    </div>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      className="w-full h-10 pl-10 pr-10 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                      value={formData.password}
                      onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-700 transition"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline transition">
                  Forgot Password?
                </Link>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      Log In
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>

            
          </div>
        </div>
      </div>
    </div>
  );
}
