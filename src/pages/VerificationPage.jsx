import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import api, { certificateAPI } from "../services/api";
import { useToast } from "../components/ToastContainer";
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

  useEffect(() => {
    document.title = "Verify Certificate — UEW CerTiFyHub";
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
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <ShieldCheck className="mx-auto h-16 w-16 text-blue-600" />
          <h1 className="mt-4 text-4xl font-extrabold text-slate-900 tracking-tight">
            Certificate Verification Portal
          </h1>
          <p className="mt-2 text-lg text-slate-600">
            Verify the authenticity of University of Education, Winneba
            certificates.
          </p>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 mb-8">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <label htmlFor="cert-search" className="sr-only">Certificate ID or UUID</label>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="cert-search"
                type="text"
                className="block w-full pl-10 pr-3 py-4 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
                placeholder="Enter Certificate ID / UUID"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying..." : "Verify Now"}
            </button>
          </form>
        </div>

        {loading && (
          <div className="text-center py-12" role="status" aria-label="Verifying certificate">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-slate-600">
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

        {result && (
          <div
            className={`bg-white rounded-xl shadow-sm overflow-hidden border-2 ${
              result.status === "VALID" ? "border-green-500" : "border-red-500"
            }`}
          >
            <div
              className={`px-8 py-6 flex items-center justify-between ${
                result.status === "VALID" ? "bg-green-50" : "bg-red-50"
              }`}
            >
              <div className="flex items-center gap-3">
                {result.status === "VALID" ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-600" />
                )}
                <div>
                  <h2
                    className={`text-xl font-extrabold ${
                      result.status === "VALID"
                        ? "text-green-800"
                        : "text-red-800"
                    }`}
                  >
                    Status: {result.status}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Timestamp: {new Date().toLocaleString()}
                  </p>
                </div>
              </div>
              {result.status === "VALID" && result.certificate.pdf_file && (
                <a
                  href={result.certificate.pdf_file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold"
                >
                  <Download size={16} />
                  Download Verified PDF
                </a>
              )}
            </div>

            {/* Certificate Preview Thumbnail */}
            {previewLoading && (
              <div className="px-8 pt-6 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            )}
            {previewUrl && (
              <div className="px-8 pt-6 flex justify-center">
                <div className="relative rounded-lg border border-slate-200 shadow-sm overflow-hidden max-w-md">
                  <img
                    src={previewUrl}
                    alt="Certificate preview"
                    className="w-full h-auto object-contain"
                    loading="lazy"
                  />
                </div>
              </div>
            )}

            {/* Copy Verification Link */}
            <div className="px-8 pt-4 flex justify-center">
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-blue-600 transition"
                aria-label="Copy verification link"
              >
                <Link2 size={14} />
                Copy verification link
              </button>
            </div>

            {result.status === "VALID" && (
              <div className="px-8 py-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Student Name
                  </h3>
                  <p className="text-xl font-extrabold text-slate-900">
                    {result.certificate.student_name}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Degree Awarded
                  </h3>
                  <p className="text-xl font-extrabold text-slate-900">
                    {result.certificate.degree_type_display}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Program of Study
                  </h3>
                  <p className="text-lg font-medium text-slate-700">
                    {result.certificate.program}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Date of Issuance
                  </h3>
                  <p className="text-lg font-medium text-slate-700">
                    {result.certificate.date_awarded}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Certificate Number
                  </h3>
                  <p className="text-lg font-mono text-blue-600 bg-blue-50 px-3 py-1 rounded inline-block">
                    {result.certificate.certificate_number}
                  </p>
                </div>
              </div>
            )}

            {result.status === "REVOKED" && (
              <div className="px-8 py-8">
                <p className="text-lg text-slate-600 mb-6 text-center">{result.message}</p>
                <div className="bg-red-50 p-4 rounded-lg text-red-800 text-sm italic mb-6 text-center">
                  This certificate is no longer valid for official use and
                  should not be accepted.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-8">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Student Name
                    </h3>
                    <p className="text-xl font-extrabold text-slate-900">
                      {result.certificate.student_name}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Degree Awarded
                    </h3>
                    <p className="text-xl font-extrabold text-slate-900">
                      {result.certificate.degree_type_display}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Program of Study
                    </h3>
                    <p className="text-lg font-medium text-slate-700">
                      {result.certificate.program}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Date of Issuance
                    </h3>
                    <p className="text-lg font-medium text-slate-700">
                      {result.certificate.date_awarded}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Certificate Number
                    </h3>
                    <p className="text-lg font-mono text-slate-600 bg-slate-100 px-3 py-1 rounded inline-block">
                      {result.certificate.certificate_number}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-800 font-medium transition"
          >
            &larr; Back to CertiFyHub Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
