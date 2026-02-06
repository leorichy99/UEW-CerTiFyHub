import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import {
  CheckCircle,
  XCircle,
  ShieldCheck,
  Download,
  Search,
} from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export default function VerificationPage() {
  const { id } = useParams();
  const [searchId, setSearchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      verifyCertificate(id);
    }
  }, [id]);

  const verifyCertificate = async (certId) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/verify/${certId}/`);
      setResult(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Certificate not found or invalid.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchId.trim()) {
      verifyCertificate(searchId.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <ShieldCheck className="mx-auto h-16 w-16 text-indigo-600" />
          <h1 className="mt-4 text-4xl font-extrabold text-gray-900 tracking-tight">
            Certificate Verification Portal
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Verify the authenticity of University of Education, Winneba
            certificates.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 mb-8">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-4 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                placeholder="Enter Certificate ID / UUID"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify Now"}
            </button>
          </form>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">
              Authenticating with blockchain records...
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-xl animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex">
              <XCircle className="h-6 w-6 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700 font-bold">
                  Verification Failed
                </p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div
            className={`bg-white rounded-2xl shadow-2xl overflow-hidden border-2 animate-in zoom-in duration-500 ${
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
                    className={`text-xl font-bold ${
                      result.status === "VALID"
                        ? "text-green-800"
                        : "text-red-800"
                    }`}
                  >
                    Status: {result.status}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Timestamp: {new Date().toLocaleString()}
                  </p>
                </div>
              </div>
              {result.status === "VALID" && result.certificate.pdf_file && (
                <a
                  href={result.certificate.pdf_file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-bold"
                >
                  <Download size={16} />
                  Download Verified PDF
                </a>
              )}
            </div>

            {result.status === "VALID" && (
              <div className="px-8 py-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Student Name
                  </h3>
                  <p className="text-xl font-bold text-gray-900">
                    {result.certificate.student_name}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Degree Awarded
                  </h3>
                  <p className="text-xl font-bold text-gray-900">
                    {result.certificate.degree_type_display}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Program of Study
                  </h3>
                  <p className="text-lg font-medium text-gray-700">
                    {result.certificate.program}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Date of Issuance
                  </h3>
                  <p className="text-lg font-medium text-gray-700">
                    {result.certificate.date_awarded}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Certificate Number
                  </h3>
                  <p className="text-lg font-mono text-indigo-600 bg-indigo-50 px-3 py-1 rounded inline-block">
                    {result.certificate.certificate_number}
                  </p>
                </div>
              </div>
            )}

            {result.status === "REVOKED" && (
              <div className="px-8 py-12 text-center">
                <p className="text-lg text-gray-600 mb-4">{result.message}</p>
                <div className="bg-red-50 p-4 rounded-xl text-red-800 text-sm italic">
                  This certificate is no longer valid for official use and
                  should not be accepted.
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            to="/"
            className="text-indigo-600 hover:text-indigo-800 font-medium transition-all"
          >
            ← Back to CertiFyHub Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
