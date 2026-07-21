import React, { useState } from "react";
import { Loader2, Upload, X, ChevronDown, ChevronUp } from "lucide-react";
import { UEW_DEPARTMENTS, HONORS_TYPES } from "../utils/constants";
import { confirmationAPI } from "../services/publicApi";

const DISPUTE_TYPES = [
  { value: 'name_incorrect', label: 'Name spelling error' },
  { value: 'programme_incorrect', label: 'Wrong programme' },
  { value: 'class_of_degree_incorrect', label: 'Wrong class of degree' },
  { value: 'other', label: 'Other issue' },
];

export default function DisputeForm({ record, onCancel, onSubmit, submitting }) {
  const [disputeType, setDisputeType] = useState('');
  const [formData, setFormData] = useState({
    claimed_first_name: '',
    claimed_middle_name: '',
    claimed_last_name: '',
    claimed_value: '',
    dispute_note: '',
    supporting_document: null,
  });

  const handleFileChange = (file) => {
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

    setFormData({ ...formData, supporting_document: file });
  };

  const handleSubmit = async () => {
    if (!disputeType) {
      alert('Please select a dispute type');
      return;
    }

    // Validation based on dispute type
    if (disputeType === 'name_incorrect') {
      if (!formData.claimed_first_name && !formData.claimed_middle_name && !formData.claimed_last_name) {
        alert('Please provide at least one claimed name field');
        return;
      }
      if (!formData.supporting_document) {
        alert('Supporting document is required for name disputes');
        return;
      }
    } else if (disputeType === 'programme_incorrect' || disputeType === 'class_of_degree_incorrect') {
      if (!formData.claimed_value || formData.claimed_value.length < 10) {
        alert('Please provide the correct value (at least 10 characters)');
        return;
      }
    } else if (disputeType === 'other') {
      if (!formData.dispute_note || formData.dispute_note.length < 20) {
        alert('Please describe the issue (at least 20 characters)');
        return;
      }
    }

    // Get token and index number from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const indexNumber = urlParams.get('ix') || urlParams.get('index_number');

    if (!token || !indexNumber) {
      alert('Missing token or index number');
      return;
    }

    // Prepare form data for submission
    const submitData = new FormData();
    submitData.append('token', token);
    submitData.append('index_number', indexNumber);
    submitData.append('dispute_type', disputeType);
    
    if (formData.claimed_first_name) submitData.append('claimed_first_name', formData.claimed_first_name);
    if (formData.claimed_middle_name) submitData.append('claimed_middle_name', formData.claimed_middle_name);
    if (formData.claimed_last_name) submitData.append('claimed_last_name', formData.claimed_last_name);
    if (formData.claimed_value) submitData.append('claimed_value', formData.claimed_value);
    if (formData.dispute_note) submitData.append('dispute_note', formData.dispute_note);
    if (formData.supporting_document) submitData.append('supporting_document', formData.supporting_document);

    onSubmit(submitData);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Report an issue with your details</h2>
        <p className="text-sm text-slate-500 mt-1">
          Select the type of issue you want to report and provide the requested information.
        </p>
      </div>

      {/* Dispute type selection */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Type of issue</label>
        <select
          value={disputeType}
          onChange={(e) => setDisputeType(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        >
          <option value="">Select issue type</option>
          {DISPUTE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Dynamic form fields based on dispute type */}
      {disputeType === 'name_incorrect' && (
        <div className="space-y-3">
          <div className="text-xs text-slate-500 mb-2">
            Current name: <span className="font-medium text-slate-700">{record.first_name} {record.middle_name} {record.last_name}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                value={formData.claimed_first_name}
                onChange={(e) => setFormData({ ...formData, claimed_first_name: e.target.value })}
                placeholder="Correct first name"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Middle Name</label>
              <input
                type="text"
                value={formData.claimed_middle_name}
                onChange={(e) => setFormData({ ...formData, claimed_middle_name: e.target.value })}
                placeholder="Correct middle name"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                value={formData.claimed_last_name}
                onChange={(e) => setFormData({ ...formData, claimed_last_name: e.target.value })}
                placeholder="Correct last name"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Supporting Document (required)</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) handleFileChange(file);
              }}
              className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {formData.supporting_document && (
              <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                <Upload size={12} />
                {formData.supporting_document.name}
              </div>
            )}
          </div>
        </div>
      )}

      {disputeType === 'programme_incorrect' && (
        <div className="space-y-3">
          <div className="text-xs text-slate-500 mb-2">
            Current programme: <span className="font-medium text-slate-700">{record.programme}</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Correct Programme</label>
            <select
              value={formData.claimed_value}
              onChange={(e) => setFormData({ ...formData, claimed_value: e.target.value })}
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
          </div>
        </div>
      )}

      {disputeType === 'class_of_degree_incorrect' && (
        <div className="space-y-3">
          <div className="text-xs text-slate-500 mb-2">
            Current class of degree: <span className="font-medium text-slate-700">{record.class_of_degree}</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Correct Class of Degree</label>
            <select
              value={formData.claimed_value}
              onChange={(e) => setFormData({ ...formData, claimed_value: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
              <option value="">Select correct class of degree</option>
              {HONORS_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {disputeType === 'other' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Describe the issue</label>
            <textarea
              value={formData.dispute_note}
              onChange={(e) => setFormData({ ...formData, dispute_note: e.target.value })}
              placeholder="Please describe the issue in detail (at least 20 characters)..."
              className="w-full min-h-[120px] px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || !disputeType}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {submitting ? <Loader2 className="animate-spin" size={16} /> : 'Submit Dispute'}
        </button>
      </div>
    </div>
  );
}
