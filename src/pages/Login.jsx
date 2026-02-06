/* eslint-disable react/no-unescaped-entities */
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Shield,
  Zap,
  LayoutGrid,
  ChevronRight,
} from "lucide-react";

export default function Login() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [userRole, setUserRole] = useState("Student");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(formData.username, formData.password);
      navigate("/");
    } catch (err) {
      setError("Invalid credentials. Please try again.");
    }
  };

  const roles = ["Student", "Employer", "Admin"];

  const features = [
    {
      icon: Shield,
      title: "Secure Certificate Issuance",
      desc: "Blockchain-backed security for all academic credentials.",
    },
    {
      icon: Zap,
      title: "Instant Employer Verification",
      desc: "Verify student credentials in real-time with zero friction.",
    },
    {
      icon: LayoutGrid,
      title: "Digital Credential Management",
      desc: "Centralized hub for all your academic achievements.",
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      {/* Left Section - Hero */}
      <div className="hidden lg:flex w-[45%] h-full bg-[#003366] text-white p-12 xl:p-16 flex-col justify-between relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-[-10%] right-[-10%] w-80 h-80 bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10 xl:mb-16">
            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
              <GraduationCap size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                UEW CertifyHub
              </h1>
              <p className="text-blue-200 text-[10px] font-medium uppercase tracking-widest">
                Official Certificate Issuance System
              </p>
            </div>
          </div>

          {/* <h2 className="text-3xl xl:text-5xl font-bold leading-tight mb-8 xl:mb-12">
            Empowering Academic Integrity with Digital Trust.
          </h2> */}

          <div className="space-y-6 xl:space-y-10">
            {features.map((f, i) => (
              <div key={i} className="flex gap-4 items-start max-w-md group">
                <div className="bg-white/10 p-2.5 rounded-xl group-hover:bg-white/20 transition-colors shrink-0">
                  <f.icon size={20} className="text-blue-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base xl:text-lg mb-0.5 xl:mb-1">
                    {f.title}
                  </h3>
                  <p className="text-blue-200/70 text-xs xl:text-sm leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-[10px] text-blue-200/50">
          © {new Date().getFullYear()} University of Education, Winneba. Powered
          by UEW ICT Services.
        </div>
      </div>

      {/* Right Section - Form */}
      <div className="w-full lg:w-[55%] h-full flex flex-col items-center justify-center p-6 lg:p-10 xl:p-12 bg-gray-50/30 overflow-hidden">
        <div className="w-full max-w-md">
          <div className="mb-6 xl:mb-8 text-center lg:text-left">
            <h2 className="text-4xl font-black text-gray-900 mb-3">
              Welcome Back
            </h2>
            <p className="text-gray-500 font-medium">
              Please sign in to access your dashboard
            </p>
          </div>

          {/* Role Selector */}
          {/* <div className="bg-gray-100 p-1.5 rounded-2xl flex mb-6">
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => setUserRole(role)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                  userRole === role
                    ? "bg-white text-blue-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {role}
              </button>
            ))}
          </div> */}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl mb-6 text-sm flex items-center gap-3 animate-shake">
              <ShieldCheck size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 xl:space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail
                    size={18}
                    className="text-gray-400 group-focus-within:text-[#003366] transition-colors"
                  />
                </div>
                <input
                  type="text"
                  placeholder="name@university.edu.gh"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-[#003366] outline-none transition-all placeholder:text-gray-300 font-medium"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-bold text-gray-700">
                  Password
                </label>
                <Link
                  to="#"
                  className="text-xs font-bold text-amber-600 hover:text-amber-700"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock
                    size={18}
                    className="text-gray-400 group-focus-within:text-[#003366] transition-colors"
                  />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-[#003366] outline-none transition-all placeholder:text-gray-300 font-medium"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3 ml-1">
              <input
                type="checkbox"
                id="remember"
                className="w-5 h-5 rounded border-gray-300 text-[#003366] focus:ring-[#003366]"
              />
              <label
                htmlFor="remember"
                className="text-sm font-medium text-gray-600 cursor-pointer"
              >
                Remember me
              </label>
            </div>

            <button className="w-full bg-[#003366] text-white py-3 rounded-2xl font-bold hover:bg-[#002244] transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 group">
              Sign In
              <ArrowRight
                size={18}
                className="group-hover:translate-x-1 transition-transform"
              />
            </button>
          </form>

          <p className="mt-6 xl:mt-8 text-center text-gray-500 font-medium">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-[#003366] font-extrabold hover:underline"
            >
              Request Access
            </Link>
          </p>

          <div className="mt-8 xl:mt-12 pt-6 border-t border-gray-100 flex flex-col items-center">
            <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-gray-400 uppercase">
              <ShieldCheck size={14} className="text-amber-500" />
              UEW Secure Gateway
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
