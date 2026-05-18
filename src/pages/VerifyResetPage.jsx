import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authAPI } from "../services/api";
import { useToast } from "../components/ToastContainer";
import {
  ShieldCheck,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Clock,
  RotateCcw,
} from "lucide-react";
import uewLogo from "../assets/uew-logo.svg";
import AuthBrandingPanel from "../components/ui/AuthBrandingPanel";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyResetPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const email = location.state?.email || '';
  const maskedEmail = location.state?.maskedEmail || '';

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  const inputRefs = useRef([]);

  useEffect(() => {
    document.title = "Verify Code \u2014 UEW CerTiFyHub";
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleChange = useCallback((index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [otp]);

  const handleKeyDown = useCallback((index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [otp]);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newOtp = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    setError('');

    const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  }, []);

  const otpValue = otp.join('');
  const isComplete = otpValue.length === OTP_LENGTH;

  const handleVerify = async () => {
    if (!isComplete) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await authAPI.verifyResetToken(otpValue, email);
      if (response.data.valid) {
        toast.success('Code verified successfully!');
        navigate('/forgot-password/reset', { state: { email, otp: otpValue } });
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid verification code';
      setError(msg);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;

    setResending(true);
    setError('');
    try {
      await authAPI.passwordResetRequest(email);
      toast.success('A new verification code has been sent.');
      setCooldown(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err) {
      if (err.response?.status === 429) {
        const remaining = err.response.data.cooldown || RESEND_COOLDOWN;
        setCooldown(remaining);
        toast.error(err.response.data.error);
      } else {
        toast.error('Failed to resend code. Please try again.');
      }
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleVerify();
  };

  return (
    <div className="min-h-screen w-screen bg-white">
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[3fr_2fr]">
        <AuthBrandingPanel subtitle="Verify your identity" />
        <div className="flex items-center justify-center p-6 lg:p-10 bg-white">
          <div className="w-full max-w-md">
            <div className="flex items-center justify-center">
              <img src={uewLogo} alt="UEW Logo" className="h-24 w-24" width={96} height={96} />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm p-8">
              <h1 className="text-xl font-extrabold text-slate-900">Verify Your Identity</h1>
              <p className="mt-2 text-sm text-slate-600">
                Enter the 6-digit code sent to{' '}
                <span className="font-semibold text-slate-800">{maskedEmail || email}</span>
              </p>

              {error && (
                <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600" role="alert">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6">
                <div className="flex justify-center gap-3">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      className={`w-12 h-14 text-center text-xl font-extrabold rounded-lg border-2 outline-none transition
                        ${digit
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-slate-200 bg-white text-slate-900'
                        }
                        focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20
                      `}
                      disabled={loading}
                      autoFocus={index === 0}
                      aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
                    />
                  ))}
                </div>

                <p className="mt-3 text-center text-xs text-slate-500 flex items-center justify-center gap-1">
                  <Clock size={12} />
                  Code expires in 15 minutes
                </p>

                <button
                  type="submit"
                  disabled={loading || !isComplete}
                  className="w-full mt-6 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify Code
                      <ShieldCheck size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-xs text-slate-500">Didn't receive the code?</p>
                <button
                  onClick={handleResend}
                  disabled={cooldown > 0 || resending}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline transition disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                >
                  {resending ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Resending...
                    </>
                  ) : cooldown > 0 ? (
                    <>
                      <RotateCcw size={12} />
                      Resend in {cooldown}s
                    </>
                  ) : (
                    <>
                      <RotateCcw size={12} />
                      Resend Code
                    </>
                  )}
                </button>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <Link
                  to="/forgot-password"
                  className="text-xs text-slate-500 hover:text-slate-700 transition-all duration-200"
                >
                  Change email
                </Link>
                <Link
                  to="/login"
                  className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition-all duration-200"
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
