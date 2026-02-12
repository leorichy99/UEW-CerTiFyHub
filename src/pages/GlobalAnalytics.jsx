import React, { useState, useEffect } from "react";
import { useToast } from "../components/ToastContainer";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  FileText, 
  Eye, 
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart,
  Activity,
  Building
} from "lucide-react";

export default function GlobalAnalytics() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");
  const [activeChart, setActiveChart] = useState("issuance");
  
  const [analytics, setAnalytics] = useState({
    issuanceTrends: [],
    verificationTrends: [],
    departmentBreakdown: [],
    summary: {
      totalIssued: 0,
      totalVerified: 0,
      growthRate: 0,
      verificationRate: 0
    }
  });

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API calls
      const mockAnalytics = {
        issuanceTrends: [
          { date: "2025-01-01", issued: 45, verified: 32 },
          { date: "2025-01-02", issued: 52, verified: 41 },
          { date: "2025-01-03", issued: 38, verified: 28 },
          { date: "2025-01-04", issued: 61, verified: 45 },
          { date: "2025-01-05", issued: 49, verified: 36 },
          { date: "2025-01-06", issued: 55, verified: 42 },
          { date: "2025-01-07", issued: 43, verified: 33 },
          { date: "2025-01-08", issued: 58, verified: 44 },
          { date: "2025-01-09", issued: 47, verified: 35 },
          { date: "2025-01-10", issued: 63, verified: 48 },
          { date: "2025-01-11", issued: 51, verified: 39 },
          { date: "2025-01-12", issued: 44, verified: 32 }
        ],
        verificationTrends: [
          { date: "2025-01-01", qr: 15, blockchain: 8, api: 9 },
          { date: "2025-01-02", qr: 18, blockchain: 12, api: 11 },
          { date: "2025-01-03", qr: 14, blockchain: 7, api: 7 },
          { date: "2025-01-04", qr: 22, blockchain: 13, api: 10 },
          { date: "2025-01-05", qr: 19, blockchain: 11, api: 6 },
          { date: "2025-01-06", qr: 21, blockchain: 14, api: 7 },
          { date: "2025-01-07", qr: 16, blockchain: 9, api: 8 },
          { date: "2025-01-08", qr: 24, blockchain: 15, api: 5 },
          { date: "2025-01-09", qr: 20, blockchain: 12, api: 3 },
          { date: "2025-01-10", qr: 26, blockchain: 16, api: 6 },
          { date: "2025-01-11", qr: 23, blockchain: 14, api: 2 },
          { date: "2025-01-12", qr: 19, blockchain: 11, api: 2 }
        ],
        departmentBreakdown: [
          { department: "Computer Science", issued: 245, verified: 189, growth: 12.5 },
          { department: "Business Administration", issued: 198, verified: 156, growth: 8.3 },
          { department: "Education", issued: 167, verified: 134, growth: 15.2 },
          { department: "Engineering", issued: 143, verified: 112, growth: 9.7 },
          { department: "Arts & Sciences", issued: 128, verified: 98, growth: 6.4 },
          { department: "Health Sciences", issued: 95, verified: 78, growth: 18.9 }
        ],
        summary: {
          totalIssued: 976,
          totalVerified: 767,
          growthRate: 11.8,
          verificationRate: 78.6
        }
      };
      
      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const exportAnalytics = () => {
    // Mock export functionality
    toast.success("Analytics data exported successfully");
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <div className="h-8 w-64 rounded-lg bg-slate-200 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
        <h1 className="text-3xl font-bold text-gray-900">Global Analytics</h1>
        <p className="text-gray-600 mt-2">System-wide insights and trends</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Issued</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.summary.totalIssued)}</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp size={16} className="text-green-600" />
                <span className="text-sm text-green-600">+{analytics.summary.growthRate}%</span>
              </div>
            </div>
            <FileText size={32} className="text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Verified</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.summary.totalVerified)}</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp size={16} className="text-green-600" />
                <span className="text-sm text-green-600">+8.2%</span>
              </div>
            </div>
            <Eye size={32} className="text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Verification Rate</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.summary.verificationRate}%</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp size={16} className="text-green-600" />
                <span className="text-sm text-green-600">+2.1%</span>
              </div>
            </div>
            <BarChart3 size={32} className="text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Departments</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.departmentBreakdown.length}</p>
              <div className="flex items-center gap-1 mt-2">
                <Activity size={16} className="text-blue-600" />
                <span className="text-sm text-blue-600">All active</span>
              </div>
            </div>
            <Building size={32} className="text-orange-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
          </div>
          <button
            onClick={exportAnalytics}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Download size={18} />
            Export Analytics
          </button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Issuance Trends */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Issuance Trends</h2>
            <button
              onClick={() => setActiveChart("issuance")}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                activeChart === "issuance" 
                  ? "bg-blue-100 text-blue-800" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <BarChart3 size={16} className="inline mr-1" />
              Chart View
            </button>
          </div>
          <div className="space-y-4">
            {analytics.issuanceTrends.slice(0, 6).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{formatDate(item.date)}</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-900">{item.issued} issued</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-900">{item.verified} verified</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Verification Methods */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Verification Methods</h2>
            <button
              onClick={() => setActiveChart("verification")}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                activeChart === "verification" 
                  ? "bg-blue-100 text-blue-800" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <PieChart size={16} className="inline mr-1" />
              Breakdown
            </button>
          </div>
          <div className="space-y-4">
            {analytics.verificationTrends.slice(0, 6).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{formatDate(item.date)}</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-sm text-gray-900">{item.qr} QR</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                    <span className="text-sm text-gray-900">{item.blockchain} BC</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-sm text-gray-900">{item.api} API</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Department Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Certificates Issued</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verified</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verification Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Growth</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.departmentBreakdown.map((dept, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {dept.department}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatNumber(dept.issued)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatNumber(dept.verified)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {((dept.verified / dept.issued) * 100).toFixed(1)}%
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {dept.growth > 0 ? (
                        <TrendingUp size={16} className="text-green-600" />
                      ) : (
                        <TrendingDown size={16} className="text-red-600" />
                      )}
                      <span className={`text-sm font-medium ${
                        dept.growth > 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        {dept.growth > 0 ? "+" : ""}{dept.growth}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
