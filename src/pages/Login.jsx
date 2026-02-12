/* eslint-disable react/no-unescaped-entities */
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Shield,
  Zap,
  LayoutGrid,
} from "lucide-react";
import uewLogo from "../assets/uew-logo.svg";

export default function Login() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const features = useMemo(
    () => [
      {
        icon: Shield,
        title: "Secure Certificate Issuance",
        desc: "Cryptographically protected academic credentials with tamper-resistance.",
      },
      {
        icon: Zap,
        title: "Instant Verification",
        desc: "Employers can verify authenticity in seconds with a shareable code.",
      },
      {
        icon: LayoutGrid,
        title: "Centralized Management",
        desc: "Create templates, issue in bulk, and manage certificates in one hub.",
      },
    ],
    [],
  );

  const [activeFeature, setActiveFeature] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveFeature((p) => (p + 1) % features.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [features.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      // Try login with the provided username/email
      await login(formData.username, formData.password);
      navigate("/");
    } catch (err) {
      // If login fails and it looks like an email, try with just the username part
      if (formData.username.includes("@") && formData.username.includes("uew.edu.gh")) {
        try {
          // Extract username from email (sadmin@uew.edu.gh -> Sadmin)
          const username = formData.username.split("@")[0];
          const capitalizedUsername = username.charAt(0).toUpperCase() + username.slice(1);
          await login(capitalizedUsername, formData.password);
          navigate("/");
        } catch (retryErr) {
          setError("Invalid credentials. Please try again.");
        }
      } else {
        setError("Invalid credentials. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen w-screen bg-white">
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[3fr_2fr]">
        <div className="hidden lg:block relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/uew_bg.jpg')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-linear-to-br from-[#E6232B]/70 to-[#242476]/75" />
          <div className="absolute inset-0 bg-slate-950/25" />

          <div className="relative h-full flex items-center justify-center p-10">
            <div className="w-full max-w-xl">
              <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md px-10 py-10">
                <div className="text-3xl font-extrabold tracking-tight text-white">
                  UEW CerTiFyHub
                </div>
                <div className="mt-2 text-sm text-white/80">Welcome back!</div>

                <div className="mt-8">
                  <div className="flex items-start gap-4">
                    <div className="h-11 w-11 rounded-2xl bg-white/10 flex items-center justify-center">
                      {(() => {
                        const Icon = features[activeFeature].icon;
                        return <Icon size={20} className="text-white" />;
                      })()}
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white">
                        {features[activeFeature].title}
                      </div>
                      <div className="mt-1 text-sm text-white/80 leading-relaxed">
                        {features[activeFeature].desc}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-2">
                    {features.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveFeature(idx)}
                        className={`h-2.5 rounded-full transition-all ${
                          idx === activeFeature ? "w-10 bg-white" : "w-2.5 bg-white/35 hover:bg-white/60"
                        }`}
                        aria-label={`Feature ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 text-[10px] text-white/50 text-center">
                © {new Date().getFullYear()} University of Education, Winneba. Powered by UEW ICT Services.
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 lg:p-10 bg-white">
          <div className="w-full max-w-md">
            <div className="flex items-center justify-center lg:justify-start">
              <img src={uewLogo} alt="UEW" className="h-12 w-12" />
            </div>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm p-8">
              <div className="text-xl font-bold text-slate-900">Login</div>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
                  <ShieldCheck size={16} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600">Email / Username</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail size={16} className="text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Enter your email or username"
                      className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-600">Password</label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock size={16} className="text-slate-400" />
                    </div>
                    <input
                      type="password"
                      placeholder="Enter password"
                      className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link to="#" className="text-[11px] text-rose-600 hover:underline">
                  Forgot Password?
                </Link>
                </div>

                <button
                  type="submit"
                  className="w-full h-10 rounded-lg bg-[#1E1B7A] hover:bg-[#171468] text-white text-sm font-semibold flex items-center justify-center gap-2"
                >
                  Log In
                  <ArrowRight size={16} />
                </button>
              </form>

              <div className="mt-6 text-center text-[11px] text-slate-400">
                Powered by Directorate of ICT Services, UEW
              </div>
            </div>

            <div className="mt-6 text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="font-semibold text-blue-700 hover:underline">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
