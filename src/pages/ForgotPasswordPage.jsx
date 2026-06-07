import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import { useToast } from "../components/ToastContainer";
import StepIndicator from "../components/ui/StepIndicator";
import {
  Mail,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import uewLogo from "../assets/uew-logo.svg";
import AuthBrandingPanel from "../components/ui/AuthBrandingPanel";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Forgot Password \u2014 UEW CerTiFyHub";
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.passwordResetRequest(email);
      const maskedEmail = res.data?.masked_email || email;
      toast.success("A verification code has been sent to your email.");
      navigate("/forgot-password/verify", { state: { email, maskedEmail } });
    } catch (err) {
      if (err.response?.status === 429) {
        toast.error(err.response.data.error);
      } else {
        toast.error(err.response?.data?.error || "Failed to send reset email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-white">
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[3fr_2fr]">
        <AuthBrandingPanel subtitle="Reset your password" />
        <div className="flex items-center justify-center p-6 lg:p-10 bg-white">
          <div className="w-full max-w-md">
            <div className="flex items-center justify-center">
              <img src={uewLogo} alt="UEW Logo" className="h-24 w-24" width={96} height={96} />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm p-8">
              <StepIndicator steps={["Email", "Verify", "Reset"]} currentStep={1} />
              <h1 className="text-xl font-extrabold text-slate-900">Forgot Password?</h1>
              <p className="mt-2 text-sm text-slate-600">
                Enter your email address and we&apos;ll send you a 6-digit verification code.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="forgot-email" className="text-xs font-semibold text-slate-600">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail size={16} className="text-slate-400" />
                    </div>
                    <input
                      id="forgot-email"
                      type="email"
                      placeholder="Enter your email"
                      className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Verification Code
                      <Mail size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6">
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition-all duration-200"
                >
                  <ArrowLeft size={14} />
                  Back to Login
                </Link>
              </div>

              <div className="mt-6 text-center text-xs text-slate-500">
                Powered by Directorate of ICT Services, UEW
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
