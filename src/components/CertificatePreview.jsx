import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "./ToastContainer";
import {
  Download, X, Printer, ZoomIn, ZoomOut, Maximize2, Minimize2,
  Scan, ShieldCheck, Check, Loader2, FileX,
} from "lucide-react";
import { certificateAPI } from "../services/api";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.25;

export default function CertificatePreview({ certificate, onClose }) {
  const toast = useToast();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const modalRef = useRef(null);
  const stageRef = useRef(null);
  const imgRef = useRef(null);

  // Fetch preview
  useEffect(() => {
    if (!certificate?.id) { setLoading(false); return; }

    let url = null;
    const fetchPreview = async () => {
      try {
        const response = await certificateAPI.getPreview(certificate.id);

        const ct = response.headers?.['content-type'] || '';
        if (ct.includes('application/json')) {
          const text = await new Blob([response.data]).text();
          const json = JSON.parse(text);
          throw new Error(json.error || 'Server returned an error');
        }

        const blob = new Blob([response.data], { type: "image/png" });
        if (blob.size === 0) throw new Error('Empty image returned');

        url = window.URL.createObjectURL(blob);
        setPreviewUrl(url);
      } catch (err) {
        console.error("Preview error:", err);
        const msg =
          err.response?.status === 404 ? "Certificate preview not found" :
          err.response?.status === 500 ? "Server error generating preview" :
          err.message || "Failed to load preview";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
    return () => { if (url) window.URL.revokeObjectURL(url); };
  }, [certificate?.id]);

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const handleDownload = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloaded(false);
    try {
      const response = await certificateAPI.download(certificate.id);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `certificate_${certificate.certificate_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 1800);
    } catch (err) {
      console.error("Error downloading certificate:", err);
      toast.error("Failed to download certificate");
    } finally {
      setDownloading(false);
    }
  }, [certificate, downloading, toast]);

  const handlePrint = useCallback(() => {
    if (!previewUrl) return;
    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Please allow popups to print');
      return;
    }
    win.document.write(`
      <html><head><title>Certificate</title>
      <style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f1f5f9}
      img{max-width:100%;max-height:100vh;object-fit:contain}</style>
      </head><body><img src="${previewUrl}" onload="window.print();window.close()" /></body></html>
    `);
    win.document.close();
  }, [previewUrl, toast]);

  const zoomIn = useCallback(() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2))), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2))), []);
  const fitPage = useCallback(() => setZoom(1), []);
  const fitWidth = useCallback(() => {
    if (!stageRef.current || !imgRef.current) return;
    const stageW = stageRef.current.clientWidth - 64;
    const naturalW = imgRef.current.naturalWidth || imgRef.current.clientWidth;
    if (!naturalW) return;
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(stageW / naturalW).toFixed(2)));
    setZoom(next);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      modalRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) return; // browser handles
        onClose?.();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault(); zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault(); zoomOut();
      } else if (e.key === '0') {
        e.preventDefault(); fitPage();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault(); toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, zoomIn, zoomOut, fitPage, toggleFullscreen]);

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  const status = (certificate?.status || 'active').toLowerCase();
  const isRevoked = status === 'revoked';

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      >
        <motion.div
          ref={modalRef}
          key="modal"
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex w-full max-w-6xl h-[92vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-label="Certificate Preview"
        >
          {/* Left/Main area */}
          <div className="flex flex-1 min-w-0 flex-col">
            {/* Sticky Toolbar */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3.5">
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
                  Certificate Preview
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">Official issued certificate</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleDownload}
                  disabled={downloading || !previewUrl}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Download PDF"
                >
                  {downloading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : downloaded ? (
                    <Check size={14} className="text-emerald-300" />
                  ) : (
                    <Download size={14} />
                  )}
                  <span className="hidden sm:inline">
                    {downloading ? 'Preparing…' : downloaded ? 'Downloaded' : 'Download PDF'}
                  </span>
                </button>
                <button
                  onClick={handlePrint}
                  disabled={!previewUrl}
                  className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                  title="Print"
                  aria-label="Print"
                >
                  <Printer size={15} />
                </button>
                <div className="mx-0.5 h-5 w-px bg-slate-200" aria-hidden="true" />
                <button
                  onClick={onClose}
                  className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  title="Close"
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Viewing Stage */}
            <div
              ref={stageRef}
              className="relative flex-1 overflow-auto bg-slate-100"
            >
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative h-44 w-64 sm:h-56 sm:w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-slate-100 to-transparent" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Loader2 size={13} className="animate-spin" />
                      Generating preview…
                    </div>
                  </div>
                </div>
              ) : previewUrl ? (
                <div className="flex min-h-full items-center justify-center p-6 sm:p-10">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="relative"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 180ms ease' }}
                  >
                    {/* Verification ribbon */}
                    <div className="absolute -top-2.5 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md ring-2 ring-white">
                      <ShieldCheck size={11} strokeWidth={2.5} />
                      Verified
                    </div>
                    {/* Paper */}
                    <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-[0_10px_30px_-12px_rgba(15,23,42,0.25),0_2px_6px_rgba(15,23,42,0.05)]">
                      <img
                        ref={imgRef}
                        src={previewUrl}
                        alt="Certificate Preview"
                        className="block max-w-[78vw] max-h-[68vh] object-contain"
                        draggable={false}
                      />
                    </div>
                  </motion.div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
                    <FileX size={22} className="text-slate-400" />
                    <p className="text-sm font-medium text-slate-700">Failed to load preview</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="mt-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {/* Floating Viewer Controls */}
              {previewUrl && !loading && (
                <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
                  <div className="pointer-events-auto inline-flex items-center divide-x divide-slate-200 rounded-full border border-slate-200 bg-white/95 px-1 py-1 shadow-lg backdrop-blur">
                    <div className="flex items-center px-1">
                      <button
                        onClick={zoomOut}
                        disabled={zoom <= ZOOM_MIN}
                        className="rounded-full p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
                        title="Zoom out (-)"
                        aria-label="Zoom out"
                      >
                        <ZoomOut size={14} />
                      </button>
                      <span className="w-12 text-center text-[11px] font-medium tabular-nums text-slate-700">
                        {Math.round(zoom * 100)}%
                      </span>
                      <button
                        onClick={zoomIn}
                        disabled={zoom >= ZOOM_MAX}
                        className="rounded-full p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
                        title="Zoom in (+)"
                        aria-label="Zoom in"
                      >
                        <ZoomIn size={14} />
                      </button>
                    </div>
                    <div className="flex items-center px-1">
                      <button
                        onClick={fitWidth}
                        className="rounded-full p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                        title="Fit width"
                        aria-label="Fit width"
                      >
                        <Scan size={14} />
                      </button>
                      <button
                        onClick={fitPage}
                        className="rounded-full p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                        title="Fit page (0)"
                        aria-label="Fit page"
                      >
                        <Maximize2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center px-1">
                      <button
                        onClick={toggleFullscreen}
                        className="rounded-full p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                        title="Fullscreen (F)"
                        aria-label="Toggle fullscreen"
                      >
                        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile metadata footer */}
            <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-200 bg-white px-4 py-2.5 text-[11px] md:hidden">
              <span className="font-mono text-slate-700">{certificate?.certificate_number || '—'}</span>
              <span className="text-slate-300">·</span>
              <span className="truncate text-slate-600">{certificate?.recipient_name || certificate?.full_name || '—'}</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500">{formatDate(certificate?.issued_date || certificate?.created_at)}</span>
              <span
                className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  isRevoked
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {status}
              </span>
            </div>
          </div>

          {/* Right Metadata Sidebar (desktop) */}
          <aside className="hidden md:flex w-[280px] shrink-0 flex-col border-l border-slate-200 bg-slate-50/40">
            {/* Verification badge card */}
            <div className="m-4 rounded-lg border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                  <ShieldCheck size={17} strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-emerald-900">Verified</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-emerald-700/80">
                    This certificate is authentic and issued by the institution.
                  </p>
                </div>
              </div>
            </div>

            {/* Certificate Details */}
            <div className="px-5">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Certificate Details
              </h3>
              <dl className="mt-3 space-y-3">
                <MetaRow label="Certificate ID" value={certificate?.certificate_number || '—'} mono />
                <MetaRow label="Recipient" value={certificate?.recipient_name || certificate?.full_name || '—'} />
                <MetaRow label="Program" value={certificate?.program || certificate?.program_name || '—'} />
                <MetaRow label="Issued" value={formatDate(certificate?.issued_date || certificate?.created_at)} />
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[11px] font-medium text-slate-500">Status</dt>
                  <dd>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        isRevoked
                          ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-100'
                          : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                      }`}
                    >
                      {status}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mx-5 my-4 h-px bg-slate-200" />

            {/* Verification meta */}
            <div className="px-5 pb-5">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Verification
              </h3>
              <dl className="mt-3 space-y-3">
                <MetaRow label="Verified at" value={new Date().toLocaleString("en-US")} />
                <MetaRow label="Issuer" value={certificate?.issuer || certificate?.issued_by || 'University Registrar'} />
              </dl>
            </div>

            <div className="mt-auto border-t border-slate-200 px-5 py-3 text-[10px] text-slate-400">
              Press <kbd className="rounded border border-slate-200 bg-white px-1 font-mono">Esc</kbd> to close
            </div>
          </aside>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function MetaRow({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-[11px] font-medium text-slate-500">{label}</dt>
      <dd className={`min-w-0 text-right text-[12px] text-slate-900 ${mono ? 'font-mono' : 'font-medium'} truncate`}>
        {value}
      </dd>
    </div>
  );
}
