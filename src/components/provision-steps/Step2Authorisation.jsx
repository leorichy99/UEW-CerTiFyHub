import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search, CheckCircle, AlertTriangle, XCircle, FileText, Calendar,
  User, Briefcase, Building2,
} from "lucide-react";

const OK_CLS = "text-xs text-green-600 flex items-center gap-1";
const WARN_CLS = "text-xs text-amber-600 flex items-center gap-1";

const STATUS_STYLES = {
  pending: { label: "Unprovisioned", cls: "bg-green-100 text-green-700" },
  used: { label: "Already Used", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-700" },
};

export default function Step2Authorisation({
  data,
  onChange,
  onValidityChange,
  authorisations,
  identityName,
}) {
  const [query, setQuery] = useState(data.reference_number || "");
  const [showDropdown, setShowDropdown] = useState(false);
  const [mismatchAck, setMismatchAck] = useState(data._mismatchAck || false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Focus on mount
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // Filtered authorisations based on query
  const filtered = useMemo(() => {
    if (!query.trim()) return authorisations;
    const q = query.toLowerCase();
    return authorisations.filter(
      (a) =>
        a.reference_number.toLowerCase().includes(q) ||
        a.requester_name.toLowerCase().includes(q)
    );
  }, [query, authorisations]);

  // Selected reference object
  const selectedRef = useMemo(() => {
    if (!data.reference_number) return null;
    return authorisations.find((a) => a.reference_number === data.reference_number) || null;
  }, [data.reference_number, authorisations]);

  // Name match logic
  const nameMatch = useMemo(() => {
    if (!selectedRef || !identityName) return null;
    const refName = selectedRef.requester_name.trim().toLowerCase();
    const idName = identityName.trim().toLowerCase();
    if (refName === idName) return "match";
    return "mismatch";
  }, [selectedRef, identityName]);

  // Validity
  useEffect(() => {
    const refSelected = !!selectedRef;
    const statusOk = selectedRef?.status === "pending";
    const nameOk = nameMatch === "match" || (nameMatch === "mismatch" && mismatchAck);
    onValidityChange(refSelected && statusOk && nameOk);
  }, [selectedRef, nameMatch, mismatchAck, onValidityChange]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectReference = (ref) => {
    setQuery(ref.reference_number);
    setShowDropdown(false);
    setMismatchAck(false);
    onChange({
      ...data,
      reference_number: ref.reference_number,
      _selectedRef: ref,
      _mismatchAck: false,
    });
  };

  const clearSelection = () => {
    setQuery("");
    setMismatchAck(false);
    onChange({
      ...data,
      reference_number: "",
      _selectedRef: null,
      _mismatchAck: false,
    });
  };

  const toggleMismatchAck = (checked) => {
    setMismatchAck(checked);
    onChange({ ...data, _mismatchAck: checked, _mismatchAckTimestamp: checked ? new Date().toISOString() : null });
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Link this account to the physical authorisation letter. Search by reference number (CERT-YYYY-NNNN) or requester name.
      </p>

      {/* Reference Search */}
      <div className="relative" ref={dropdownRef}>
        <label htmlFor="prov-refsearch" className="block text-xs font-medium text-slate-600 mb-1">
          Reference Search
        </label>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            id="prov-refsearch"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
              if (data.reference_number) clearSelection();
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="CERT-2026-..."
            className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
          />
        </div>

        {/* Dropdown */}
        {showDropdown && !selectedRef && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400">No matching references found.</div>
            ) : (
              filtered.map((ref) => {
                const st = STATUS_STYLES[ref.status] || STATUS_STYLES.pending;
                return (
                  <button
                    key={ref.id}
                    type="button"
                    onClick={() => selectReference(ref)}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono font-medium text-slate-800">
                        {ref.reference_number}
                      </span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{ref.requester_name}</div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Reference Detail Card */}
      {selectedRef && (
        <div className="border border-slate-200 rounded-xl bg-slate-50/50 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-slate-400" />
              <span className="text-sm font-mono font-semibold text-slate-800">
                {selectedRef.reference_number}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  STATUS_STYLES[selectedRef.status]?.cls
                }`}
              >
                {STATUS_STYLES[selectedRef.status]?.label}
              </span>
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                Change
              </button>
            </div>
          </div>
          <div className="px-5 py-4 space-y-3 text-sm">
            <Row icon={User} label="Authorised for" value={selectedRef.requester_name} />
            <Row icon={Briefcase} label="Authorising head" value={`${selectedRef.authorising_head_name}, ${selectedRef.authorising_head_title}`} />
            <Row icon={Building2} label="Department" value={selectedRef.authorising_head_department} />
            <Row icon={Calendar} label="Date approved" value={selectedRef.approval_date} />
            {selectedRef.notes && (
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Scope of access
                </span>
                <p className="mt-1 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 whitespace-pre-wrap">
                  {selectedRef.notes}
                </p>
              </div>
            )}
          </div>

          {/* Blocking status */}
          {selectedRef.status !== "pending" && (
            <div className="px-5 py-3 bg-red-50 border-t border-red-200 flex items-center gap-2 text-sm text-red-700">
              <XCircle size={15} />
              This reference has already been {selectedRef.status}. It cannot be used for a new account.
            </div>
          )}

          {/* Name match */}
          {selectedRef.status === "pending" && nameMatch && (
            <div className={`px-5 py-3 border-t ${nameMatch === "match" ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
              {nameMatch === "match" ? (
                <p className={OK_CLS}>
                  <CheckCircle size={14} />
                  Name matches — {selectedRef.requester_name}.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className={WARN_CLS}>
                    <AlertTriangle size={14} />
                    Name mismatch detected. Reference is authorised for <strong>{selectedRef.requester_name}</strong> but the account is for <strong>{identityName}</strong>.
                  </p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mismatchAck}
                      onChange={(e) => toggleMismatchAck(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500/30"
                    />
                    <span className="text-xs text-amber-800">
                      I confirm that <strong>{identityName}</strong> and <strong>{selectedRef.requester_name}</strong> refer to the same person. This acknowledgement will be logged.
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="text-slate-400 mt-0.5 shrink-0" />
      <div>
        <span className="text-xs text-slate-500">{label}</span>
        <p className="text-slate-800">{value}</p>
      </div>
    </div>
  );
}
