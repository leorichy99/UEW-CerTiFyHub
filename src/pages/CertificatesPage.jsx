import { useState } from "react";
import CertificateList from "../components/CertificateList";
import CertificatePreview from "../components/CertificatePreview";
import PageHeader from "../components/ui/PageHeader";

export default function CertificatesPage() {
  const [previewCertificate, setPreviewCertificate] = useState(null);

  return (
    <>
      <PageHeader
        title="Certificates"
        description="View and manage issued certificates"
        showSearch={false}
      />
        <CertificateList 
          onViewCertificate={setPreviewCertificate} 
        />

      {previewCertificate && (
        <CertificatePreview
          certificate={previewCertificate}
          onClose={() => setPreviewCertificate(null)}
        />
      )}
    </>
  );
}
