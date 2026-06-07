import React from "react";

export default function Label({ htmlFor, children, required = false, className = "" }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-xs font-semibold text-slate-600 mb-1 ${className}`}
    >
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}
