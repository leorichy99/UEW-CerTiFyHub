import { useEffect, useRef, useMemo } from "react";
import { FileText, Shield } from "lucide-react";

const PERMISSION_DESCRIPTIONS = {
  "certificates.revoke": "Mark issued certificates as revoked. Requires explicit justification in the letter.",
  "certificates.edit_drafts": "Modify certificate records in draft state before issuance.",
  "certificates.view_all": "Read-only access to the full certificate registry.",
  "certificates.download": "Export certificate records or PDFs.",
  "registry.sessions.create": "Create and configure new congregation sessions.",
  "registry.records.upload": "Upload CSV/XLSX files of student records into a draft session.",
  "registry.records.manage": "Edit or delete student records while a session is in Draft.",
  "registry.sessions.publish": "Publish a draft session and dispatch confirmation emails. Very high privilege.",
  "registry.confirmation.view": "View confirmation progress, statuses, and audit trail.",
  "registry.disputes.resolve": "Resolve student disputes raised during confirmation.",
  "registry.issuance.initiate": "Trigger the issuance engine for a closed session.",
  "registry.export": "Export student records and confirmation data as CSV.",
  "verification.verify": "Access the internal verification interface to confirm certificate authenticity.",
  "verification.view_logs": "See the history of all verification requests and their outcomes.",
  "reports.view": "Access pre-built system reports including issuance summaries and statistics.",
  "reports.export": "Download report data. Confirm letter scope before enabling.",
  "templates.manage": "Create or edit certificate templates.",
};

export default function Step3Permissions({
  data,
  onChange,
  onValidityChange,
  permConstants,
  scopeText,
}) {
  const firstCheckboxRef = useRef(null);

  // Focus first checkbox on mount
  useEffect(() => {
    requestAnimationFrame(() => firstCheckboxRef.current?.focus());
  }, []);

  const permissions = data.permissions || {};

  const toggle = (key, checked) => {
    onChange({
      ...data,
      permissions: { ...permissions, [key]: checked },
    });
  };

  // Count enabled
  const enabledKeys = useMemo(
    () => Object.entries(permissions).filter(([, v]) => v).map(([k]) => k),
    [permissions]
  );

  // Validity: at least 1 permission
  useEffect(() => {
    onValidityChange(enabledKeys.length > 0);
  }, [enabledKeys.length, onValidityChange]);

  // Filter categories to only grantable ones (exclude super-admin-only empty categories)
  const categories = useMemo(() => {
    if (!permConstants?.categories) return [];
    return permConstants.categories.filter((c) => c.permissions && c.permissions.length > 0);
  }, [permConstants]);

  // Summary text
  const summaryLabels = enabledKeys.map(
    (k) => permConstants?.grantable?.[k] || k
  );

  let isFirstCheckbox = true;

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-0">
      {/* Left panel — scope reference */}
      <div className="lg:w-70 shrink-0">
        <div className="border border-slate-200 rounded-xl bg-slate-50/50 sticky top-0">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <FileText size={14} className="text-slate-400" />
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              What the letter authorises
            </h4>
          </div>
          <div className="px-4 py-3">
            {scopeText ? (
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {scopeText}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">
                No scope notes recorded on this authorisation reference.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right panel — permissions */}
      <div className="flex-1 min-w-0 space-y-5">
        <div className="flex items-center gap-2">
          <Shield size={15} className="text-slate-400" />
          <p className="text-sm text-slate-500">
            Enable only the permissions explicitly authorised in the letter.
          </p>
        </div>

        {categories.map((cat) => (
          <fieldset key={cat.id} className="space-y-1">
            <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              {cat.label}
            </legend>
            {cat.permissions.map((pKey) => {
              const label = permConstants?.grantable?.[pKey] || pKey;
              const desc = PERMISSION_DESCRIPTIONS[pKey] || "";
              const checked = !!permissions[pKey];

              const refProp = isFirstCheckbox ? { ref: firstCheckboxRef } : {};
              if (isFirstCheckbox) isFirstCheckbox = false;

              return (
                <label
                  key={pKey}
                  className={`flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    checked
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <input
                    {...refProp}
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggle(pKey, e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                    aria-describedby={`perm-desc-${pKey}`}
                  />
                  <div className="min-w-0">
                    <span className={`text-sm font-medium ${checked ? "text-blue-800" : "text-slate-700"}`}>
                      {label}
                    </span>
                    {desc && (
                      <p id={`perm-desc-${pKey}`} className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {desc}
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </fieldset>
        ))}

        {/* Running summary */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 pt-3 pb-1">
          {enabledKeys.length > 0 ? (
            <p className="text-sm text-slate-700">
              <span className="font-semibold text-blue-700">
                Permissions enabled ({enabledKeys.length}):
              </span>{" "}
              {summaryLabels.join(", ")}.
            </p>
          ) : (
            <p className="text-sm text-slate-400">
              No permissions enabled. At least one permission must be enabled before continuing.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
