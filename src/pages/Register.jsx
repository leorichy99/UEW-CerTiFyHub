/* eslint-disable react/no-unescaped-entities */
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Send,
  ShieldCheck,
  GraduationCap,
  Infinity,
  Zap,
  Briefcase,
  AtSign,
} from "lucide-react";

export default function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    password_confirm: "",
    role: "STUDENT",
    full_name: "",
  });
  const [error, setError] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.password_confirm) {
      setError("Passwords do not match");
      return;
    }

    try {
      await register(formData);
      navigate("/login");
    } catch (err) {
      setError("Registration failed. Please check your details.");
    }
  };

  const handleRoleChange = (role) => {
    setFormData({ ...formData, role: role.toUpperCase() });
  };

  const features = [
    {
      icon: Infinity,
      title: "Lifelong Access",
      desc: "Your academic achievements stored securely and accessible to you forever.",
    },
    {
      icon: ShieldCheck,
      title: "Verified Credentials",
      desc: "Blockchain-verified certificates that are tamper-proof and instantly validatable.",
    },
    {
      icon: Zap,
      title: "Global Portability",
      desc: "Share your success with employers and institutions worldwide in seconds.",
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      {/* Left Section - Branding */}
      <div className="hidden lg:flex w-[45%] h-full bg-[#003366] text-white p-12 xl:p-16 flex-col justify-between relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-[-10%] right-[-10%] w-80 h-80 bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12 xl:mb-20">
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

          {/* <h2 className="text-4xl xl:text-6xl font-bold leading-tight mb-10 xl:mb-16">
            Join the Digital Academic Revolution.
          </h2> */}

          <div className="space-y-8 xl:space-y-12">
            {features.map((f, i) => (
              <div key={i} className="flex gap-5 items-start max-w-md group">
                <div className="bg-white/10 p-3 rounded-2xl group-hover:bg-white/20 transition-colors shrink-0">
                  <f.icon size={22} className="text-blue-300" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-1">{f.title}</h3>
                  <p className="text-blue-200/70 text-sm xl:text-base leading-relaxed">
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

      {/* Right Section - Registration Form */}
      <div className="w-full lg:w-[55%] h-full flex flex-col items-center justify-center p-6 lg:p-10 xl:p-12 bg-gray-50/30 overflow-hidden">
        <div className="w-full max-w-md">
          <div className="mb-6 xl:mb-8 text-center lg:text-left">
            <h2 className="text-4xl font-black text-gray-900 mb-2">
              Request Access
            </h2>
            <p className="text-gray-500 font-medium">
              Fill in your details to apply for a CertifyHub account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 xl:space-y-4">
            {/* Role Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                I am a...
              </label>
              <div className="bg-gray-100 p-1 rounded-2xl flex mb-4">
                {["Student", "Employer", "Admin"].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleChange(role)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      formData.role === role.toUpperCase()
                        ? "bg-white text-blue-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs flex items-center gap-2 animate-shake">
                <ShieldCheck size={14} />
                {error}
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 ml-1">
                  Full Name
                </label>
                <div className="relative group">
                  <User
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#003366] transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="John Doe"
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-[#003366] outline-none transition-all placeholder:text-gray-300 font-medium text-sm"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 ml-1">
                  User Name
                </label>
                <div className="relative group">
                  <Briefcase
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#003366] transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Username"
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-[#003366] outline-none transition-all placeholder:text-gray-300 font-medium text-sm"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 ml-1">
                  Institutional Email
                </label>
                <div className="relative group">
                  <AtSign
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#003366] transition-colors"
                  />
                  <input
                    type="email"
                    placeholder="name@uew.edu.gh"
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-[#003366] outline-none transition-all placeholder:text-gray-300 font-medium text-sm"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 ml-1">
                  Create Password
                </label>
                <div className="relative group">
                  <Lock
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#003366] transition-colors"
                  />
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-[#003366] outline-none transition-all placeholder:text-gray-300 font-medium text-sm"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        password: e.target.value,
                        password_confirm: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
            </div>

            <button className="w-full bg-[#003366] text-white py-3.5 rounded-2xl font-bold hover:bg-[#002244] transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 group mt-4">
              Submit Request
              <Send
                size={18}
                className="group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform"
              />
            </button>
          </form>

          <p className="mt-6 xl:mt-8 text-center text-gray-500 text-sm font-medium">
            Already have access?{" "}
            <Link
              to="/login"
              className="text-[#003366] font-extrabold hover:underline flex items-center justify-center gap-1"
            >
              <Lock size={12} className="mb-0.5" /> Back to Login
            </Link>
          </p>

          <div className="mt-6 xl:mt-6 pt-6 border-t border-gray-100 flex flex-col items-center">
            <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-gray-400 uppercase">
              <ShieldCheck size={14} className="text-amber-500" />
              UEW Digital Infrastructure
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
