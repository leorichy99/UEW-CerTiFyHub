import React from "react";

function Box({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;
}

export function AuthPageFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6">
        <Box className="h-8 w-40" />
        <div className="mt-6 space-y-3">
          <Box className="h-10 w-full" />
          <Box className="h-10 w-full" />
          <Box className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

export function DashboardFallback() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2">
          <Box className="h-8 w-56" />
          <Box className="h-4 w-80" />
        </div>
        <Box className="h-10 w-56" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <Box className="h-10 w-10 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Box className="h-5 w-44" />
            <Box className="h-4 w-72" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5">
            <Box className="h-10 w-10 rounded-2xl" />
            <Box className="mt-4 h-4 w-28" />
            <Box className="mt-3 h-7 w-20" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5">
          <Box className="h-5 w-48" />
          <Box className="mt-4 h-64 w-full" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <Box className="h-5 w-40" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Box key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CertificatesFallback() {
  return (
    <div className="space-y-6">
      <div className="mb-6 flex justify-between items-center">
        <Box className="h-8 w-52" />
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <Box className="h-6 w-64" />
          <Box className="h-10 w-28" />
        </div>

        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start gap-6">
                <div className="flex-1">
                  <Box className="h-4 w-48" />
                  <Box className="mt-3 h-3 w-72" />
                  <Box className="mt-2 h-3 w-40" />
                  <div className="mt-4 flex gap-4">
                    <Box className="h-3 w-40" />
                    <Box className="h-3 w-24" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Box className="h-10 w-10" />
                  <Box className="h-10 w-10" />
                  <Box className="h-10 w-10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StudentsFallback() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2">
          <Box className="h-8 w-48" />
          <Box className="h-4 w-72" />
        </div>
        <Box className="h-10 w-44" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <Box className="h-10 w-full md:w-96" />
          <div className="flex gap-2">
            <Box className="h-10 w-32" />
            <Box className="h-10 w-32" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <Box className="h-4 w-40" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Box key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TemplatesFallback() {
  return (
    <div className="min-h-[calc(100vh-7rem)] bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-6">
          <div className="space-y-2">
            <Box className="h-8 w-80" />
            <Box className="h-4 w-96" />
          </div>
          <Box className="h-10 w-40" />
        </div>

        <Box className="h-11 w-full" />

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <Box className="h-36 w-full rounded-none" />
              <div className="p-4 space-y-2">
                <Box className="h-4 w-44" />
                <Box className="h-3 w-56" />
                <Box className="mt-4 h-9 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BulkIssueFallback() {
  return (
    <div className="max-w-6xl mx-auto py-8 space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2">
          <Box className="h-8 w-72" />
          <Box className="h-4 w-96" />
        </div>
        <div className="min-w-55 space-y-2">
          <Box className="h-3 w-24 ml-auto" />
          <Box className="h-2 w-full rounded-full" />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-6">
          <Box className="h-6 w-80" />
          <Box className="h-9 w-56" />
        </div>
        <div className="p-6 bg-slate-50/60">
          <div className="space-y-4">
            <Box className="h-36 w-full rounded-2xl" />
            <Box className="h-36 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsFallback() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex justify-between items-end">
        <div className="space-y-3">
          <div className="h-10 w-72 rounded-xl bg-slate-200" />
          <div className="h-4 w-96 rounded-xl bg-slate-200" />
        </div>
        <div className="h-10 w-36 rounded-xl bg-slate-200" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="h-12 w-12 rounded-2xl bg-slate-200" />
            <div className="mt-4 h-3 w-32 rounded-xl bg-slate-200" />
            <div className="mt-3 h-8 w-24 rounded-xl bg-slate-200" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-8">
            <div className="h-6 w-48 rounded-xl bg-slate-200" />
            <div className="h-5 w-5 rounded bg-slate-200" />
          </div>
          <div className="h-80 w-full rounded-2xl bg-slate-100" />
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-8">
            <div className="h-6 w-56 rounded-xl bg-slate-200" />
            <div className="h-5 w-5 rounded bg-slate-200" />
          </div>
          <div className="h-80 w-full rounded-2xl bg-slate-100" />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
          <div className="h-6 w-44 rounded-xl bg-slate-200" />
          <div className="h-5 w-40 rounded-xl bg-slate-200" />
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 w-full rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
