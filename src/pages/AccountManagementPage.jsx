import { useState, useEffect, useCallback } from "react";
import { accountAPI, authorisationAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import ProvisionWizard from "../components/ProvisionWizard";
import PermissionEditorDrawer from "../components/PermissionEditorDrawer";
import PageHeader from "../components/ui/PageHeader";
import {
  Loader2, Shield, ShieldOff, Unlock, UserCheck, AlertTriangle,
  Mail, CheckCircle,
} from "lucide-react";

const STATUS_BADGE = {
  active: "bg-green-100 text-green-700",
  deactivated: "bg-red-100 text-red-700",
  locked: "bg-amber-100 text-amber-700",
};

const CREDENTIAL_BADGE = {
  pending: "bg-slate-100 text-slate-600",
  delivered: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  expired: "bg-red-100 text-red-700",
};

export default function AccountManagementPage() {
  const { isSuperAdmin } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");

  // Provision wizard
  const [showProvision, setShowProvision] = useState(false);
  const [authorisations, setAuthorisations] = useState([]);
  const [successBanner, setSuccessBanner] = useState(null);

  // Permission editor drawer
  const [permConstants, setPermConstants] = useState(null);
  const [editingAccount, setEditingAccount] = useState(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const params = search ? { search } : {};
      const { data } = await accountAPI.getAll(params);
      setAccounts(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError("Failed to load accounts.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  useEffect(() => {
    // Load permission constants + available authorisations for provision form
    accountAPI.getPermissionConstants().then(({ data }) => setPermConstants(data)).catch(() => {});
    authorisationAPI.getAll({ status: "pending", purpose: "provision" }).then(({ data }) => {
      setAuthorisations(Array.isArray(data) ? data : data.results || []);
    }).catch(() => {});
  }, []);

  const handleAction = async (actionFn, accountId, payload = {}) => {
    setActionLoading(accountId);
    try {
      await actionFn(accountId, payload);
      await fetchAccounts();
    } catch (err) {
      setError(err?.response?.data?.detail || "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleProvisionSuccess = async (result) => {
    setShowProvision(false);
    const banner = result.credentialEmailSent
      ? `Account provisioned for ${result.fullName}. Credentials sent to ${result.email}. Reference: ${result.referenceNumber}.`
      : `Account provisioned for ${result.fullName} but credential email failed to deliver. Go to the account record and select Resend Credentials.`;
    setSuccessBanner(banner);
    await fetchAccounts();
    authorisationAPI.getAll({ status: "pending", purpose: "provision" }).then(({ data }) => {
      setAuthorisations(Array.isArray(data) ? data : data.results || []);
    }).catch(() => {});
    setTimeout(() => setSuccessBanner(null), 15000);
  };

  const handlePermsSaved = async (result) => {
    setEditingAccount(null);
    await fetchAccounts();
    setSuccessBanner(
      `Permissions updated for ${result.fullName}. ${result.added} permission(s) added, ${result.removed} permission(s) removed. Reference: ${result.reference}.`
    );
    setTimeout(() => setSuccessBanner(null), 15000);
  };

  if (!isSuperAdmin) {
    return <div className="p-8 text-center text-slate-500">Access restricted to Super Admins.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account Management"
        description="Provision and manage admin accounts"
        showSearch={false}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600">&times;</button>
        </div>
      )}

      {/* Provision Wizard */}
      <ProvisionWizard
        open={showProvision}
        onClose={() => setShowProvision(false)}
        onSuccess={handleProvisionSuccess}
        permConstants={permConstants}
        authorisations={authorisations}
      />

      {/* Success Banner */}
      {successBanner && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 flex items-center gap-2">
          <CheckCircle size={16} /> {successBanner}
          <button onClick={() => setSuccessBanner(null)} className="ml-auto text-green-400 hover:text-green-600">&times;</button>
        </div>
      )}

      {/* Search */}
      <div className="relative flex gap-2 max-w-xl">
        <button
          onClick={() => setShowProvision((v) => !v)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-2 py-2 rounded-lg transition-colors w-3xs"
        >
          Provision Account
        </button>

        {/* <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /> */}
        <input
          type="text"
          placeholder="Search accounts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border-b-2 border-b-slate-300 px-2 py-2 text-sm focus:border-b-blue-400 outline-none"
        />
      </div>

      {/* Accounts Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">No accounts found.</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Credential</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((acc) => {
                const isActionLoading = actionLoading === acc.id;
                const accountStatus = !acc.is_active ? "deactivated" : "active";

                return (
                  <tr key={acc.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {acc.full_name || acc.username}
                      {acc.is_legacy && <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Legacy</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{acc.email}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                        {acc.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[accountStatus] || ""}`}>
                        {accountStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CREDENTIAL_BADGE[acc.credential_status] || ""}`}>
                        {acc.credential_status || "n/a"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {acc.is_active ? (
                          <button title="Deactivate" disabled={isActionLoading}
                            onClick={() => handleAction(accountAPI.deactivate, acc.id, { reason: "Admin action" })}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30">
                            <ShieldOff size={15} />
                          </button>
                        ) : (
                          <button title="Reactivate" disabled={isActionLoading}
                            onClick={() => handleAction(accountAPI.reactivate, acc.id, { authorisation_reference: "" })}
                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-30">
                            <UserCheck size={15} />
                          </button>
                        )}
                        {acc.is_locked && (
                          <button title="Unlock" disabled={isActionLoading}
                            onClick={() => handleAction(accountAPI.unlock, acc.id)}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-30">
                            <Unlock size={15} />
                          </button>
                        )}
                        {!acc.first_login_completed && (
                          <button title="Regenerate Credential" disabled={isActionLoading}
                            onClick={() => handleAction(accountAPI.regenerateCredential, acc.id)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-30">
                            <Mail size={15} />
                          </button>
                        )}
                        <button title="Edit Permissions"
                          onClick={() => setEditingAccount(acc)}
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors">
                          <Shield size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Permission Editor Drawer */}
      <PermissionEditorDrawer
        open={!!editingAccount}
        account={editingAccount}
        permConstants={permConstants}
        onClose={() => setEditingAccount(null)}
        onSaved={handlePermsSaved}
      />
    </div>
  );
}
