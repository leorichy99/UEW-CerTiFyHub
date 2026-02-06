import { useState } from "react";
import CertificateList from "../components/CertificateList";
import CertificatePreview from "../components/CertificatePreview";

export default function CertificatesPage() {
  const [previewCertificate, setPreviewCertificate] = useState(null);

  return (
    <>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">All Certificates</h2>
      </div>
      <CertificateList onViewCertificate={setPreviewCertificate} />
      {previewCertificate && (
        <CertificatePreview
          certificate={previewCertificate}
          onClose={() => setPreviewCertificate(null)}
        />
      )}
    </>
  );
}
