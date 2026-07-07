import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import api, { certificateAPI } from "../services/api";
import { useToast } from "../components/ToastContainer";
import Drawer from "../components/Drawer";
import {
  CheckCircle,
  XCircle,
  ShieldCheck,
  Download,
  Search,
  Loader2,
  Link2,
  FileImage,
} from "lucide-react";

export default function VerificationPage() {
  const { id } = useParams();
  const toast = useToast();
  const [searchId, setSearchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    document.title = "Verify Certificate — UEW CerTiFyHub";
    
    // Detect mobile screen size
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const hasFetched = useRef(false);

  useEffect(() => {
    if (id && !hasFetched.current) {
      hasFetched.current = true;
      verifyCertificate(id);
    }
  }, [id]);

  const verifyCertificate = async (certId) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setPreviewUrl(null);
    setDrawerOpen(false);
    try {
      const response = await api.get(`/verify/${certId}/`);
      const data = response.data;
      setResult(data);

      // Fetch preview thumbnail for valid or revoked certificates
      if (data.certificate?.id) {
        setPreviewLoading(true);
        try {
          const previewRes = await certificateAPI.getPreview(data.certificate.id);
          const blob = new Blob([previewRes.data], { type: "image/png" });
          setPreviewUrl(window.URL.createObjectURL(blob));
        } catch {
          // Preview is optional; ignore errors
        } finally {
          setPreviewLoading(false);
        }
      }
      
      // Auto-open drawer on successful verification
      setDrawerOpen(true);
    } catch (err) {
      setError(
        err.response?.data?.message || "Certificate not found or invalid.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/verify/${result?.certificate?.certificate_number || result?.certificate?.id || id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Verification link copied to clipboard");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchId.trim()) {
      verifyCertificate(searchId.trim());
    }
  };

  return (
    <div className="absolute inset-0 bg-cover bg-center bg-no-repeat min-h-screen py-12 px-4 sm:px-6 lg:px-8"
        style={{ backgroundImage: "url('/uew-grad.jpg')" }}>
      {/* Right-to-left gradient overlay: danger → brand */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to left, rgba(225, 29, 72, 0.82), rgba(36, 37, 118, 0.82))",
        }}
      />
      <div className="relative max-w-3xl mx-auto z-50">
        <div className="text-center mb-12">
          <img src="/uew-logo.png" alt="UEW Logo" className="h-20 mx-auto" />
          <h1 className="mt-4 text-2xl font-extrabold text-white tracking-tight">
            Certificate Verification Portal
          </h1>
        </div>

        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <label htmlFor="cert-search" className="sr-only">Certificate ID</label>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="cert-search"
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:border-white text-sm transition"
                placeholder="Enter Certificate ID"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none  transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying..." : "Verify Now"}
            </button>
          </form>
        </div>

        {loading && (
          <div className="text-center py-12" role="status" aria-label="Verifying certificate">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-white">
              Verifying certificate authenticity...
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-lg" role="alert">
            <div className="flex">
              <XCircle className="h-6 w-6 text-red-400 shrink-0" />
              <div className="ml-3">
                <p className="text-sm text-red-700 font-extrabold">
                  Verification Failed
                </p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Verification Result Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        wide={!isMobile}
        fullWidth={isMobile}
      >
        {result && (
          <div className="space-y-6">
            {/* Certificate Preview */}
            {previewLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            )}
            {previewUrl && (
              <div className="flex justify-center">
                <img
                  src={previewUrl}
                  alt="Certificate preview"
                  className="w-full h-auto object-contain rounded-lg border border-slate-200"
                />
              </div>
            )}

            {/* Status Header */}
            <div className={`flex items-center justify-between p-4 rounded-lg ${
              result.status === "VALID" ? "bg-green-50" : "bg-red-50"
            }`}>
              <div className="flex items-center gap-3">
                {result.status === "VALID" ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
                <span className={`font-semibold ${
                  result.status === "VALID" ? "text-green-800" : "text-red-800"
                }`}>
                  {result.status}
                </span>
              </div>
              {result.status === "VALID" && result.certificate.pdf_file && (
                <a
                  href={result.certificate.pdf_file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold"
                >
                  <Download size={14} />
                  Download PDF
                </a>
              )}
            </div>

            {/* REVOKED Warning */}
            {result.status === "REVOKED" && (
              <div className="bg-red-50 p-4 rounded-lg text-red-800 text-sm">
                <p className="font-medium mb-1">{result.message}</p>
                <p className="italic">This certificate is no longer valid for official use and should not be accepted.</p>
              </div>
            )}

            {/* Student Details */}
            {result.status === "VALID" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                    Student Name
                  </h3>
                  <p className="text-xs font-bold text-slate-900">
                    {result.certificate.student_name}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                    Degree Awarded
                  </h3>
                  <p className="text-xs font-bold text-slate-900">
                    {result.certificate.degree_type_display}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                    Program of Study
                  </h3>
                  <p className="text-xs font-medium text-slate-700">
                    {result.certificate.program}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                    Class of Degree
                  </h3>
                  <p className="text-xs font-medium text-slate-700">
                    {result.certificate.honors_display}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                    Date of Issuance
                  </h3>
                  <p className="text-xs font-medium text-slate-700">
                    {result.certificate.date_awarded}
                  </p>
                </div>
                <div className="">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                    Certificate Number
                  </h3>
                  <p className="text-xs font-mono text-blue-600 inline-block">
                    {result.certificate.certificate_number}
                  </p>
                </div>
              </div>
            )}

            {/* REVOKED Minimal Details */}
            {result.status === "REVOKED" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Student Name
                  </h3>
                  <p className="text-lg font-bold text-slate-900">
                    {result.certificate.student_name}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Certificate Number
                  </h3>
                  <p className="text-base font-mono text-slate-600 bg-slate-100 px-3 py-1 rounded inline-block">
                    {result.certificate.certificate_number}
                  </p>
                </div>
              </div>
            )}

            {/* Copy Verification Link */}
            <div className="flex justify-center pt-4 border-t border-slate-100">
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition"
              >
                <Link2 size={14} />
                Copy verification link
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
