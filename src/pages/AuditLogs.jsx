import React, { useState, useEffect } from "react";
import { useToast } from "../components/ToastContainer";
import { 
  FileText, 
  Shield, 
  Users, 
  Activity, 
  Database,
  Search,
  Filter,
  Download,
  Calendar,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";
import Pagination from "../components/Pagination";

export default function AuditLogs() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("admin");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  const [logs, setLogs] = useState({
    admin: [],
    security: [],
    login: []
  });

  useEffect(() => {
    fetchAuditLogs();
  }, [activeTab]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API calls
      const mockLogs = {
        admin: [
          {
            id: 1,
            user: "Super Admin",
            action: "Created new admin account",
            target: "faculty@uew.edu.gh",
            timestamp: new Date(Date.now() - 1000 * 60 * 5),
            ip: "192.168.1.100",
            status: "success",
            details: "Admin role assigned, full permissions granted"
          },
          {
            id: 2,
            user: "Admin User",
            action: "Modified certificate template",
            target: "Computer Science Degree Template",
            timestamp: new Date(Date.now() - 1000 * 60 * 15),
            ip: "192.168.1.101",
            status: "success",
            details: "Updated logo and signature positions"
          },
          {
            id: 3,
            user: "Admin User",
            action: "Bulk imported students",
            target: "45 students from Computer Science",
            timestamp: new Date(Date.now() - 1000 * 60 * 30),
            ip: "192.168.1.101",
            status: "success",
            details: "Excel file processed, all records validated"
          },
          {
            id: 4,
            user: "Super Admin",
            action: "Deactivated admin account",
            target: "retired@uew.edu.gh",
            timestamp: new Date(Date.now() - 1000 * 60 * 45),
            ip: "192.168.1.100",
            status: "success",
            details: "Account deactivated due to role change"
          }
        ],
        security: [
          {
            id: 1,
            user: "System",
            action: "Failed login attempt",
            target: "admin@uew.edu.gh",
            timestamp: new Date(Date.now() - 1000 * 60 * 2),
            ip: "192.168.1.50",
            status: "failed",
            details: "Invalid password - attempt 3 of 5"
          },
          {
            id: 2,
            user: "System",
            action: "Suspicious activity detected",
            target: "Multiple login attempts",
            timestamp: new Date(Date.now() - 1000 * 60 * 10),
            ip: "192.168.1.75",
            status: "warning",
            details: "10 failed attempts from same IP in 5 minutes"
          },
          {
            id: 3,
            user: "System",
            action: "Password reset requested",
            target: "user@uew.edu.gh",
            timestamp: new Date(Date.now() - 1000 * 60 * 20),
            ip: "192.168.1.80",
            status: "success",
            details: "Reset email sent successfully"
          }
        ],
        login: [
          {
            id: 1,
            user: "Super Admin",
            action: "Login successful",
            target: "Super Admin Dashboard",
            timestamp: new Date(Date.now() - 1000 * 60 * 3),
            ip: "192.168.1.100",
            status: "success",
            details: "Session initiated, 2FA verified"
          },
          {
            id: 2,
            user: "Admin User",
            action: "Login successful",
            target: "Admin Dashboard",
            timestamp: new Date(Date.now() - 1000 * 60 * 8),
            ip: "192.168.1.101",
            status: "success",
            details: "Session initiated"
          },
          {
            id: 3,
            user: "Unknown",
            action: "Login failed",
            target: "Admin access",
            timestamp: new Date(Date.now() - 1000 * 60 * 12),
            ip: "192.168.1.50",
            status: "failed",
            details: "Invalid credentials"
          },
          {
            id: 4,
            user: "Admin User",
            action: "Logout",
            target: "Admin Dashboard",
            timestamp: new Date(Date.now() - 1000 * 60 * 25),
            ip: "192.168.1.101",
            status: "success",
            details: "Session terminated"
          }
        ]
      };
      
      setLogs(mockLogs);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(timestamp);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "success": return <CheckCircle size={16} className="text-green-600" />;
      case "failed": return <XCircle size={16} className="text-red-600" />;
      case "warning": return <AlertTriangle size={16} className="text-yellow-600" />;
      default: return <Activity size={16} className="text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "success": return "bg-green-100 text-green-800";
      case "failed": return "bg-red-100 text-red-800";
      case "warning": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const currentLogs = logs[activeTab] || [];
  const filteredLogs = currentLogs.filter(log => 
    log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.target.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination calculations
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const exportLogs = () => {
    // Mock export functionality
    toast.success("Audit logs exported successfully");
  };

  const tabs = [
    { id: "admin", label: "Admin Activity", icon: Shield },
    { id: "security", label: "Security Logs", icon: AlertTriangle },
    { id: "login", label: "Login Attempts", icon: Users }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <div className="h-8 w-64 rounded-lg bg-slate-200 animate-pulse" />
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
                <div className="h-4 w-48 rounded bg-slate-200 animate-pulse" />
                <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-600 mt-2">System activity and security monitoring</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
          <button
            onClick={exportLogs}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Download size={18} />
            Export Logs
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {log.user}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {log.target}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.ip}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(log.status)}`}>
                        {log.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <p>No audit logs found</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
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
}
