import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/**
 * Right-side slide-in drawer with backdrop.
 *
 * Props:
 *   open      – boolean controlling visibility
 *   onClose   – callback to close
 *   title     – drawer header text
 *   wide      – use wider width (default false → max-w-md, true → max-w-lg)
 *   children  – drawer body content
 */
export default function Drawer({ open, onClose, title, wide = false, children }) {
  const [visible, setVisible] = useState(false);
  const [animate, setAnimate] = useState(false);
  const drawerRef = useRef(null);

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimate(true));
      });
    } else {
      setAnimate(false);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 h-screen">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          animate ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={`absolute top-0 right-0 bottom-0 ${
          wide ? "w-full max-w-lg" : "w-full max-w-md"
        } bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          animate ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
