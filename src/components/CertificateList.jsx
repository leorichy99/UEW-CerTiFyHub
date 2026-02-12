import React, { useState, useEffect } from 'react';
import { useToast } from './ToastContainer';
import { confirmDialog } from './ConfirmDialog';
import { Download, Eye, Trash2, RefreshCw, FileText } from 'lucide-react';
import { certificateAPI } from '../services/api';
import Pagination from './Pagination';

export default function CertificateList({ refreshTrigger, onViewCertificate }) {
  const toast = useToast();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  // Pagination calculations
  const totalItems = certificates.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCertificates = certificates.slice(startIndex, endIndex);

  // Reset to page 1 when items per page changes
  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
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
      toast.error('Failed to download certificate');
    }
  };

  const handleDelete = async (cert) => {
    confirmDialog(
      `Are you sure you want to delete the certificate for ${cert.student_name}?`,
      async () => {
        try {
          await certificateAPI.delete(cert.id);
          setCertificates(certificates.filter(c => c.id !== cert.id));
          toast.success('Certificate deleted successfully');
        } catch (err) {
          console.error('Error deleting certificate:', err);
          toast.error('Failed to delete certificate');
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="h-6 w-64 rounded-lg bg-slate-200 animate-pulse" />
          <div className="h-10 w-28 rounded-lg bg-slate-200 animate-pulse" />
        </div>

        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start gap-6">
                <div className="flex-1">
                  <div className="h-4 w-48 rounded bg-slate-200 animate-pulse" />
                  <div className="mt-3 h-3 w-72 rounded bg-slate-200 animate-pulse" />
                  <div className="mt-2 h-3 w-40 rounded bg-slate-200 animate-pulse" />
                  <div className="mt-4 flex gap-4">
                    <div className="h-3 w-40 rounded bg-slate-200 animate-pulse" />
                    <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="h-10 w-10 rounded-lg bg-slate-200 animate-pulse" />
                  <div className="h-10 w-10 rounded-lg bg-slate-200 animate-pulse" />
                  <div className="h-10 w-10 rounded-lg bg-slate-200 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
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
        <h2 className="text-xl font-bold text-gray-800">
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
        <>
          <div className="space-y-4">
            {paginatedCertificates.map((cert) => (
              <div
                key={cert.id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-gray-800">
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

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={handleItemsPerPageChange}
                totalItems={totalItems}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}