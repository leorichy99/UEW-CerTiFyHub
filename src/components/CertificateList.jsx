import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useToast } from './ToastContainer';
import { useAuth } from '../context/AuthContext';
import { useConfirmDialog } from '../context/ConfirmDialogContext';
import { Download, Eye, Trash2, RefreshCw, FileText, Search, X, Filter, Clipboard, CheckCircle, XCircle, FileCheck } from 'lucide-react';
import { certificateAPI } from '../services/api';
import Pagination from './Pagination';
import SummaryStatCard from './SummaryStatCard';

const HONORS_OPTIONS = [
  { value: '', label: 'All Honours' },
  { value: 'FIRST', label: 'First Class' },
  { value: 'SECOND_UPPER', label: 'Second Class (Upper)' },
  { value: 'SECOND_LOWER', label: 'Second Class (Lower)' },
  { value: 'THIRD', label: 'Third Class' },
  { value: 'PASS', label: 'Pass' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'REVOKED', label: 'Revoked' },
];

const formatCertId = (certNumber) => {
  if (!certNumber) return '—';
  return certNumber.length > 16 ? certNumber.slice(0, 8) + '…' + certNumber.slice(-6) : certNumber;
};

export default function CertificateList({ refreshTrigger, onViewCertificate }) {
  const confirm = useConfirmDialog();
  const toast = useToast();
  const { user } = useAuth();
  const isSuperAdmin = user?.profile?.role === 'SUPER_ADMIN';
  const [certificates, setCertificates] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterHonors, setFilterHonors] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [programs, setPrograms] = useState([]);

  // Debounce search
  const debounceRef = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page: currentPage, page_size: itemsPerPage };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterHonors) params.honors = filterHonors;
      if (filterStatus) params.status = filterStatus;
      if (filterProgram) params.program = filterProgram;
      if (filterDateFrom) params.date_from = filterDateFrom;
      if (filterDateTo) params.date_to = filterDateTo;

      const response = await certificateAPI.getAll(params);
      const data = response.data;
      // Handle both paginated { count, results } and plain array responses
      if (data && typeof data.count === 'number') {
        setCertificates(data.results || []);
        setTotalItems(data.count);
      } else {
        const arr = Array.isArray(data) ? data : [];
        setCertificates(arr);
        setTotalItems(arr.length);
      }
    } catch (err) {
      console.error('Error fetching certificates:', err);
      setError('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearch, filterHonors, filterStatus, filterProgram, filterDateFrom, filterDateTo]);

  // Fetch programs once for filter dropdown
  useEffect(() => {
    certificateAPI.getAll({ page_size: 1000 }).then(res => {
      const data = res.data;
      const arr = data?.results || (Array.isArray(data) ? data : []);
      const unique = [...new Set(arr.map(c => c.program).filter(Boolean))].sort();
      setPrograms(unique);
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchCertificates(); }, [fetchCertificates, refreshTrigger]);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, filterHonors, filterStatus, filterProgram, filterDateFrom, filterDateTo]);

  const programOptions = useMemo(() => {
    return [{ value: '', label: 'All Programs' }, ...programs.map(p => ({ value: p, label: p }))];
  }, [programs]);

  // Summary stats derived from current data
  const stats = useMemo(() => {
    const active = certificates.filter(c => c.status === 'ACTIVE').length;
    const revoked = certificates.filter(c => c.status === 'REVOKED').length;
    return { total: totalItems, active, revoked };
  }, [certificates, totalItems]);

  const hasActiveFilters = filterHonors || filterStatus || filterProgram || filterDateFrom || filterDateTo;

  const clearFilters = () => {
    setSearchQuery('');
    setFilterHonors('');
    setFilterStatus('');
    setFilterProgram('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

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
    const confirmed = await confirm({
      title: 'Delete Certificate',
      message: `Are you sure you want to delete the certificate for ${cert.student_name}? This action cannot be undone.`,
    });
    if (!confirmed) return;
    // Snapshot for rollback, then optimistic remove
    const snapshot = certificates;
    setCertificates(prev => prev.filter(c => c.id !== cert.id));

    try {
      await certificateAPI.delete(cert.id);
      toast.success('Certificate deleted successfully');
    } catch (err) {
      if (err.response?.status === 404) {
        // Already gone from DB — keep it removed from UI
        toast.success('Certificate already deleted');
      } else {
        // Rollback
        setCertificates(snapshot);
        toast.error(err.response?.data?.error || 'Failed to delete certificate');
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-200 animate-pulse" />
          ))}
        </div>
        {/* Table skeleton */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <div className="h-6 w-64 rounded-lg bg-slate-200 animate-pulse" />
            <div className="h-10 w-28 rounded-lg bg-slate-200 animate-pulse" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded bg-slate-100 animate-pulse" />
            ))}
          </div>
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
    <div className="space-y-6">
      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryStatCard title="Total Certificates" value={stats.total} Icon={FileCheck} tone="info" />
        <SummaryStatCard title="Active" value={stats.active} Icon={CheckCircle} tone="positive" />
        <SummaryStatCard title="Revoked" value={stats.revoked} Icon={XCircle} tone="negative" />
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-extrabold text-slate-800">
            Certificate Registry
          </h2>
          <button
            onClick={fetchCertificates}
            className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
        
        {/* Search bar + status tabs */}
        <div className="px-6 pb-4">
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <label htmlFor="cert-search" className="sr-only">Search certificates</label>
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="cert-search"
                type="text"
                placeholder="Search by student name or certificate number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Clear search">
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`px-3 py-2 border rounded-lg text-sm flex items-center gap-1.5 transition ${showFilters || hasActiveFilters ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <Filter size={14} />
              Filters
              {hasActiveFilters && <span className="ml-1 w-2 h-2 rounded-full bg-blue-500 inline-block" />}
            </button>
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-2 mb-4">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setFilterStatus(opt.value); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  filterStatus === opt.value
                    ? 'bg-(--color-brand-dark) text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Filter controls */}
          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Honours</label>
                <select value={filterHonors} onChange={(e) => setFilterHonors(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition">
                  {HONORS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Program</label>
                <select value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition">
                  {programOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Date From</label>
                <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Date To</label>
                <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition" />
              </div>
              {hasActiveFilters && (
                <div className="col-span-2 md:col-span-4 flex justify-end">
                  <button onClick={clearFilters} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    <X size={12} /> Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {certificates.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <p>{(debouncedSearch || hasActiveFilters) ? 'No certificates match your search' : 'No certificates generated yet'}</p>
            {(debouncedSearch || hasActiveFilters) && (
              <button onClick={clearFilters} className="mt-2 text-sm text-blue-600 hover:text-blue-800 transition">Clear filters</button>
            )}
          </div>
        ) : (
          <>
            {/* Table */}
            <Table>
              <Table.Head>
                <tr>
                  <Table.HeaderCell>Certificate ID</Table.HeaderCell>
                  <Table.HeaderCell>Recipient</Table.HeaderCell>
                  <Table.HeaderCell>Program</Table.HeaderCell>
                  <Table.HeaderCell>Issued</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
                </tr>
              </Table.Head>
              <Table.Body>
                {certificates.map((cert) => (
                  <Table.Row key={cert.id}>
                    <Table.Cell>
                      <span className="text-sm font-medium text-blue-600 inline-flex items-center gap-1">
                        {formatCertId(cert.certificate_number)}
                        <button
                          type="button"
                          onClick={() => { navigator.clipboard.writeText(cert.certificate_number); toast.success('Certificate ID copied'); }}
                          className="p-0.5 rounded hover:bg-blue-100 text-blue-400 hover:text-blue-600 transition"
                          title="Copy certificate ID"
                        >
                          <Clipboard size={12} />
                        </button>
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <p className="text-sm font-medium text-slate-900">{cert.student_name}</p>
                      <p className="text-xs text-slate-400">{cert.degree_type_display} &middot; {cert.honors_display}</p>
                    </Table.Cell>
                    <Table.Cell className="text-sm text-slate-600">{cert.program}</Table.Cell>
                    <Table.Cell className="text-sm text-slate-500">{new Date(cert.date_awarded).toLocaleDateString()}</Table.Cell>
                    <Table.Cell>
                      {cert.status === 'REVOKED' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          <XCircle size={12} /> Revoked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle size={12} /> Active
                        </span>
                      )}
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                            onClick={() => onViewCertificate(cert)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                            title="Preview"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleDownload(cert)}
                            className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition"
                            title="Download PDF"
                          >
                            <Download size={16} />
                          </button>
                          {isSuperAdmin && (
                            <button
                              onClick={() => handleDelete(cert)}
                              className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
              </Table.Body>
            </Table>

            {totalPages > 1 && (
              <div className="p-6">
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
    </div>
  );
}