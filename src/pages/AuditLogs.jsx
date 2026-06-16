import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useToast } from "../components/ToastContainer";
import { superAdminAPI } from "../services/api";
import { 
  FileText, 
  Shield, 
  Users, 
  Activity, 
  Database,
  Search,
  Download,
  Calendar,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
} from "lucide-react";
import PageTitle from "../components/PageTitle";
import Pagination from "../components/Pagination";
import RefreshButton from "../components/ui/RefreshButton";
import Table from "../components/ui/Table";

export default React.memo(function AuditLogs() {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("admin");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [initialLoad, setInitialLoad] = useState(true);
  
  const [logs, setLogs] = useState([]);
  const [totalItems, setTotalItems] = useState(0);

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
  }, [activeTab, dateFilter, statusFilter]);

  const initialLoadDoneRef = useRef(false);
  const fetchAuditLogs = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await superAdminAPI.getAuditLogs({
        category: activeTab,
        search: debouncedSearch,
        date: dateFilter,
        status: statusFilter,
        page: currentPage,
        page_size: itemsPerPage,
      });
      setLogs(data.results || []);
      setTotalItems(data.count || 0);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      toastRef.current.error("Failed to load audit logs");
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
      setInitialLoad(false);
      initialLoadDoneRef.current = true;
    }
  }, [activeTab, debouncedSearch, dateFilter, statusFilter, currentPage, itemsPerPage]);

  useEffect(() => {
    // Use silent refresh once the initial load completes so filter changes
    // don't unmount the table.
    fetchAuditLogs({ silent: initialLoadDoneRef.current });
  }, [fetchAuditLogs]);

  const handleRefresh = useCallback(async () => {
    await fetchAuditLogs({ silent: true });
    toastRef.current.success("Audit logs refreshed");
  }, [fetchAuditLogs]);

  const formatTimestamp = (timestamp) => {
    const d = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(d);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "success": return "bg-green-100 text-green-800";
      case "failed": return "bg-red-100 text-red-800";
      case "warning": return "bg-yellow-100 text-yellow-800";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  // Server-side pagination — logs already filtered & paginated
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedLogs = logs;

  const handleItemsPerPageChange = useCallback((newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  }, []);

  const exportLogs = useCallback(async () => {
    try {
      // Fetch all logs for current filters (up to 1000)
      const { data } = await superAdminAPI.getAuditLogs({
        category: activeTab,
        search: debouncedSearch,
        date: dateFilter,
        status: statusFilter,
        page: 1,
        page_size: 1000,
      });
      const exportData = (data.results || []).map((log) => ({
        id: log.id,
        timestamp: log.timestamp,
        user: log.user,
        action: log.action,
        target: log.target,
        ip: log.ip,
        status: log.status,
        details: log.details,
        category: activeTab,
      }));
      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `audit_${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toastRef.current.success('Audit logs exported successfully');
    } catch (err) {
      console.error('Failed to export audit logs:', err);
      toastRef.current.error('Failed to export audit logs');
    }
  }, [activeTab, debouncedSearch, dateFilter, statusFilter]);

  const tabs = [
    { id: "admin", label: "Admin Activity"},
    { id: "provisioning", label: "Provisioning"},
    { id: "credentials", label: "Credentials"},
    { id: "permissions", label: "Permissions"},
    { id: "security", label: "Security Logs"},
    { id: "login", label: "Login Attempts"},
    { id: "verification", label: "Verification"}
  ];

  return (
    <div className="">
      <PageTitle>Audit Logs</PageTitle>
      {/* Tab Navigation */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === tab.id
                    ? "border-[#242576] text-[#242576]"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Filters and Search */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <label htmlFor="audit-search" className="sr-only">Search logs</label>
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                id="audit-search"
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
              />
            </div>
            <label htmlFor="audit-date-filter" className="sr-only">Date filter</label>
            <select
              id="audit-date-filter"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
            <label htmlFor="audit-status-filter" className="sr-only">Status filter</label>
            <select
              id="audit-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="warning">Warning</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <RefreshButton onClick={handleRefresh} spinning={refreshing} />
            <button
              onClick={exportLogs}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download size={14} />
              Export Logs
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white shadow-lg overflow-hidden">
        <Table>
          <Table.Head>
            <tr>
              <Table.HeaderCell>Timestamp</Table.HeaderCell>
              <Table.HeaderCell>User</Table.HeaderCell>
              <Table.HeaderCell>Action</Table.HeaderCell>
              <Table.HeaderCell>Target</Table.HeaderCell>
              <Table.HeaderCell>IP</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Details</Table.HeaderCell>
            </tr>
          </Table.Head>
          <Table.Body>
            {paginatedLogs.map((log) => (
              <Table.Row key={log.id}>
                <Table.Cell className="text-sm text-slate-900">
                  {formatTimestamp(log.timestamp)}
                </Table.Cell>
                <Table.Cell className="text-sm font-medium text-slate-900">
                  {log.user}
                </Table.Cell>
                <Table.Cell className="text-sm text-slate-900">
                  {log.action}
                </Table.Cell>
                <Table.Cell className="text-sm text-slate-900">
                  {log.target}
                </Table.Cell>
                <Table.Cell className="text-sm text-slate-500">
                  {log.ip}
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-sm font-medium rounded-full ${getStatusBadge(log.status)}`}>
                      {log.status}
                    </span>
                  </div>
                </Table.Cell>
                <Table.Cell className="text-sm text-slate-500">
                  {log.details}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>

        {logs.length === 0 && !loading && (
          <div className="text-center py-12 text-slate-500">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <p>No audit logs found</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-2 py-2 border-t border-slate-200">
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
  );
});
