import React from "react";

export default function PageTitle({ children, className = "" }) {
  return (
    <h1
      className={`text-2xl font-bold tracking-tight text-slate-900 uppercase ${className}`}
    >
      {children}
    </h1>
  );
}
