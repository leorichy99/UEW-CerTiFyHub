import React, { useState, useEffect } from "react";
import { useToast } from "../components/ToastContainer";
import { 
  Settings, 
  Mail, 
  Database, 
  QrCode, 
  Hash, 
  Save, 
  Shield,
  Bell,
  Globe,
  Lock
} from "lucide-react";

export default function SystemSettings() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("email");
  
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUser: "noreply@uew.edu.gh",
    smtpPassword: "",
    useTLS: true,
    fromEmail: "noreply@uew.edu.gh",
    fromName: "UEW CerTiFyHub"
  });

  const [blockchainSettings, setBlockchainSettings] = useState({
    network: "ethereum",
    rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
    contractAddress: "0x1234567890123456789012345678901234567890",
    gasLimit: 21000,
    gasPrice: "auto",
    confirmations: 12
  });

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

  const handleSaveEmail = async () => {
    setLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Email settings saved successfully");
    } catch (error) {
      toast.error("Failed to save email settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBlockchain = async () => {
    setLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Blockchain settings saved successfully");
    } catch (error) {
      toast.error("Failed to save blockchain settings");
    } finally {
      setLoading(false);
    }
  };

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
    { id: "email", label: "Email Configuration", icon: Mail },
    { id: "blockchain", label: "Blockchain Settings", icon: Database },
    { id: "certificate", label: "Certificate ID & QR", icon: QrCode },
    { id: "security", label: "Security Policies", icon: Shield }
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600 mt-2">Configure system-wide settings and preferences</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
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

      {/* Email Settings */}
      {activeTab === "email" && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Email Configuration</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host</label>
                <input
                  type="text"
                  value={emailSettings.smtpHost}
                  onChange={(e) => setEmailSettings({...emailSettings, smtpHost: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
                <input
                  type="number"
                  value={emailSettings.smtpPort}
                  onChange={(e) => setEmailSettings({...emailSettings, smtpPort: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Username</label>
                <input
                  type="text"
                  value={emailSettings.smtpUser}
                  onChange={(e) => setEmailSettings({...emailSettings, smtpUser: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Password</label>
                <input
                  type="password"
                  value={emailSettings.smtpPassword}
                  onChange={(e) => setEmailSettings({...emailSettings, smtpPassword: e.target.value})}
                  placeholder="Enter new password to change"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Email</label>
                <input
                  type="email"
                  value={emailSettings.fromEmail}
                  onChange={(e) => setEmailSettings({...emailSettings, fromEmail: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Name</label>
                <input
                  type="text"
                  value={emailSettings.fromName}
                  onChange={(e) => setEmailSettings({...emailSettings, fromName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="useTLS"
                checked={emailSettings.useTLS}
                onChange={(e) => setEmailSettings({...emailSettings, useTLS: e.target.checked})}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="useTLS" className="ml-2 text-sm text-gray-700">Use TLS encryption</label>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveEmail}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={18} />
                {loading ? "Saving..." : "Save Email Settings"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blockchain Settings */}
      {activeTab === "blockchain" && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Blockchain Settings</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Network</label>
                <select
                  value={blockchainSettings.network}
                  onChange={(e) => setBlockchainSettings({...blockchainSettings, network: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ethereum">Ethereum Mainnet</option>
                  <option value="polygon">Polygon</option>
                  <option value="bsc">Binance Smart Chain</option>
                  <option value="testnet">Test Network</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">RPC URL</label>
                <input
                  type="text"
                  value={blockchainSettings.rpcUrl}
                  onChange={(e) => setBlockchainSettings({...blockchainSettings, rpcUrl: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contract Address</label>
                <input
                  type="text"
                  value={blockchainSettings.contractAddress}
                  onChange={(e) => setBlockchainSettings({...blockchainSettings, contractAddress: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gas Limit</label>
                <input
                  type="number"
                  value={blockchainSettings.gasLimit}
                  onChange={(e) => setBlockchainSettings({...blockchainSettings, gasLimit: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gas Price</label>
                <select
                  value={blockchainSettings.gasPrice}
                  onChange={(e) => setBlockchainSettings({...blockchainSettings, gasPrice: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="auto">Auto (Market Price)</option>
                  <option value="slow">Slow (Low Priority)</option>
                  <option value="fast">Fast (High Priority)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Required Confirmations</label>
                <input
                  type="number"
                  value={blockchainSettings.confirmations}
                  onChange={(e) => setBlockchainSettings({...blockchainSettings, confirmations: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveBlockchain}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={18} />
                {loading ? "Saving..." : "Save Blockchain Settings"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Settings */}
      {activeTab === "certificate" && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Certificate ID & QR Settings</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ID Prefix</label>
                <input
                  type="text"
                  value={certificateSettings.idPrefix}
                  onChange={(e) => setCertificateSettings({...certificateSettings, idPrefix: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ID Format</label>
                <input
                  type="text"
                  value={certificateSettings.idFormat}
                  onChange={(e) => setCertificateSettings({...certificateSettings, idFormat: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sequence Start</label>
                <input
                  type="number"
                  value={certificateSettings.sequenceStart}
                  onChange={(e) => setCertificateSettings({...certificateSettings, sequenceStart: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">QR Size (px)</label>
                <input
                  type="number"
                  value={certificateSettings.qrSize}
                  onChange={(e) => setCertificateSettings({...certificateSettings, qrSize: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">QR Error Correction</label>
                <select
                  value={certificateSettings.qrErrorCorrection}
                  onChange={(e) => setCertificateSettings({...certificateSettings, qrErrorCorrection: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="qrEnabled" className="ml-2 text-sm text-gray-700">Enable QR codes on certificates</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="blockchainEnabled"
                  checked={certificateSettings.blockchainEnabled}
                  onChange={(e) => setCertificateSettings({...certificateSettings, blockchainEnabled: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="blockchainEnabled" className="ml-2 text-sm text-gray-700">Enable blockchain verification</label>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveCertificate}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={18} />
                {loading ? "Saving..." : "Save Certificate Settings"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Settings */}
      {activeTab === "security" && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Security Policies</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                <input
                  type="number"
                  value={securitySettings.sessionTimeout}
                  onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Login Attempts</label>
                <input
                  type="number"
                  value={securitySettings.maxLoginAttempts}
                  onChange={(e) => setSecuritySettings({...securitySettings, maxLoginAttempts: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lockout Duration (minutes)</label>
                <input
                  type="number"
                  value={securitySettings.lockoutDuration}
                  onChange={(e) => setSecuritySettings({...securitySettings, lockoutDuration: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password Min Length</label>
                <input
                  type="number"
                  value={securitySettings.passwordMinLength}
                  onChange={(e) => setSecuritySettings({...securitySettings, passwordMinLength: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Audit Log Retention (days)</label>
                <input
                  type="number"
                  value={securitySettings.auditLogRetention}
                  onChange={(e) => setSecuritySettings({...securitySettings, auditLogRetention: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="require2FA" className="ml-2 text-sm text-gray-700">Require 2FA for Admin accounts</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="passwordRequireSpecial"
                  checked={securitySettings.passwordRequireSpecial}
                  onChange={(e) => setSecuritySettings({...securitySettings, passwordRequireSpecial: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="passwordRequireSpecial" className="ml-2 text-sm text-gray-700">Require special characters in passwords</label>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveSecurity}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={18} />
                {loading ? "Saving..." : "Save Security Settings"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
