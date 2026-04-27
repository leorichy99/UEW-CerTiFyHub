import React from "react";

function Bone({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}

export default function PageSkeleton({ variant = "default" }) {
  if (variant === "table") {
    return (
      <div className="space-y-4" role="status" aria-label="Loading content">
        <div className="flex items-center justify-between">
          <Bone className="h-8 w-48" />
          <Bone className="h-10 w-32" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Bone className="h-4 w-1/4" />
                <Bone className="h-4 w-1/5" />
                <Bone className="h-4 w-1/6" />
                <Bone className="h-4 w-1/6" />
                <Bone className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className="space-y-6" role="status" aria-label="Loading content">
        <div className="flex items-center justify-between">
          <Bone className="h-8 w-48" />
          <Bone className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <Bone className="h-4 w-24" />
              <Bone className="h-8 w-16" />
              <Bone className="h-3 w-32" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
            <Bone className="h-5 w-32" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} className="h-4 w-full" />
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
            <Bone className="h-5 w-32" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" role="status" aria-label="Loading content">
      <div className="flex items-center justify-between">
        <Bone className="h-8 w-48" />
        <Bone className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
            <Bone className="h-4 w-24" />
            <Bone className="h-6 w-16" />
            <Bone className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <Bone className="h-5 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Bone key={i} className="h-4 w-full" />
        ))}
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}
