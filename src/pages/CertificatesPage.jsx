import { useState } from "react";
import CertificateList from "../components/CertificateList";
import CertificatePreview from "../components/CertificatePreview";
import CertificateForm from "../components/CertificateForm";
import { Plus, FileText } from "lucide-react";

export default function CertificatesPage() {
  const [previewCertificate, setPreviewCertificate] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCertificateCreated = () => {
    // Trigger refresh of certificate list
    setRefreshTrigger(prev => prev + 1);
    setShowCreateForm(false); // Hide form after successful creation
  };

  return (
    <>
        <CertificateList 
          refreshTrigger={refreshTrigger} 
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
