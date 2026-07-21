import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "../components/ToastContainer";
import api, { certificateAPI } from "../services/api";
import Pagination from "../components/Pagination";
import SummaryStatCard from "../components/SummaryStatCard";
import PageSkeleton from "../components/ui/PageSkeleton";
import Table from "../components/ui/Table";
import {
  FileText,
  Search,
  Download,
  Eye,
  FileCheck,
  Ban,
  Power,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clipboard,
} from "lucide-react";
import { useConfirmDialog } from '../context/ConfirmDialogContext';
import CertificatePreview from '../components/CertificatePreview';
import PageTitle from "../components/PageTitle";
import RefreshButton from '../components/ui/RefreshButton';

export default function SuperAdminCertificatesPage() {
  const confirm = useConfirmDialog();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [certificates, setCertificates] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState({
    totalIssued: 0,
    active: 0,
    revoked: 0,
    growthThisMonth: 0,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("30d");
  const [batchFilter, setBatchFilter] = useState("all");
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Action state
  const [actionLoading, setActionLoading] = useState(null);

  // Preview modal
  const [previewCertificate, setPreviewCertificate] = useState(null);

  // Debounce search
  const searchTimerRef = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [departmentFilter, batchFilter, statusFilter, dateFilter]);

  // Build query params for backend
  const buildParams = useCallback(() => {
    const params = { page: currentPage, page_size: itemsPerPage };
    if (debouncedSearch) params.search = debouncedSearch;
    if (departmentFilter !== "all") params.program = departmentFilter;
    if (batchFilter !== "all") params.batch_id = batchFilter;
    if (statusFilter !== "all") params.status = statusFilter;
    if (dateFilter !== "all") {
      const now = new Date();
      let cutoff;
      if (dateFilter === "7d") cutoff = new Date(now - 7 * 86400000);
      else if (dateFilter === "30d") cutoff = new Date(now - 30 * 86400000);
      else if (dateFilter === "90d") cutoff = new Date(now - 90 * 86400000);
      else if (dateFilter === "1y") cutoff = new Date(now - 365 * 86400000);
      if (cutoff) params.date_from = cutoff.toISOString().slice(0, 10);
    }
    return params;
  }, [currentPage, itemsPerPage, debouncedSearch, departmentFilter, batchFilter, statusFilter, dateFilter]);

  // Fetch certificates page (silent flag avoids the full-page skeleton)
  const initialLoadDoneRef = useRef(false);
  const fetchCertificates = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await certificateAPI.getAll(buildParams());
      const data = res.data;
      const results = data.results || (Array.isArray(data) ? data : []);
      const count = data.count ?? results.length;
      setCertificates(results);
      setTotalItems(count);
    } catch (err) {
      console.error("Failed to fetch certificates:", err);
      toastRef.current.error("Failed to load certificates");
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
      initialLoadDoneRef.current = true;
    }
  }, [buildParams]);

  // Fetch lightweight stats (all certs, no body data needed)
  const fetchStats = useCallback(async () => {
    try {
      // Fetch minimal pages for active / revoked counts
      const [allRes, revokedRes] = await Promise.all([
        certificateAPI.getAll({ page: 1, page_size: 1 }),
        certificateAPI.getAll({ page: 1, page_size: 1, status: "REVOKED" }),
      ]);
      const total = allRes.data.count ?? 0;
      const revoked = revokedRes.data.count ?? 0;
      const active = total - revoked;

      setStats({
        totalIssued: total,
        active,
        revoked,
        growthThisMonth: 0,
      });
    } catch {
      // stats are non-critical, keep defaults
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchCertificates({ silent: true }), fetchStats()]);
    toastRef.current.success("Data refreshed");
  }, [fetchCertificates, fetchStats]);

  // Fetch departments and batches once
  useEffect(() => {
    (async () => {
      try {
        const [certRes, batchRes] = await Promise.all([
          certificateAPI.getAll({ page: 1, page_size: 200 }),
          api.get("/registry/batches/", { params: { page_size: 200 } }),
        ]);
        const certResults = certRes.data.results || (Array.isArray(certRes.data) ? certRes.data : []);
        const uniqueDepts = [...new Set(certResults.map((c) => c.program).filter(Boolean))];
        setDepartments(uniqueDepts);
        const batchResults = batchRes.data?.results || batchRes.data || [];
        setBatches(batchResults);
      } catch { /* ignore */ }
    })();
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    // Use silent refresh once initial load is done so filter changes don't
    // re-trigger the full-page skeleton.
    fetchCertificates({ silent: initialLoadDoneRef.current });
  }, [fetchCertificates]);

  // Pagination (server-side)
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handleItemsPerPageChange = useCallback((val) => {
    setItemsPerPage(val);
    setCurrentPage(1);
  }, []);

  // Actions
  const handleRevoke = async (cert) => {
    const ok = await confirm({
      title: 'Revoke Certificate',
      message: `Revoke certificate for ${cert.student_name}? This will invalidate the certificate.`,
      confirmLabel: 'Revoke',
      variant: 'danger',
    });
    if (!ok) return;
    setActionLoading(cert.id);
    try {
      await certificateAPI.revoke(cert.id);
      toast.success("Certificate revoked successfully");
      fetchCertificates({ silent: true });
      fetchStats();
    } catch (err) {
      toast.error("Failed to revoke certificate");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (cert) => {
    const ok = await confirm({
      title: 'Reactivate Certificate',
      message: `Reactivate certificate for ${cert.student_name}?`,
      confirmLabel: 'Reactivate',
      variant: 'success',
    });
    if (!ok) return;
    setActionLoading(cert.id);
    try {
      await certificateAPI.reactivate(cert.id);
      toast.success("Certificate reactivated successfully");
      fetchCertificates({ silent: true });
      fetchStats();
    } catch (err) {
      toast.error("Failed to reactivate certificate");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePreview = (cert) => {
    setPreviewCertificate(cert);
  };

  const handleVerifyLog = (cert) => {
    navigate(`/verify/${cert.certificate_number}`);
  };

  const exportCertificates = () => {
    const csv = [
      ["Certificate ID", "Student Name", "Department", "Date Issued", "Status"].join(","),
      ...certificates.map((c) =>
        [
          c.certificate_number,
          c.student_name,
          c.program,
          formatDate(c.generated_date),
          c.status,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "certificates_export.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Certificates exported");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const truncateHash = (id) => {
    const str = String(id);
    if (str.length <= 12) return str;
    return `${str.slice(0, 6)}...${str.slice(-4)}`;
  };

  const formatCertId = (certNumber) => {
    if (!certNumber) return "";
    return certNumber;
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <PageSkeleton/>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageTitle className="mb-5">All Certificates</PageTitle>
      
      <div className="">
        {/* Overview Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <SummaryStatCard
            title="Total Issued"
            value={stats.totalIssued.toLocaleString()}
            Icon={FileText}
            tone="neutral"
            trend={`${stats.growthThisMonth > 0 ? `+${stats.growthThisMonth}%` : `${stats.growthThisMonth}%`} this month`}
          />
          <SummaryStatCard
            title="Active"
            value={stats.active.toLocaleString()}
            Icon={CheckCircle}
            tone="positive"
            trend={stats.totalIssued > 0
              ? `${((stats.active / stats.totalIssued) * 100).toFixed(1)}% of total`
              : "0% of total"}
          />
          <SummaryStatCard
            title="Revoked"
            value={stats.revoked.toLocaleString()}
            Icon={XCircle}
            tone="negative"
            trend={stats.revoked > 0 ? "High priority alerts" : "No revocations"}
            trendPositive={stats.revoked === 0}
          />
        </div>

        {/* Filters Bar */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search by ID, Student Name, or Hash..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search certificates"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
              />
            </div>

            {/* Department Filter */}
            <div className="relative">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                aria-label="Filter by department"
                className="appearance-none pl-4 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-45"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>

            {/* Batch Filter */}
            <div className="relative">
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                aria-label="Filter by batch"
                className="appearance-none pl-4 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-48"
              >
                <option value="all">All Batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.reference_name || b.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>

            {/* Date Filter */}
            <div className="relative">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                aria-label="Filter by date range"
                className="appearance-none pl-4 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-42.5"
              >
                <option value="7d">Date: Last 7 Days</option>
                <option value="30d">Date: Last 30 Days</option>
                <option value="90d">Date: Last 90 Days</option>
                <option value="1y">Date: Last Year</option>
                <option value="all">Date: All Time</option>
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>

            {/* Status, Refresh & Export buttons */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by status"
                  className="appearance-none pl-4 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-40"
                >
                  <option value="all">All Statuses</option>
                  <option value="ISSUED">Active</option>
                  <option value="REVOKED">Revoked</option>
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
              <RefreshButton onClick={handleRefresh} spinning={refreshing} />
              <button
                onClick={exportCertificates}
                title="Export CSV"
                className="rounded-lg border border-slate-200 p-2.5 text-slate-500 shadow-sm transition-colors duration-200 hover:bg-blue-50 hover:text-blue-600"
              >
                <Download size={18} className="text-slate-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Certificate Registry Table */}
        <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <Table.Head>
              <tr>
                <Table.HeaderCell>Certificate ID</Table.HeaderCell>
                <Table.HeaderCell>Recipient</Table.HeaderCell>
                <Table.HeaderCell>Batch</Table.HeaderCell>
                <Table.HeaderCell>Department</Table.HeaderCell>
                <Table.HeaderCell>Date Issued</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
              </tr>
            </Table.Head>
            <Table.Body>
              {certificates.map((cert) => (
                <Table.Row key={cert.id}>
                  {/* Certificate ID */}
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

                  {/* Recipient */}
                  <Table.Cell>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {cert.student_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {cert.degree_type_display || cert.degree_type || ""}
                        {cert.honors_display ? ` · ${cert.honors_display}` : ""}
                      </p>
                    </div>
                  </Table.Cell>

                  {/* Batch */}
                  <Table.Cell>
                    {cert.batch_id ? (
                      <Link
                        to={`/admin/batches/${cert.batch_id}?tab=issuance&highlight_cert=${cert.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {cert.batch_reference_name || "—"}
                      </Link>
                    ) : (
                      <span className="text-sm text-slate-500">—</span>
                    )}
                  </Table.Cell>

                  {/* Department */}
                  <Table.Cell>
                    <span className="text-sm text-slate-700">
                      {cert.program || "—"}
                    </span>
                  </Table.Cell>

                  {/* Issued Date */}
                  <Table.Cell>
                    <span className="text-sm text-slate-700">
                      {formatDate(cert.generated_date || cert.date_awarded)}
                    </span>
                  </Table.Cell>

                  {/* Status */}
                  <Table.Cell>
                    {cert.status === "ISSUED" ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-extrabold bg-emerald-100 text-emerald-700 uppercase tracking-wide">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-extrabold bg-red-100 text-red-700 uppercase tracking-wide">
                        Revoked
                      </span>
                    )}
                  </Table.Cell>

                  {/* Actions */}
                  <Table.Cell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* View Preview */}
                      <button
                        onClick={() => handlePreview(cert)}
                        title="View certificate"
                        className="rounded-lg p-2 text-slate-400 shadow-sm transition-colors duration-200 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Eye size={18} />
                      </button>

                      {/* Verify / Log */}
                      <button
                        onClick={() => handleVerifyLog(cert)}
                        title="View blockchain receipt"
                        className="rounded-lg p-2 text-slate-400 shadow-sm transition-colors duration-200 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <FileCheck size={18} />
                      </button>

                        {/* Revoke / Reactivate */}
                        {cert.status === "ISSUED" ? (
                          <button
                            onClick={() => handleRevoke(cert)}
                            disabled={actionLoading === cert.id}
                            title="Revoke certificate"
                            className="rounded-lg p-2 text-slate-400 shadow-sm transition-colors duration-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            {actionLoading === cert.id ? (
                              <div className="h-4.5 w-4.5 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Ban size={18} />
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(cert)}
                            disabled={actionLoading === cert.id}
                            title="Reactivate certificate"
                            className="rounded-lg p-2 text-slate-400 shadow-sm transition-colors duration-200 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
                          >
                            {actionLoading === cert.id ? (
                              <div className="h-4.5 w-4.5 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Power size={18} />
                            )}
                          </button>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>

          {/* Empty state */}
          {certificates.length === 0 && (
            <div className="text-center py-16">
              <FileText size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 text-sm">No certificates found</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages >= 1 && (
            <div className="px-6 py-4 border-t border-slate-200">
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
        </div>
      </div>

      {/* Preview Modal */}
      {previewCertificate && (
        <CertificatePreview
          certificate={previewCertificate}
          onClose={() => setPreviewCertificate(null)}
        />
      )}
    </div>
  );
}
