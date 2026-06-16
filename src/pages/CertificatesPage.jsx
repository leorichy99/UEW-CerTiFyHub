import { useState } from "react";
import PageTitle from "../components/PageTitle";
import CertificateList from "../components/CertificateList";
import CertificatePreview from "../components/CertificatePreview";

export default function CertificatesPage() {
  const [previewCertificate, setPreviewCertificate] = useState(null);

  return (
    <>
      <PageTitle>Certificates</PageTitle>
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
