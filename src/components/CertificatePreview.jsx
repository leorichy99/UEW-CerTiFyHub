import React, { useState, useEffect } from "react";
import { useToast } from "./ToastContainer";
import { Download, X } from "lucide-react";
import { certificateAPI } from "../services/api";

export default function CertificatePreview({ certificate, onClose }) {
  const toast = useToast();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!certificate?.id) { setLoading(false); return; }

    let url = null;
    const fetchPreview = async () => {
      try {
        const response = await certificateAPI.getPreview(certificate.id);

        // If the server returned JSON error instead of a blob, extract message
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
  }, [certificate.id]);

  const handleDownload = async () => {
    try {
      const response = await certificateAPI.download(certificate.id);

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `certificate_${certificate.certificate_number}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading certificate:", err);
      toast.error("Failed to download certificate");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const suffix =
      day === 1 || day === 21 || day === 31
        ? "st"
        : day === 2 || day === 22
          ? "nd"
          : day === 3 || day === 23
            ? "rd"
            : "th";
    const month = date.toLocaleDateString("en-US", { month: "long" });
    const year = date.getFullYear();
    return `${day}${suffix} day of ${month}, ${year}`;
  };

  return (
    <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">
            Certificate Preview
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <Download size={20} />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-8">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
                <p className="text-slate-600">Loading certificate preview...</p>
              </div>
            </div>
          ) : previewUrl ? (
            <div className="flex justify-center">
              <img
                src={previewUrl}
                alt="Certificate Preview"
                className="max-w-full max-h-[70vh] object-contain shadow-lg rounded-lg"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-center text-slate-500">
                <p>Failed to load certificate preview</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 text-blue-600 hover:text-blue-800"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
