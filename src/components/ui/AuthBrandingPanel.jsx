import { useState, useEffect, useMemo } from "react";
import { Shield, Zap, LayoutGrid } from "lucide-react";

const FEATURES = [
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
];

export default function AuthBrandingPanel({ subtitle = "Welcome back!" }) {
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const matchMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (matchMedia.matches) return;

    const id = window.setInterval(() => {
      setActiveFeature((p) => (p + 1) % FEATURES.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, []);

  const ActiveIcon = FEATURES[activeFeature].icon;

  return (
    <div className="hidden lg:block relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/uew_bg.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-(--color-brand-dark)/90" />
      <div className="absolute inset-0 bg-slate-950/25" />

      <div className="relative h-full flex items-center justify-center p-10">
        <div className="w-full max-w-xl">
          <div className="rounded-2xl border border-white/15 bg-white/10 px-10 py-10">
            <div className="text-3xl font-extrabold tracking-tight text-white">
              UEW CerTiFyHub
            </div>
            <div className="mt-2 text-sm text-white/80">{subtitle}</div>

            <div className="mt-8">
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-2xl bg-white/10 flex items-center justify-center">
                  <ActiveIcon size={20} className="text-white" />
                </div>
                <div>
                  <div className="text-lg font-extrabold text-white">
                    {FEATURES[activeFeature].title}
                  </div>
                  <div className="mt-1 text-sm text-white/80 leading-relaxed">
                    {FEATURES[activeFeature].desc}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2">
                {FEATURES.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveFeature(idx)}
                    className={`h-2.5 rounded-full transition-all ${
                      idx === activeFeature
                        ? "w-10 bg-white"
                        : "w-2.5 bg-white/35 hover:bg-white/60"
                    }`}
                    aria-label={`Feature ${idx + 1}: ${FEATURES[idx].title}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 text-xs text-white/70 text-center">
            &copy; {new Date().getFullYear()} University of Education, Winneba.
            Powered by UEW ICT Services.
          </div>
        </div>
      </div>
    </div>
  );
}
