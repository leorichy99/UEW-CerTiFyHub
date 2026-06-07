import React from "react";
import Label from "./Label";

export default function FormField({
  id,
  label,
  required = false,
  error,
  hint,
  children,
  className = "",
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}
