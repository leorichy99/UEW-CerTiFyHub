import { useState, useEffect, useRef, useCallback } from "react";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { accountAPI } from "../../services/api";

const INPUT_CLS =
  "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-colors";
const LABEL_CLS = "block text-xs font-medium text-slate-600 mb-1";
const ERROR_CLS = "text-xs text-red-600 mt-1 flex items-center gap-1";
const OK_CLS = "text-xs text-green-600 mt-1 flex items-center gap-1";
const SELECT_CLS =
  "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none bg-white transition-colors";

export default function Step1Identity({ data, onChange, onValidityChange }) {
  const [emailCheck, setEmailCheck] = useState({ status: "idle", msg: "" }); // idle | checking | ok | error
  const [staffIdCheck, setStaffIdCheck] = useState({ status: "idle", msg: "" });
  const firstInputRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Focus first input on mount
  useEffect(() => {
    requestAnimationFrame(() => firstInputRef.current?.focus());
  }, []);

  const set = (field, value) => onChange({ ...data, [field]: value });

  // Duplicate check for email
  const checkEmail = useCallback(async (email) => {
    if (!email || !email.includes("@")) {
      setEmailCheck({ status: "idle", msg: "" });
      return;
    }
    setEmailCheck({ status: "checking", msg: "" });
    try {
      const { data: accounts } = await accountAPI.getAll({ search: email });
      const list = Array.isArray(accounts) ? accounts : accounts.results || [];
      const dup = list.some((a) => a.email?.toLowerCase() === email.toLowerCase());
      if (!mountedRef.current) return;
      if (dup) {
        setEmailCheck({ status: "error", msg: "This email already has an active account in the system." });
      } else {
        setEmailCheck({ status: "ok", msg: "No duplicate account found for this email." });
      }
    } catch {
      if (!mountedRef.current) return;
      setEmailCheck({ status: "idle", msg: "" });
    }
  }, []);

  // Duplicate check for staff ID
  const checkStaffId = useCallback(async (staffId) => {
    if (!staffId.trim()) {
      setStaffIdCheck({ status: "idle", msg: "" });
      return;
    }
    setStaffIdCheck({ status: "checking", msg: "" });
    try {
      const { data: accounts } = await accountAPI.getAll({ search: staffId });
      const list = Array.isArray(accounts) ? accounts : accounts.results || [];
      const dup = list.some((a) => a.staff_id?.toLowerCase() === staffId.toLowerCase());
      if (!mountedRef.current) return;
      if (dup) {
        setStaffIdCheck({ status: "error", msg: "An active account already exists for this Staff ID." });
      } else {
        setStaffIdCheck({ status: "ok", msg: "Staff ID verified — no duplicate." });
      }
    } catch {
      if (!mountedRef.current) return;
      setStaffIdCheck({ status: "idle", msg: "" });
    }
  }, []);

  // Compute validity
  useEffect(() => {
    const emailOk = data.email && emailCheck.status === "ok";
    const staffOk = data.staff_id && staffIdCheck.status !== "error";
    const nameOk = !!data.full_name.trim();
    const deptOk = !!data.department.trim();
    const typeOk = !!data.account_type;
    const durationOk = !!data.access_duration;
    const dateOk =
      data.access_duration !== "time_limited" ||
      (data.access_end_date && new Date(data.access_end_date) > new Date());
    onValidityChange(emailOk && staffOk && nameOk && deptOk && typeOk && durationOk && dateOk);
  }, [data, emailCheck.status, staffIdCheck.status, onValidityChange]);

  const dateInvalid =
    data.access_duration === "time_limited" &&
    data.access_end_date &&
    new Date(data.access_end_date) <= new Date();

  return (
    <div className="space-y-5">

      {/* Email */}
      <div>
        <label htmlFor="prov-email" className={LABEL_CLS}>Institutional Email</label>
        <input
          ref={firstInputRef}
          id="prov-email"
          type="email"
          required
          value={data.email}
          onChange={(e) => {
            set("email", e.target.value);
            setEmailCheck({ status: "idle", msg: "" });
          }}
          onBlur={(e) => checkEmail(e.target.value.trim())}
          placeholder="name@example.com"
          className={INPUT_CLS}
        />
        {emailCheck.status === "checking" && (
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" /> Checking...
          </p>
        )}
        {emailCheck.status === "ok" && (
          <p className={OK_CLS}><CheckCircle size={12} /> {emailCheck.msg}</p>
        )}
        {emailCheck.status === "error" && (
          <p className={ERROR_CLS}><AlertCircle size={12} /> {emailCheck.msg}</p>
        )}
      </div>

      {/* Staff ID */}
      <div>
        <label htmlFor="prov-staffid" className={LABEL_CLS}>Staff ID</label>
        <input
          id="prov-staffid"
          type="text"
          required
          value={data.staff_id}
          onChange={(e) => {
            set("staff_id", e.target.value);
            setStaffIdCheck({ status: "idle", msg: "" });
          }}
          onBlur={(e) => checkStaffId(e.target.value.trim())}
          placeholder="e.g. STF001"
          className={INPUT_CLS}
        />
        {staffIdCheck.status === "checking" && (
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" /> Checking...
          </p>
        )}
        {staffIdCheck.status === "ok" && (
          <p className={OK_CLS}><CheckCircle size={12} /> {staffIdCheck.msg}</p>
        )}
        {staffIdCheck.status === "error" && (
          <p className={ERROR_CLS}><AlertCircle size={12} /> {staffIdCheck.msg}</p>
        )}
      </div>

      {/* Full Name */}
      <div>
        <label htmlFor="prov-fullname" className={LABEL_CLS}>Full Name</label>
        <input
          id="prov-fullname"
          type="text"
          required
          value={data.full_name}
          onChange={(e) => set("full_name", e.target.value)}
          placeholder="As it should appear on certificates"
          className={INPUT_CLS}
        />
        {!data.full_name.trim() && data.email && (
          <p className="text-xs text-slate-400 mt-1">Full name is required.</p>
        )}
      </div>

      {/* Department */}
      <div>
        <label htmlFor="prov-dept" className={LABEL_CLS}>Department</label>
        <input
          id="prov-dept"
          type="text"
          required
          value={data.department}
          onChange={(e) => set("department", e.target.value)}
          placeholder="e.g. Department of Computer Science"
          className={INPUT_CLS}
        />
      </div>

      {/* Account Type + Access Duration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="prov-actype" className={LABEL_CLS}>Account Type</label>
          <select
            id="prov-actype"
            value={data.account_type}
            onChange={(e) => set("account_type", e.target.value)}
            className={SELECT_CLS}
          >
            <option value="STAFF">Staff</option>
            <option value="EXTERNAL_COLLABORATOR">External Collaborator</option>
          </select>
        </div>
        <div>
          <label htmlFor="prov-duration" className={LABEL_CLS}>Access Duration</label>
          <select
            id="prov-duration"
            value={data.access_duration}
            onChange={(e) => set("access_duration", e.target.value)}
            className={SELECT_CLS}
          >
            <option value="permanent">Permanent</option>
            <option value="time_limited">Time-limited</option>
          </select>
        </div>
      </div>

      {/* Access End Date (conditional) */}
      {data.access_duration === "time_limited" && (
        <div>
          <label htmlFor="prov-enddate" className={LABEL_CLS}>Access End Date</label>
          <input
            id="prov-enddate"
            type="date"
            required
            value={data.access_end_date}
            onChange={(e) => set("access_end_date", e.target.value)}
            className={INPUT_CLS}
          />
          {dateInvalid && (
            <p className={ERROR_CLS}>
              <AlertCircle size={12} /> Access end date must be in the future.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
