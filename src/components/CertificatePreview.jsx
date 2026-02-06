import React from "react";
import { Download, X } from "lucide-react";
import { certificateAPI } from "../services/api";

export default function CertificatePreview({ certificate, onClose }) {
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
      alert("Failed to download certificate");
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
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
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-8">
          <div className="border-8 border-gray-800 bg-linear-to-br from-amber-50 to-yellow-50 p-12 shadow-lg">
            <div className="border-2 border-gray-700 p-8">
              <div className="text-center space-y-6">
                {/* Header */}
                <h1 className="text-4xl font-serif font-bold text-gray-800 tracking-wide">
                  UNIVERSITY OF EDUCATION, WINNEBA
                </h1>
                <p className="text-2xl font-serif text-gray-700 tracking-wider">
                  GHANA
                </p>

                {/* Logo */}
                <div className="flex justify-center my-8">
                  <img
                    src="/uew-logo.png"
                    alt="University Logo"
                    className="w-32 h-32 object-contain"
                  />
                </div>

                {/* Certificate Text */}
                <p className="text-3xl font-serif italic text-gray-700 mt-12">
                  This is to Certify that
                </p>

                <h2 className="text-4xl font-bold text-gray-900 my-6">
                  {certificate.student_name}
                </h2>

                <div className="text-lg font-serif italic text-gray-700 space-y-3 max-w-3xl mx-auto leading-relaxed">
                  <p>having pursued the prescribed programme of studies at</p>
                  <p>the University of Education, Winneba, Ghana</p>
                  <p>and having passed the prescribed Examinations,</p>
                  <p>has on the {formatDate(certificate.date_awarded)}</p>
                  <p>been admitted to the degree of</p>
                </div>

                <h3 className="text-3xl font-bold text-gray-800 mt-8">
                  {certificate.degree_type_display}
                </h3>

                <p className="text-xl italic text-gray-700 mt-4">
                  with {certificate.honors_display}
                </p>

                <p className="text-lg text-gray-700 mt-4">in</p>

                <p className="text-2xl font-semibold text-gray-800 mt-2">
                  {certificate.program}
                </p>

                {/* Signatures */}
                <div className="flex justify-around items-end mt-16 pt-12">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4">Seal</p>
                    <div className="w-24 h-24 border-4 border-gray-500 rounded-full mx-auto"></div>
                  </div>

                  <div className="text-center">
                    <img
                      src="/vc.png"
                      alt="VC Signature"
                      className="h-16 mb-2 mx-auto"
                    />
                    <div className="border-t-2 border-gray-600 pt-2 px-8">
                      <p className="text-base font-semibold">Vice-Chancellor</p>
                    </div>
                  </div>

                  <div className="text-center">
                    <img
                      src="/registrar.png"
                      alt="Registrar Signature"
                      className="h-16 mb-2 mx-auto"
                    />
                    <div className="border-t-2 border-gray-600 pt-2 px-8">
                      <p className="text-base font-semibold">Registrar</p>
                    </div>
                  </div>
                </div>

                {/* Certificate Number */}
                <p className="text-right text-sm text-gray-500 mt-8">
                  {certificate.certificate_number}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
