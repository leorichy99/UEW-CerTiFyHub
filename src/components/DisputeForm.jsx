import React, { useState } from "react";
import { Loader2, Upload, X, ChevronDown, ChevronUp } from "lucide-react";
import { UEW_DEPARTMENTS, HONORS_TYPES } from "../utils/constants";
import { confirmationAPI } from "../services/publicApi";

const DISPUTE_TYPES = [
  { value: 'programme', label: 'Wrong programme' },
  { value: 'class_of_degree', label: 'Wrong class of degree' },
  { value: 'name_spelling', label: 'Name spelling error' },
  { value: 'other', label: 'Other issue' },
];

export default function DisputeForm({ record, onCancel, onSubmit, submitting }) {
  const [disputes, setDisputes] = useState([]);
  const [expandedDispute, setExpandedDispute] = useState(null);

  const addDispute = (type) => {
    const newDispute = {
      id: Date.now(),
      type,
      field: type === 'programme' ? 'programme' : type === 'class_of_degree' ? 'class_of_degree' : 'full_name',
      current_value: record[type === 'programme' ? 'programme' : type === 'class_of_degree' ? 'class_of_degree' : 'full_name'],
      proposed_value: '',
      note: '',
      file: null,
      file_id: null,
    };
    setDisputes([...disputes, newDispute]);
    setExpandedDispute(newDispute.id);
  };

  const removeDispute = (id) => {
    setDisputes(disputes.filter(d => d.id !== id));
    if (expandedDispute === id) setExpandedDispute(null);
  };

  const updateDispute = (id, updates) => {
    setDisputes(disputes.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const handleFileUpload = async (disputeId, file) => {
    // Validate file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Allowed: JPG, JPEG, PNG, PDF');
      return;
    }

    if (file.size > maxSize) {
      alert('File too large. Maximum size is 5MB');
      return;
    }

    // Get token and index number from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const indexNumber = urlParams.get('ix') || urlParams.get('index_number');

    if (!token || !indexNumber) {
      alert('Missing token or index number');
      return;
    }

    try {
      const response = await confirmationAPI.uploadProof(token, indexNumber, file);
      updateDispute(disputeId, { file, file_id: response.data.file_id });
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file. Please try again.');
    }
  };

  const handleSubmit = () => {
    const validDisputes = disputes.filter(d => {
      if (d.type === 'programme' || d.type === 'class_of_degree') {
        return d.proposed_value;
      }
      if (d.type === 'name_spelling') {
        return d.file_id && d.note;
      }
      return d.note;
    });

    if (validDisputes.length === 0) {
      alert('Please complete at least one dispute');
      return;
    }

    onSubmit(validDisputes);
  };

  const renderProgrammeDropdown = (dispute) => {
    return (
      <select
        value={dispute.proposed_value}
        onChange={(e) => updateDispute(dispute.id, { proposed_value: e.target.value })}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
      >
        <option value="">Select correct programme</option>
        {UEW_DEPARTMENTS.map((faculty) => (
          <optgroup key={faculty.faculty} label={faculty.faculty}>
            {faculty.departments.map((dept) => (
              <optgroup key={dept.department} label={`  ${dept.department}`}>
                {dept.programs.map((program) => (
                  <option key={program} value={program}>
                    {program}
                  </option>
                ))}
              </optgroup>
            ))}
          </optgroup>
        ))}
      </select>
    );
  };

  const renderClassOfDegreeDropdown = (dispute) => {
    return (
      <select
        value={dispute.proposed_value}
        onChange={(e) => updateDispute(dispute.id, { proposed_value: e.target.value })}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
      >
        <option value="">Select correct class of degree</option>
        {HONORS_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
    );
  };

  const renderFileUpload = (dispute) => {
    return (
      <div className="space-y-2">
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) handleFileUpload(dispute.id, file);
          }}
          className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {dispute.file && (
          <div className="text-xs text-green-600 flex items-center gap-1">
            <Upload size={12} />
            {dispute.file.name}
          </div>
        )}
        <textarea
          value={dispute.note}
          onChange={(e) => updateDispute(dispute.id, { note: e.target.value })}
          placeholder="Describe the correct spelling..."
          className="w-full min-h-[80px] px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>
    );
  };

  const renderOtherNote = (dispute) => {
    return (
      <textarea
        value={dispute.note}
        onChange={(e) => updateDispute(dispute.id, { note: e.target.value })}
        placeholder="Describe the issue..."
        className="w-full min-h-[100px] px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
      />
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Report issues with your details</h2>
        <p className="text-sm text-slate-500 mt-1">
          Select the type(s) of issue(s) you want to report. You can report multiple issues at once.
        </p>
      </div>

      {/* Add dispute buttons */}
      <div className="flex flex-wrap gap-2">
        {DISPUTE_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => addDispute(type.value)}
            disabled={disputes.some(d => d.type === type.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            + {type.label}
          </button>
        ))}
      </div>

      {/* Dispute items */}
      {disputes.map((dispute) => (
        <div key={dispute.id} className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedDispute(expandedDispute === dispute.id ? null : dispute.id)}
            className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition"
          >
            <span className="text-sm font-medium text-slate-700">
              {DISPUTE_TYPES.find(t => t.value === dispute.type)?.label}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); removeDispute(dispute.id); }}
                className="text-red-500 hover:text-red-700"
              >
                <X size={16} />
              </button>
              {expandedDispute === dispute.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {expandedDispute === dispute.id && (
            <div className="p-4 space-y-3">
              <div className="text-xs text-slate-500">
                Current value: <span className="font-medium text-slate-700">{dispute.current_value}</span>
              </div>

              {dispute.type === 'programme' && renderProgrammeDropdown(dispute)}
              {dispute.type === 'class_of_degree' && renderClassOfDegreeDropdown(dispute)}
              {dispute.type === 'name_spelling' && renderFileUpload(dispute)}
              {dispute.type === 'other' && renderOtherNote(dispute)}
            </div>
          )}
        </div>
      ))}

      {disputes.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm">
          No issues selected. Click a button above to add an issue.
        </div>
      )}

      <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || disputes.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {submitting ? <Loader2 className="animate-spin" size={16} /> : 'Review disputes'}
        </button>
      </div>
    </div>
  );
}
