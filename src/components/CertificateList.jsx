import React, { useState, useEffect } from 'react';
import { Download, Eye, Trash2, RefreshCw, FileText } from 'lucide-react';
import { certificateAPI } from '../services/api';

export default function CertificateList({ refreshTrigger, onViewCertificate }) {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCertificates();
  }, [refreshTrigger]);

  const fetchCertificates = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await certificateAPI.getAll();
      setCertificates(response.data);
    } catch (err) {
      console.error('Error fetching certificates:', err);
      setError('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (cert) => {
    try {
      const response = await certificateAPI.download(cert.id);

      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate_${cert.certificate_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading certificate:', err);
      alert('Failed to download certificate');
    }
  };

  const handleDelete = async (cert) => {
    if (window.confirm(`Are you sure you want to delete the certificate for ${cert.student_name}?`)) {
      try {
        await certificateAPI.delete(cert.id);
        setCertificates(certificates.filter(c => c.id !== cert.id));
        alert('Certificate deleted successfully');
      } catch (err) {
        console.error('Error deleting certificate:', err);
        alert('Failed to delete certificate');
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Generated Certificates ({certificates.length})
        </h2>
        <button
          onClick={fetchCertificates}
          className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      
      {certificates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>No certificates generated yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800">
                    {cert.student_name}
                  </h3>
                  <p className="text-gray-600 mt-1">
                    {cert.degree_type_display} in {cert.program}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {cert.honors_display}
                  </p>
                  <div className="flex gap-4 mt-3 text-sm text-gray-500">
                    <span>📅 Awarded: {new Date(cert.date_awarded).toLocaleDateString()}</span>
                    <span>🔢 {cert.certificate_number}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => onViewCertificate(cert)}
                    className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition flex items-center gap-2"
                    title="Preview"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => handleDownload(cert)}
                    className="px-4 py-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition flex items-center gap-2"
                    title="Download PDF"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(cert)}
                    className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition flex items-center gap-2"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}