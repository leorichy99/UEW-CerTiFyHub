import { useEffect, useRef, useMemo } from "react";
import { CheckCircle, AlertTriangle, Shield } from "lucide-react";

const SECTION_CLS = "border border-slate-200 rounded-xl overflow-hidden";
const HEADING_CLS = "px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500";
const ROW_CLS = "flex justify-between py-2 border-b border-slate-100 last:border-b-0";
const LABEL_CLS = "text-sm text-slate-500";
const VALUE_CLS = "text-sm font-medium text-slate-800 text-right";

const ACCOUNT_TYPE_MAP = { STAFF: "Staff", EXTERNAL_COLLABORATOR: "External Collaborator" };
const DURATION_MAP = { permanent: "Permanent", time_limited: "Time-limited" };

export default function Step4Review({
  identity,
  authorisation,
  permissions,
  permConstants,
  notes,
  onNotesChange,
  superAdminName,
}) {
  const notesRef = useRef(null);

  // Focus notes field on mount
  useEffect(() => {
    requestAnimationFrame(() => notesRef.current?.focus());
  }, []);

  const selectedRef = authorisation._selectedRef;

  // Group enabled permissions by category
  const groupedPerms = useMemo(() => {
    if (!permConstants?.categories) return [];
    const enabled = Object.entries(permissions.permissions || {}).filter(([, v]) => v);
    const enabledKeys = new Set(enabled.map(([k]) => k));
    return permConstants.categories
      .map((cat) => ({
        label: cat.label,
        items: cat.permissions
          .filter((p) => enabledKeys.has(p))
          .map((p) => permConstants.grantable?.[p] || p),
      }))
      .filter((g) => g.items.length > 0);
  }, [permissions, permConstants]);

  const totalPerms = groupedPerms.reduce((s, g) => s + g.items.length, 0);

  // Name match info
  const nameMatch = useMemo(() => {
    if (!selectedRef || !identity.full_name) return null;
    const refName = selectedRef.requester_name.trim().toLowerCase();
    const idName = identity.full_name.trim().toLowerCase();
    return refName === idName ? "match" : "mismatch";
  }, [selectedRef, identity.full_name]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        Review all details before provisioning. This action is irreversible.
      </p>

      {/* Section 1 — Identity */}
      <div className={SECTION_CLS}>
        <div className={HEADING_CLS}>Identity</div>
        <div className="px-5 py-3 space-y-0">
          <ReviewRow label="Name" value={identity.full_name} />
          <ReviewRow label="Institutional email" value={identity.email} />
          <ReviewRow label="Staff ID" value={identity.staff_id} />
          <ReviewRow label="Department" value={identity.department} />
          <ReviewRow label="Account type" value={ACCOUNT_TYPE_MAP[identity.account_type] || identity.account_type} />
          <ReviewRow
            label="Access duration"
            value={
              identity.access_duration === "time_limited"
                ? `Time-limited — expires ${identity.access_end_date}`
                : "Permanent"
            }
          />
        </div>
      </div>

      {/* Section 2 — Authorisation */}
      {selectedRef && (
        <div className={SECTION_CLS}>
          <div className={HEADING_CLS}>Authorisation</div>
          <div className="px-5 py-3 space-y-0">
            <ReviewRow label="Reference number" value={selectedRef.reference_number} mono />
            <ReviewRow label="Authorised for" value={selectedRef.requester_name} />
            <ReviewRow
              label="Approved by"
              value={`${selectedRef.authorising_head_name}, ${selectedRef.authorising_head_title}`}
            />
            <ReviewRow label="Date approved" value={selectedRef.approval_date} />
            {selectedRef.notes && (
              <div className="py-2">
                <span className={LABEL_CLS}>Scope noted</span>
                <p className="text-sm text-slate-700 mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 whitespace-pre-wrap">
                  {selectedRef.notes}
                </p>
              </div>
            )}
            <div className="py-2 flex items-center gap-2">
              <span className={LABEL_CLS}>Name match</span>
              {nameMatch === "match" ? (
                <span className="text-xs text-green-600 flex items-center gap-1 ml-auto">
                  <CheckCircle size={12} /> Names matched
                </span>
              ) : (
                <span className="text-xs text-amber-600 flex items-center gap-1 ml-auto">
                  <AlertTriangle size={12} />
                  Mismatch acknowledged by {superAdminName}{" "}
                  {authorisation._mismatchAckTimestamp &&
                    `at ${new Date(authorisation._mismatchAckTimestamp).toLocaleString()}`}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Section 3 — Permissions */}
      <div className={SECTION_CLS}>
        <div className={HEADING_CLS}>
          <div className="flex items-center gap-2">
            <Shield size={13} />
            Permissions Granted
          </div>
        </div>
        <div className="px-5 py-3 space-y-3">
          <p className="text-xs text-slate-500">
            {totalPerms} permission{totalPerms !== 1 ? "s" : ""} granted across{" "}
            {groupedPerms.length} categor{groupedPerms.length !== 1 ? "ies" : "y"}.
          </p>
          {groupedPerms.map((group) => (
            <div key={group.label}>
              <h5 className="text-xs font-semibold text-slate-500 mb-1">{group.label}</h5>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item} className="text-sm text-slate-700 flex items-center gap-1.5">
                    <CheckCircle size={12} className="text-green-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Optional notes */}
      <div>
        <label htmlFor="prov-notes" className="block text-xs font-medium text-slate-600 mb-1">
          Provisioning notes (optional)
        </label>
        <textarea
          ref={notesRef}
          id="prov-notes"
          maxLength={300}
          rows={3}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Add any context about this provisioning decision that is not captured in the letter scope. This note will be stored against the account record and included in the audit log."
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none resize-none"
        />
        <p className="text-xs text-slate-400 mt-1 text-right">{notes.length}/300</p>
      </div>
    </div>
  );
}

function ReviewRow({ label, value, mono }) {
  return (
    <div className={ROW_CLS}>
      <span className={LABEL_CLS}>{label}</span>
      <span className={`${VALUE_CLS} ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}
