import React from "react";
import { FileEdit, CheckCircle2, X } from "lucide-react";
import { UEW_DEPARTMENTS, HONORS_TYPES } from "../utils/constants";

export default function DisputeSummary({ disputes, onEdit, onConfirm, onCancel, submitting }) {
  const getDisputeTypeLabel = (type) => {
    const labels = {
      programme: 'Wrong programme',
      class_of_degree: 'Wrong class of degree',
      name_spelling: 'Name spelling error',
      other: 'Other issue',
    };
    return labels[type] || type;
  };

  const renderDisputeDetail = (dispute) => {
    if (dispute.type === 'programme') {
      return (
        <div className="mt-2 text-sm">
          <div className="text-slate-500">Current: {dispute.current_value}</div>
          <div className="text-green-600 font-medium">Proposed: {dispute.proposed_value}</div>
        </div>
      );
    }

    if (dispute.type === 'class_of_degree') {
      const currentLabel = HONORS_TYPES.find(t => t.value === dispute.current_value)?.label || dispute.current_value;
      const proposedLabel = HONORS_TYPES.find(t => t.value === dispute.proposed_value)?.label || dispute.proposed_value;
      return (
        <div className="mt-2 text-sm">
          <div className="text-slate-500">Current: {currentLabel}</div>
          <div className="text-green-600 font-medium">Proposed: {proposedLabel}</div>
        </div>
      );
    }

    if (dispute.type === 'name_spelling') {
      return (
        <div className="mt-2 text-sm space-y-1">
          <div className="text-slate-500">Current: {dispute.current_value}</div>
          {dispute.file && (
            <div className="text-blue-600 flex items-center gap-1">
              <FileEdit size={14} />
              ID proof uploaded: {dispute.file.name}
            </div>
          )}
          {dispute.note && (
            <div className="text-slate-700 bg-slate-50 p-2 rounded">
              "{dispute.note}"
            </div>
          )}
        </div>
      );
    }

    if (dispute.type === 'other') {
      return (
        <div className="mt-2 text-sm">
          <div className="text-slate-700 bg-slate-50 p-2 rounded">
            "{dispute.note}"
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Review your disputes</h2>
        <p className="text-sm text-slate-500 mt-1">
          Please review the issues you're reporting before submitting. The registrar's office will verify these before making any changes.
        </p>
      </div>

      <div className="space-y-3">
        {disputes.map((dispute, index) => (
          <div key={dispute.id || index} className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </div>
                <span className="font-medium text-slate-800">{getDisputeTypeLabel(dispute.type)}</span>
              </div>
            </div>
            {renderDisputeDetail(dispute)}
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
        <strong>Note:</strong> These are proposed corrections only. The registrar's office will review your submission and verify the information before making any changes to your record.
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-slate-100">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
          Cancel
        </button>
        <button
          onClick={onEdit}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 inline-flex items-center gap-2"
        >
          <FileEdit size={16} />
          Edit disputes
        </button>
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              Submitting...
            </span>
          ) : (
            <>
              <CheckCircle2 size={16} />
              Submit disputes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
