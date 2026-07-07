import { useState, useEffect, useCallback } from "react";
import { accountAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import ProvisionWizard from "../components/ProvisionWizard";
import PermissionEditorDrawer from "../components/PermissionEditorDrawer";
import Table from "../components/ui/Table";
import Pagination from "../components/ui/Pagination";
import usePagination from "../hooks/usePagination";
import useSort from "../hooks/useSort";
import {
  Loader2, Shield, ShieldOff, Unlock, UserCheck, AlertTriangle,
  Mail, CheckCircle,
} from "lucide-react";
import PageTitle from "../components/PageTitle";

const STATUS_BADGE = {
  active: "bg-green-100 text-green-700",
  deactivated: "bg-red-100 text-red-700",
  locked: "bg-amber-100 text-amber-900",
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
    // Load permission constants for provision form
    accountAPI.getPermissionConstants().then(({ data }) => setPermConstants(data)).catch(() => {});
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

  const sort = useSort(accounts, { defaultKey: "full_name" });
  const pagination = usePagination(sort.sortedItems, { pageSize: 10 });

  const handleProvisionSuccess = async (result) => {
    setShowProvision(false);
    const banner = result.credentialEmailSent
      ? `Account provisioned for ${result.fullName}. Credentials sent to ${result.email}.`
      : `Account provisioned for ${result.fullName} but credential email failed to deliver. Go to the account record and select Resend Credentials.`;
    setSuccessBanner(banner);
    await fetchAccounts();
    setTimeout(() => setSuccessBanner(null), 15000);
  };

  const handlePermsSaved = async (result) => {
    setEditingAccount(null);
    await fetchAccounts();
    setSuccessBanner(
      `Permissions updated for ${result.fullName}. ${result.added} permission(s) added, ${result.removed} permission(s) removed.`
    );
    setTimeout(() => setSuccessBanner(null), 15000);
  };

  if (!isSuperAdmin) {
    return <div className="p-8 text-center text-slate-500">Access restricted to Super Admins.</div>;
  }

  return (
    <div className="space-y-6">
      <PageTitle>User Management</PageTitle>
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
        <Table className="table-cards">
          <Table.Head>
            <tr>
              <Table.HeaderCell onSort={() => sort.toggleSort("full_name")} sortDirection={sort.getSortDirection("full_name")}>Name</Table.HeaderCell>
              <Table.HeaderCell onSort={() => sort.toggleSort("email")} sortDirection={sort.getSortDirection("email")}>Email</Table.HeaderCell>
              <Table.HeaderCell onSort={() => sort.toggleSort("role")} sortDirection={sort.getSortDirection("role")}>Role</Table.HeaderCell>
              <Table.HeaderCell onSort={() => sort.toggleSort("is_active")} sortDirection={sort.getSortDirection("is_active")}>Status</Table.HeaderCell>
              <Table.HeaderCell onSort={() => sort.toggleSort("credential_status")} sortDirection={sort.getSortDirection("credential_status")}>Credential</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
            </tr>
          </Table.Head>
          <Table.Body>
            {pagination.paginatedItems.map((acc) => {
              const isActionLoading = actionLoading === acc.id;
              const accountStatus = !acc.is_active ? "deactivated" : "active";

              return (
                <Table.Row key={acc.id}>
                  <Table.Cell dataLabel="Name" className="font-medium text-slate-800">
                    {acc.full_name || acc.username}
                    {acc.is_legacy && <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-full">Legacy</span>}
                  </Table.Cell>
                  <Table.Cell dataLabel="Email" className="text-slate-600">{acc.email}</Table.Cell>
                  <Table.Cell dataLabel="Role">
                    <span className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                      {acc.role}
                    </span>
                  </Table.Cell>
                  <Table.Cell dataLabel="Status" aria-live="polite">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[accountStatus] || ""}`}>
                      {accountStatus}
                    </span>
                  </Table.Cell>
                  <Table.Cell dataLabel="Credential" aria-live="polite">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CREDENTIAL_BADGE[acc.credential_status] || ""}`}>
                      {acc.credential_status || "n/a"}
                    </span>
                  </Table.Cell>
                  <Table.Cell dataLabel="Actions" className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {acc.is_active ? (
                        <button aria-label="Deactivate account" title="Deactivate" disabled={isActionLoading}
                          onClick={() => handleAction(accountAPI.deactivate, acc.id, { reason: "Admin action" })}
                          className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30">
                          <ShieldOff size={16} />
                        </button>
                      ) : (
                        <button aria-label="Reactivate account" title="Reactivate" disabled={isActionLoading}
                          onClick={() => handleAction(accountAPI.reactivate, acc.id)}
                          className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-30">
                          <UserCheck size={16} />
                        </button>
                      )}
                      {acc.is_locked && (
                        <button aria-label="Unlock account" title="Unlock" disabled={isActionLoading}
                          onClick={() => handleAction(accountAPI.unlock, acc.id)}
                          className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-lg text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-30">
                          <Unlock size={16} />
                        </button>
                      )}
                      {!acc.first_login_completed && (
                        <button aria-label="Regenerate credentials" title="Regenerate Credential" disabled={isActionLoading}
                          onClick={() => handleAction(accountAPI.regenerateCredential, acc.id)}
                          className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-lg text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-30">
                          <Mail size={16} />
                        </button>
                      )}
                      <button aria-label="Edit permissions" title="Edit Permissions"
                        onClick={() => setEditingAccount(acc)}
                        className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors">
                        <Shield size={16} />
                      </button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      )}
      {accounts.length > 0 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onChange={pagination.setPage}
        />
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
