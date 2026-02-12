import React, { useState, useEffect } from "react";
import { useToast } from "../components/ToastContainer";
import { 
  Users, 
  FileText, 
  Shield, 
  Activity, 
  TrendingUp, 
  Database,
  Mail,
  Settings,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

export default function SuperAdminDashboard() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCertificates: 0,
    totalVerifications: 0,
    activeAdmins: 0,
    blockchainStatus: "healthy",
    recentActivities: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API calls
      const mockStats = {
        totalStudents: 1250,
        totalCertificates: 3420,
        totalVerifications: 8750,
        activeAdmins: 8,
        blockchainStatus: "healthy",
        recentActivities: [
          {
            id: 1,
            user: "Admin User",
            action: "Created certificate",
            target: "John Doe - Computer Science",
            timestamp: new Date(Date.now() - 1000 * 60 * 5),
            type: "certificate"
          },
          {
            id: 2,
            user: "Super Admin",
            action: "Added new admin",
            target: "faculty@uew.edu.gh",
            timestamp: new Date(Date.now() - 1000 * 60 * 15),
            type: "admin"
          },
          {
            id: 3,
            user: "Admin User",
            action: "Bulk imported students",
            target: "45 students",
            timestamp: new Date(Date.now() - 1000 * 60 * 30),
            type: "student"
          },
          {
            id: 4,
            user: "System",
            action: "Blockchain verification",
            target: "Certificate #2025-CS-001",
            timestamp: new Date(Date.now() - 1000 * 60 * 45),
            type: "blockchain"
          }
        ]
      };
      setStats(mockStats);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    return `${Math.floor(hours / 24)} days ago`;
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "certificate": return <FileText size={16} className="text-blue-600" />;
      case "admin": return <Shield size={16} className="text-purple-600" />;
      case "student": return <Users size={16} className="text-green-600" />;
      case "blockchain": return <Database size={16} className="text-indigo-600" />;
      default: return <Activity size={16} className="text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <div className="h-8 w-64 rounded-lg bg-slate-200 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-lg p-6">
              <div className="h-6 w-32 rounded bg-slate-200 animate-pulse mb-2" />
              <div className="h-8 w-20 rounded bg-slate-200 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">System overview and administrative controls</p>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalStudents.toLocaleString()}</p>
            </div>
            <Users size={32} className="text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Certificates</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCertificates.toLocaleString()}</p>
            </div>
            <FileText size={32} className="text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Verifications</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalVerifications.toLocaleString()}</p>
            </div>
            <Eye size={32} className="text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Admins</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeAdmins}</p>
            </div>
            <Shield size={32} className="text-orange-500" />
          </div>
        </div>
      </div>

      {/* Blockchain Status */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Blockchain Status</h2>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
            stats.blockchainStatus === "healthy" 
              ? "bg-green-100 text-green-800" 
              : "bg-red-100 text-red-800"
          }`}>
            {stats.blockchainStatus === "healthy" ? (
              <>
                <CheckCircle size={16} />
                Healthy
              </>
            ) : (
              <>
                <AlertCircle size={16} />
                Issues Detected
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Database size={24} className="mx-auto mb-2 text-indigo-600" />
            <p className="text-sm text-gray-600">Blocks Mined</p>
            <p className="text-lg font-bold text-gray-900">1,247</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <TrendingUp size={24} className="mx-auto mb-2 text-green-600" />
            <p className="text-sm text-gray-600">Network Hashrate</p>
            <p className="text-lg font-bold text-gray-900">2.4 TH/s</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Clock size={24} className="mx-auto mb-2 text-blue-600" />
            <p className="text-sm text-gray-600">Avg Block Time</p>
            <p className="text-lg font-bold text-gray-900">12.5s</p>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Admin Activities</h2>
        <div className="space-y-3">
          {stats.recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition">
              <div className="flex items-center gap-3">
                {getActivityIcon(activity.type)}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    <span className="font-semibold">{activity.user}</span> {activity.action}
                  </p>
                  <p className="text-sm text-gray-600">{activity.target}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
