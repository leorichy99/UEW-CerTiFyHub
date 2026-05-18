import { useState, useCallback, useEffect, useRef } from "react";
import { X, Loader2, ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";
import { accountAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import StepIndicator from "./provision-steps/StepIndicator";
import Step1Identity from "./provision-steps/Step1Identity";
import Step2Authorisation from "./provision-steps/Step2Authorisation";
import Step3Permissions from "./provision-steps/Step3Permissions";
import Step4Review from "./provision-steps/Step4Review";

const INITIAL_IDENTITY = {
  email: "",
  staff_id: "",
  full_name: "",
  department: "",
  account_type: "STAFF",
  access_duration: "permanent",
  access_end_date: "",
};
const INITIAL_AUTH = { reference_number: "", _selectedRef: null, _mismatchAck: false, _mismatchAckTimestamp: null };
const INITIAL_PERMS = { permissions: {} };

export default function ProvisionWizard({
  open,
  onClose,
  onSuccess,
  permConstants,
  authorisations,
}) {
  const confirm = useConfirmDialog();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  // Step data
  const [identity, setIdentity] = useState(INITIAL_IDENTITY);
  const [authorisation, setAuthorisation] = useState(INITIAL_AUTH);
  const [permissions, setPermissions] = useState(INITIAL_PERMS);
  const [notes, setNotes] = useState("");

  // Validity per step
  const [stepValid, setStepValid] = useState({ 1: false, 2: false, 3: false });

  // UI states
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Navigation mode: "edit" preserves data when going back from step 4
  const [editMode, setEditMode] = useState(false);

  const modalRef = useRef(null);

  // Reset everything when modal opens
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setCompletedSteps(new Set());
      setIdentity(INITIAL_IDENTITY);
      setAuthorisation(INITIAL_AUTH);
      setPermissions(INITIAL_PERMS);
      setNotes("");
      setStepValid({ 1: false, 2: false, 3: false });
      setSubmitting(false);
      setSubmitError("");
      setEditMode(false);
    }
  }, [open]);

  // Focus trap
  useEffect(() => {
    if (!open) return;
    const modal = modalRef.current;
    if (!modal) return;

    const handleTab = (e) => {
      if (e.key !== "Tab") return;
      const focusable = modal.querySelectorAll(
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
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [open]);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Validity callbacks (stable via useCallback)
  const onStep1Valid = useCallback((v) => setStepValid((s) => ({ ...s, 1: v })), []);
  const onStep2Valid = useCallback((v) => setStepValid((s) => ({ ...s, 2: v })), []);
  const onStep3Valid = useCallback((v) => setStepValid((s) => ({ ...s, 3: v })), []);

  // --- Navigation ---

  const clearStepsAfter = (step) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      for (let s = step + 1; s <= 4; s++) next.delete(s);
      return next;
    });
    // Reset data for cleared steps
    if (step < 2) { setAuthorisation(INITIAL_AUTH); setStepValid((s) => ({ ...s, 2: false })); }
    if (step < 3) { setPermissions(INITIAL_PERMS); setStepValid((s) => ({ ...s, 3: false })); }
    if (step < 4) { setNotes(""); }
  };

  const goForward = () => {
    if (currentStep >= 4) return;
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    setEditMode(false);
    setCurrentStep((s) => s + 1);
  };

  const goBack = () => {
    if (currentStep <= 1) return;
    setCurrentStep((s) => s - 1);
  };

  const goToStep = (step) => {
    if (!completedSteps.has(step)) return;
    // Navigating back via step indicator clears subsequent steps
    if (!editMode) clearStepsAfter(step);
    setCurrentStep(step);
  };

  const goBackAndEdit = () => {
    // From Step 4 — preserve all data
    setEditMode(true);
    setCurrentStep(1);
  };

  // If user changes identity data while in edit mode, invalidate subsequent steps
  const handleIdentityChange = (newData) => {
    const changed =
      newData.email !== identity.email ||
      newData.staff_id !== identity.staff_id ||
      newData.full_name !== identity.full_name ||
      newData.department !== identity.department ||
      newData.account_type !== identity.account_type ||
      newData.access_duration !== identity.access_duration ||
      newData.access_end_date !== identity.access_end_date;
    setIdentity(newData);
    if (changed && editMode) {
      clearStepsAfter(1);
      setEditMode(false);
    }
  };

  const handleAuthorisationChange = (newData) => {
    const changed = newData.reference_number !== authorisation.reference_number;
    setAuthorisation(newData);
    if (changed && editMode) {
      clearStepsAfter(2);
      setEditMode(false);
    }
  };

  const handlePermissionsChange = (newData) => {
    setPermissions(newData);
  };

  // --- Cancel ---

  const handleCancelClick = async () => {
    const confirmed = await confirm({
      title: "Discard this provisioning session?",
      message: "You are about to discard this provisioning session. All entered data will be lost. Are you sure?",
      confirmLabel: "Yes, discard",
      cancelLabel: "Go back",
      variant: "danger",
    });
    if (confirmed) onClose();
  };

  // --- Submit ---

  const handleProvision = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        full_name: identity.full_name,
        email: identity.email,
        staff_id: identity.staff_id,
        department: identity.department,
        account_type: identity.account_type,
        access_duration: identity.access_duration,
        letter_reference_number: authorisation.reference_number,
        permissions: permissions.permissions,
      };
      if (identity.access_duration === "time_limited" && identity.access_end_date) {
        payload.access_end_date = identity.access_end_date;
      }
      if (notes.trim()) {
        payload.notes = notes.trim();
      }

      const { data } = await accountAPI.provision(payload);
      onSuccess({
        fullName: identity.full_name,
        email: identity.email,
        referenceNumber: authorisation.reference_number,
        credentialEmailSent: data.credential_email_sent !== false,
        warning: data.warning || null,
      });
    } catch (err) {
      const d = err?.response?.data;
      const msg =
        typeof d === "string"
          ? d
          : d?.detail || d?.email?.[0] || d?.letter_reference_number?.[0] || JSON.stringify(d) || "Provisioning failed.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleProvisionClick = async () => {
    const confirmed = await confirm({
      title: "Confirm Provisioning",
      content: (
        <div className="space-y-2">
          <p>
            You are about to create this account and send login credentials to <strong>{identity.email}</strong>.
          </p>
          <p>This action will be logged under your Super Admin account.</p>
        </div>
      ),
      confirmLabel: "Yes, Provision",
      cancelLabel: "Cancel",
      variant: "warning",
    });
    if (confirmed) {
      handleProvision();
    }
  };

  if (!open) return null;

  const canContinue = stepValid[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 h-screen" role="presentation">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="provision-wizard-title"
        className="bg-white w-full h-full sm:w-[95vw] sm:h-[92vh] sm:max-w-5xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Fixed Header */}
        <div className="shrink-0 border-b border-slate-200 px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="provision-wizard-title" className="text-lg font-extrabold text-slate-900">
              Provision New Account
            </h2>
            <button
              type="button"
              onClick={handleCancelClick}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Cancel provisioning"
            >
              <X size={18} />
            </button>
          </div>
          <StepIndicator
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={goToStep}
          />
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {submitError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle size={16} /> {submitError}
              <button onClick={() => setSubmitError("")} className="ml-auto text-red-400 hover:text-red-600">&times;</button>
            </div>
          )}

          {currentStep === 1 && (
            <Step1Identity
              data={identity}
              onChange={handleIdentityChange}
              onValidityChange={onStep1Valid}
            />
          )}

          {currentStep === 2 && (
            <Step2Authorisation
              data={authorisation}
              onChange={handleAuthorisationChange}
              onValidityChange={onStep2Valid}
              authorisations={authorisations}
              identityName={identity.full_name}
            />
          )}

          {currentStep === 3 && (
            <Step3Permissions
              data={permissions}
              onChange={handlePermissionsChange}
              onValidityChange={onStep3Valid}
              permConstants={permConstants}
              scopeText={authorisation._selectedRef?.notes || ""}
            />
          )}

          {currentStep === 4 && (
            <Step4Review
              identity={identity}
              authorisation={authorisation}
              permissions={permissions}
              permConstants={permConstants}
              notes={notes}
              onNotesChange={setNotes}
              superAdminName={user?.full_name || user?.username || "Super Admin"}
            />
          )}
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 border-t border-slate-200 px-6 py-4">
          {/* Navigation buttons */}
          <div className="flex items-center justify-between">
            <div>
              {currentStep > 1 && currentStep < 4 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              )}
              {currentStep === 4 && (
                <button
                  type="button"
                  onClick={goBackAndEdit}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft size={14} /> Go back and edit
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancelClick}
                className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
              >
                Cancel
              </button>

              {currentStep < 4 && (
                <button
                  type="button"
                  onClick={goForward}
                  disabled={!canContinue}
                  title={!canContinue ? "Complete all required fields to continue" : undefined}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  Continue <ArrowRight size={14} />
                </button>
              )}

              {currentStep === 4 && (
                <button
                  type="button"
                  onClick={handleProvisionClick}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm font-extrabold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {submitting && <Loader2 size={12} className="animate-spin" />}
                  {submitting ? "Provisioning..." : "Confirm and Provision"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
