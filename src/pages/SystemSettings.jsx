import React, { useState } from "react";
import { useToast } from "../components/ToastContainer";
import { 
  QrCode, 
  Save, 
  Shield
} from "lucide-react";
import PageTitle from "../components/PageTitle";

export default function SystemSettings() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("email");

  const [certificateSettings, setCertificateSettings] = useState({
    idPrefix: "UEW",
    idFormat: "UEW-{year}-{department}-{sequence}",
    sequenceStart: 1000,
    qrEnabled: true,
    qrSize: 256,
    qrErrorCorrection: "M",
    blockchainEnabled: true
  });

  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    require2FA: false,
    passwordMinLength: 8,
    passwordRequireSpecial: true,
    auditLogRetention: 90
  });

  const handleSaveCertificate = async () => {
    setLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Certificate settings saved successfully");
    } catch (error) {
      toast.error("Failed to save certificate settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSecurity = async () => {
    setLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Security settings saved successfully");
    } catch (error) {
      toast.error("Failed to save security settings");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "certificate", label: "Certificate ID & QR", icon: QrCode },
    { id: "security", label: "Security Policies", icon: Shield }
  ];

  return (
    <div className="p-6">
      <PageTitle>System Settings</PageTitle>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 mb-8">
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
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Certificate Settings */}
      {activeTab === "certificate" && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-extrabold text-slate-900 mb-6">Certificate ID & QR Settings</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ID Prefix</label>
                <input
                  type="text"
                  value={certificateSettings.idPrefix}
                  onChange={(e) => setCertificateSettings({...certificateSettings, idPrefix: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ID Format</label>
                <input
                  type="text"
                  value={certificateSettings.idFormat}
                  onChange={(e) => setCertificateSettings({...certificateSettings, idFormat: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sequence Start</label>
                <input
                  type="number"
                  value={certificateSettings.sequenceStart}
                  onChange={(e) => setCertificateSettings({...certificateSettings, sequenceStart: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">QR Size (px)</label>
                <input
                  type="number"
                  value={certificateSettings.qrSize}
                  onChange={(e) => setCertificateSettings({...certificateSettings, qrSize: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">QR Error Correction</label>
                <select
                  value={certificateSettings.qrErrorCorrection}
                  onChange={(e) => setCertificateSettings({...certificateSettings, qrErrorCorrection: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
                >
                  <option value="L">Low (7%)</option>
                  <option value="M">Medium (15%)</option>
                  <option value="Q">Quartile (25%)</option>
                  <option value="H">High (30%)</option>
                </select>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="qrEnabled"
                  checked={certificateSettings.qrEnabled}
                  onChange={(e) => setCertificateSettings({...certificateSettings, qrEnabled: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="qrEnabled" className="ml-2 text-sm text-slate-700">Enable QR codes on certificates</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="blockchainEnabled"
                  checked={certificateSettings.blockchainEnabled}
                  onChange={(e) => setCertificateSettings({...certificateSettings, blockchainEnabled: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="blockchainEnabled" className="ml-2 text-sm text-slate-700">Enable blockchain verification</label>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveCertificate}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={18} />
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Settings */}
      {activeTab === "security" && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-extrabold text-slate-900 mb-6">Security Policies</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Session Timeout (minutes)</label>
                <input
                  type="number"
                  value={securitySettings.sessionTimeout}
                  onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Max Login Attempts</label>
                <input
                  type="number"
                  value={securitySettings.maxLoginAttempts}
                  onChange={(e) => setSecuritySettings({...securitySettings, maxLoginAttempts: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Lockout Duration (minutes)</label>
                <input
                  type="number"
                  value={securitySettings.lockoutDuration}
                  onChange={(e) => setSecuritySettings({...securitySettings, lockoutDuration: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Password Min Length</label>
                <input
                  type="number"
                  value={securitySettings.passwordMinLength}
                  onChange={(e) => setSecuritySettings({...securitySettings, passwordMinLength: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Audit Log Retention (days)</label>
                <input
                  type="number"
                  value={securitySettings.auditLogRetention}
                  onChange={(e) => setSecuritySettings({...securitySettings, auditLogRetention: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="require2FA"
                  checked={securitySettings.require2FA}
                  onChange={(e) => setSecuritySettings({...securitySettings, require2FA: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="require2FA" className="ml-2 text-sm text-slate-700">Require 2FA for Admin accounts</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="passwordRequireSpecial"
                  checked={securitySettings.passwordRequireSpecial}
                  onChange={(e) => setSecuritySettings({...securitySettings, passwordRequireSpecial: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="passwordRequireSpecial" className="ml-2 text-sm text-slate-700">Require special characters in passwords</label>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveSecurity}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={18} />
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
