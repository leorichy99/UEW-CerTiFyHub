import React, { useState } from "react";
import { useToast } from "./ToastContainer";
import { Upload, FileText } from "lucide-react";
import { DEGREE_TYPES, HONORS_TYPES } from "../utils/constants";
import { certificateAPI, templateAPI } from "../services/api";

export default function CertificateForm({ onSuccess }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    student_name: "",
    degree_type: "BSC",
    honors: "SECOND_UPPER",
    program: "",
    template: "",
    date_awarded: new Date().toISOString().split("T")[0],
  });

  const [files, setFiles] = useState({});
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await templateAPI.getAll();
        setTemplates(res.data);
      } catch (err) {
        console.error("Failed to fetch templates:", err);
      }
    };
    fetchTemplates();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      setFiles((prev) => ({ ...prev, [fieldName]: file }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const submitData = {
        ...formData,
        ...files,
      };

      const response = await certificateAPI.create(submitData);

      // Reset form
      setFormData({
        student_name: "",
        degree_type: "BSC",
        honors: "SECOND_UPPER",
        program: "",
        date_awarded: new Date().toISOString().split("T")[0],
      });
      setFiles({});

      // Clear file inputs
      document.querySelectorAll('input[type="file"]').forEach((input) => {
        input.value = "";
      });

      if (onSuccess) {
        onSuccess(response.data);
      }

      // Auto-download generated PDF if available
      const pdfUrl = response.data?.pdf_file;
      if (pdfUrl) {
        const link = document.createElement("a");
        link.href = pdfUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = `certificate_${response.data.certificate_number}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      toast.success("Certificate created successfully!");
    } catch (err) {
      console.error("Error creating certificate:", err);
      setError(err.response?.data?.message || "Failed to create certificate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        Create New Certificate
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Student Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Student Name *
            </label>
            <input
              type="text"
              name="student_name"
              value={formData.student_name}
              onChange={handleInputChange}
              required
              placeholder="e.g., BISMARK KOFI OWUSU SARFO"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Degree Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Degree Type *
            </label>
            <select
              name="degree_type"
              value={formData.degree_type}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {DEGREE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Honours */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Honours Classification *
            </label>
            <select
              name="honors"
              value={formData.honors}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {HONORS_TYPES.map((honor) => (
                <option key={honor.value} value={honor.value}>
                  {honor.label}
                </option>
              ))}
            </select>
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Certificate Template (Optional)
            </label>
            <select
              name="template"
              value={formData.template}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Default Classic Layout</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Program */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Program of Study *
            </label>
            <input
              type="text"
              name="program"
              value={formData.program}
              onChange={handleInputChange}
              required
              placeholder="e.g., Accounting Education"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-8 mx-auto bg-indigo-600 text-white py-4 px-2 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:bg-gray-400 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              Creating...
            </>
          ) : (
            <>
              <FileText size={20} />
              Create Certificate
            </>
          )}
        </button>
      </form>
    </div>
  );
}
