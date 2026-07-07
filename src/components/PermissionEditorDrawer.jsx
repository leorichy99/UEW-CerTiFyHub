import { useState, useEffect, useRef } from "react";
import { accountAPI } from "../services/api";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import {
  Loader2, ChevronDown, X, Award, BookOpen,
  ShieldCheck, BarChart3, Settings, Plus, Minus,
  AlertTriangle, Info,
} from "lucide-react";

// ── Category metadata ────────────────────────────────────────────────────
const CATEGORY_META = {
  certificate_management: { icon: Award, color: "text-blue-600 bg-blue-50", description: "View, revoke, and download certificates" },
  student_registry: { icon: BookOpen, color: "text-emerald-600 bg-emerald-50", description: "Manage certificate batches and student records" },
  verification: { icon: ShieldCheck, color: "text-violet-600 bg-violet-50", description: "Verify certificate authenticity and view logs" },
  reporting_audit: { icon: BarChart3, color: "text-amber-600 bg-amber-50", description: "Access reports and export data" },
  system_configuration: { icon: Settings, color: "text-slate-600 bg-slate-100", description: "Manage certificate templates and system config" },
};

// ── Human-readable permission labels & descriptions ──────────────────────
const PERMISSION_INFO = {
  "certificates.revoke": { label: "Revoke Certificates", desc: "Mark issued certificates as revoked. Requires explicit justification." },
  "certificates.edit_drafts": { label: "Edit Certificate Drafts", desc: "Modify certificate records in draft state before issuance." },
  "certificates.view_all": { label: "View All Certificates", desc: "Read-only access to the full certificate registry." },
  "certificates.download": { label: "Download Certificates", desc: "Export certificate records or PDFs." },
  "registry.sessions.create": { label: "Create Batches", desc: "Create and configure new certificate batches." },
  "registry.records.upload": { label: "Upload Student Records", desc: "Upload CSV/XLSX files of student records into a draft batch." },
  "registry.records.manage": { label: "Manage Student Records", desc: "Edit or delete student records while a batch is in Draft." },
  "registry.sessions.publish": { label: "Publish Batches", desc: "Publish a draft batch and dispatch confirmation emails. Very high privilege." },
  "registry.confirmation.view": { label: "View Confirmation Status", desc: "View confirmation progress, statuses, and audit trail." },
  "registry.disputes.resolve": { label: "Resolve Disputes", desc: "Resolve student disputes raised during confirmation." },
  "registry.issuance.initiate": { label: "Initiate Issuance", desc: "Trigger the issuance engine for a closed batch." },
  "registry.export": { label: "Export Batch Data", desc: "Export student records and confirmation data as CSV." },
  "verification.verify": { label: "Verify Certificates", desc: "Access the internal verification interface to confirm certificate authenticity." },
  "verification.view_logs": { label: "View Verification Logs", desc: "See the history of all verification requests and their outcomes." },
  "reports.view": { label: "View Reports", desc: "Access pre-built system reports including issuance summaries and statistics." },
  "reports.export": { label: "Export Reports", desc: "Download report data. Confirm letter scope before enabling." },
  "templates.manage": { label: "Manage Templates", desc: "Create or edit certificate templates." },
};

// Only show these 5 categories (exclude user_account_management)
const VISIBLE_CATEGORY_IDS = [
  "certificate_management",
  "student_registry",
  "verification",
  "reporting_audit",
  "system_configuration",
];

// ── Collapsible permission category accordion ────────────────────────────
function PermissionAccordion({ cat, currentPerms, originalPerms, onToggle, isOpen, onToggleOpen }) {
  const contentRef = useRef(null);
  const meta = CATEGORY_META[cat.id] || { icon: Settings, color: "text-slate-600 bg-slate-50", description: "" };
  const Icon = meta.icon;
  const enabledCount = cat.permissions?.filter((k) => currentPerms[k]).length || 0;
  const totalCount = cat.permissions?.length || 0;

  if (totalCount === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
      >
        <span className={`flex items-center justify-center h-9 w-9 rounded-lg shrink-0 ${meta.color}`}>
          <Icon size={17} />
        </span>
        <div className="flex-1 text-left min-w-0">
          <span className="text-sm font-semibold text-slate-800">{cat.label}</span>
          <span className="ml-2 text-xs text-slate-400 tabular-nums">{enabledCount}/{totalCount} enabled</span>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className="transition-all duration-300 ease-in-out overflow-hidden"
        style={{
          maxHeight: isOpen ? `${contentRef.current?.scrollHeight || 600}px` : "0px",
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div ref={contentRef} className="px-4 pb-3 pt-1.5 border-t border-slate-100 bg-slate-50/30">
          {meta.description && (
            <p className="text-[11px] text-slate-400 pb-2">{meta.description}</p>
          )}
          <div className="space-y-0.5">
            {cat.permissions?.map((pKey) => {
              const info = PERMISSION_INFO[pKey] || { label: pKey, desc: "" };
              const isEnabled = !!currentPerms[pKey];
              const wasChanged = currentPerms[pKey] !== originalPerms[pKey];
              return (
                <div
                  key={pKey}
                  className={`flex items-start gap-3 py-2.5 px-3 rounded-lg transition-colors group ${wasChanged ? "bg-amber-50/60 ring-1 ring-amber-200/60" : "hover:bg-white"}`}
                >
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                        {info.label}
                      </span>
                      {wasChanged && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                          Changed
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-slate-400 leading-snug mt-0.5">{info.desc}</p>
                  </div>
                  {/* Toggle switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEnabled}
                    aria-label={`${info.label}, currently ${isEnabled ? "enabled" : "disabled"}`}
                    onClick={() => onToggle(pKey, !isEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 mt-1 ${isEnabled ? "bg-blue-600" : "bg-slate-300"}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${isEnabled ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Normalise names for comparison ───────────────────────────────────────
function normaliseName(name) {
  return (name || "").toLowerCase().replace(/[^a-z]/g, "").trim();
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function PermissionEditorDrawer({ open, account, permConstants, onClose, onSaved }) {
  const confirm = useConfirmDialog();

  // ── Core permission state ──────────────────────────────────────────────
  const [originalPerms, setOriginalPerms] = useState({});
  const [currentPerms, setCurrentPerms] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Accordion open state ───────────────────────────────────────────────
  const [openCategories, setOpenCategories] = useState(new Set());

  const [provisioningNotes, setProvisioningNotes] = useState("");

  // ── Refs ────────────────────────────────────────────────────────────────
  const drawerRef = useRef(null);

  // ── Derived values ───────────────────────────────────────────────────────
  const accountName = account?.full_name || "";

  // ── Visible categories (exclude SA-only) ───────────────────────────────
  const visibleCategories = (permConstants?.categories || []).filter(
    (c) => VISIBLE_CATEGORY_IDS.includes(c.id) && c.permissions?.length > 0
  );

  // ── Compute changes ────────────────────────────────────────────────────
  const added = [];
  const removed = [];
  for (const key of Object.keys(currentPerms)) {
    if (currentPerms[key] !== originalPerms[key]) {
      if (currentPerms[key]) added.push(key);
      else removed.push(key);
    }
  }
  const hasChanges = added.length > 0 || removed.length > 0;
  const allOff = Object.values(currentPerms).every((v) => !v);

  // ── Save button state ──────────────────────────────────────────────────
  const canSave = hasChanges && !allOff;

  let saveTooltip = "";
  if (!hasChanges) saveTooltip = "No changes have been made to the permissions.";
  else if (allOff) saveTooltip = "At least one permission must remain enabled.";

  // ── Load fresh data when drawer opens ──────────────────────────────────
  useEffect(() => {
    if (!open || !account) return;
    setLoading(true);
    setError("");
    setProvisioningNotes("");
    setOpenCategories(new Set());

    accountAPI.getOne(account.id)
      .then(({ data }) => {
        const perms = data.permissions || {};
        setOriginalPerms({ ...perms });
        setCurrentPerms({ ...perms });
      })
      .catch(() => setError("Failed to load current permissions. Please close and try again."))
      .finally(() => setLoading(false));
  }, [open, account]);

  // ── Stable ref for handleClose (avoids stale closure in keydown) ────────
  const handleCloseRef = useRef(null);

  // ── Focus trap ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCloseRef.current?.();
      }
      if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // ── Permission toggle ──────────────────────────────────────────────────
  const togglePerm = (key, val) => {
    setCurrentPerms((prev) => ({ ...prev, [key]: val }));
  };

  // ── Close with unsaved changes check ───────────────────────────────────
  const handleClose = async () => {
    if (hasChanges) {
      const confirmed = await confirm({
        title: "Discard unsaved changes?",
        message: "You have unsaved changes. Closing this drawer will discard them. Are you sure?",
        confirmLabel: "Yes, discard",
        cancelLabel: "Keep Editing",
        variant: "danger",
      });
      if (confirmed) resetAndClose();
    } else {
      resetAndClose();
    }
  };
  handleCloseRef.current = handleClose;

  const resetAndClose = () => {
    onClose();
  };

  // ── Save ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const changedPerms = {};
      for (const key of Object.keys(currentPerms)) {
        if (currentPerms[key] !== originalPerms[key]) {
          changedPerms[key] = currentPerms[key];
        }
      }
      await accountAPI.updatePermissions(account.id, {
        permissions: changedPerms,
        reason: provisioningNotes,
      });
      onSaved({
        fullName: accountName,
        added: added.length,
        removed: removed.length,
      });
      resetAndClose();
    } catch (err) {
      const serverError = err?.response?.data;
      if (serverError?.error?.includes?.("modified by another")) {
        setError("This account's permissions were modified by another administrator while you had this drawer open. The drawer will now reload with the current permission state. Your changes have not been lost — review them against the updated state and save again.");
        // Reload server state but keep user's intended changes
        try {
          const { data } = await accountAPI.getOne(account.id);
          const freshPerms = data.permissions || {};
          setOriginalPerms({ ...freshPerms });
          // Re-apply the user's intended changes on top of fresh state
          setCurrentPerms((prev) => {
            const merged = { ...freshPerms };
            for (const k of Object.keys(prev)) {
              if (prev[k] !== originalPerms[k]) {
                merged[k] = prev[k];
              }
            }
            return merged;
          });
        } catch { /* keep showing the error */ }
      } else {
        setError("Changes could not be saved. Please try again. If this problem persists, contact the system administrator.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = async () => {
    if (!canSave) return;
    const confirmed = await confirm({
      title: "Confirm Permission Changes",
      content: (
        <div className="space-y-3">
          <p>
            You are about to make the following permission changes to <strong>{accountName}</strong>&rsquo;s account:
          </p>
          {added.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-1">Adding</p>
              <ul className="list-disc pl-5 text-sm text-slate-700 space-y-0.5">
                {added.map((k) => (
                  <li key={k}>{PERMISSION_INFO[k]?.label || k}</li>
                ))}
              </ul>
            </div>
          )}
          {removed.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-red-500 uppercase tracking-wider mb-1">Removing</p>
              <ul className="list-disc pl-5 text-sm text-slate-700 space-y-0.5">
                {removed.map((k) => (
                  <li key={k}>{PERMISSION_INFO[k]?.label || k}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-slate-500 italic">This action will be logged under your Super Admin account.</p>
        </div>
      ),
      confirmLabel: "Confirm Changes",
      cancelLabel: "Go Back",
      variant: "warning",
    });
    if (confirmed) {
      handleSave();
    }
  };

  // ── Format account type ────────────────────────────────────────────────
  const accountTypeLabel = account?.account_type === "EXTERNAL_COLLABORATOR" ? "External Collaborator" : "Staff";

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-modal="true"
      role="dialog"
      aria-label="Edit Permissions"
    >
      {/* Backdrop — does NOT close on click per spec */}
      <div className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={`absolute top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* ── FIXED HEADER ──────────────────────────────────────────────── */}
        <div className="shrink-0 border-b border-slate-200 px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Edit Permissions</h2>
              {account && (
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {accountName}
                  <span className="mx-1.5 text-slate-300">·</span>
                  {account.email}
                  <span className="mx-1.5 text-slate-300">·</span>
                  {accountTypeLabel}
                  {account.department && (
                    <>
                      <span className="mx-1.5 text-slate-300">·</span>
                      {account.department}
                    </>
                  )}
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="p-2 -mr-2 -mt-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── SCROLLABLE BODY ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-3 text-sm text-slate-500">Loading permissions…</span>
            </div>
          ) : (
            <div className="px-6 py-5 space-y-6">
              {/* ─ Section 1: Permission Accordions ─────────────────────── */}
              <div className="space-y-2.5">
                {visibleCategories.map((cat) => (
                  <PermissionAccordion
                    key={cat.id}
                    cat={cat}
                    currentPerms={currentPerms}
                    originalPerms={originalPerms}
                    onToggle={togglePerm}
                    isOpen={openCategories.has(cat.id)}
                    onToggleOpen={() =>
                      setOpenCategories((prev) => {
                        const next = new Set(prev);
                        if (next.has(cat.id)) next.delete(cat.id);
                        else next.add(cat.id);
                        return next;
                      })
                    }
                  />
                ))}
              </div>

              {/* ─ Section 2: Session Changes Summary ──────────────────── */}
              {hasChanges && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3" role="status" aria-live="polite">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Changes in this session</h4>
                  {added.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Adding</p>
                      {added.map((k) => (
                        <div key={k} className="flex items-center gap-2 pl-1">
                          <Plus size={13} className="text-emerald-500 shrink-0" />
                          <span className="text-sm text-slate-700">{PERMISSION_INFO[k]?.label || k}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {removed.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wider">Removing</p>
                      {removed.map((k) => (
                        <div key={k} className="flex items-center gap-2 pl-1">
                          <Minus size={13} className="text-red-400 shrink-0" />
                          <span className="text-sm text-slate-700">{PERMISSION_INFO[k]?.label || k}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─ Section 3: Notes ───────────────────────────────────── */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Notes <span className="text-slate-400 font-normal">(optional, max 300 characters)</span>
                </label>
                <textarea
                  value={provisioningNotes}
                  onChange={(e) => setProvisioningNotes(e.target.value.slice(0, 300))}
                  maxLength={300}
                  rows={2}
                  placeholder="Add any context about this permission change. This note will be stored against the account record and included in the audit log."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none transition"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── FIXED FOOTER ──────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-slate-200 px-6 py-4 bg-white space-y-3">
            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 text-sm" role="alert">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Zero-permission warning */}
            {allOff && hasChanges && (
              <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs" role="alert">
                <Info size={14} className="shrink-0 mt-0.5" />
                <span>An account must have at least one permission enabled. To remove all access from this account, use <strong>Deactivate Account</strong> instead.</span>
              </div>
            )}

            <button
              onClick={handleSaveClick}
              disabled={!canSave}
              title={saveTooltip}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              Save Permissions
            </button>
          </div>
      </div>
    </div>
  );
}
