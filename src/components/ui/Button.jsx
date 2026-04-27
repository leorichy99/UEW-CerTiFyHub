import React from "react";
import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary:
    "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500/20",
  secondary:
    "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 focus:ring-slate-500/20",
  danger:
    "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500/20",
  success:
    "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500/20",
  ghost:
    "hover:bg-slate-100 text-slate-600 focus:ring-slate-500/20",
};

const SIZES = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  iconOnly = false,
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-lg font-medium transition focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = iconOnly
    ? size === "sm"
      ? "h-8 w-8"
      : size === "lg"
      ? "h-12 w-12"
      : "h-10 w-10"
    : SIZES[size] || SIZES.md;

  return (
    <button
      className={`${base} ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {!iconOnly && children && <span>{children}</span>}
        </>
      ) : (
        children
      )}
    </button>
  );
}
