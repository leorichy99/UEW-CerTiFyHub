import { useEffect, useMemo } from "react";
import { AlertTriangle } from "lucide-react";

const SYSTEM_FIELDS = [
  { key: "index_number", label: "Index Number", required: true, desc: "Student's institutional ID" },
  { key: "full_name", label: "Full Name", required: true, desc: "Name on the certificate" },
  { key: "gender", label: "Gender", required: false, desc: "Male / Female / Other" },
  { key: "institutional_email", label: "Institutional Email", required: true, desc: "@uew.edu.gh address" },
  { key: "programme", label: "Programme", required: true, desc: "Programme as on certificate" },
  { key: "class_of_degree", label: "Class of Degree", required: true, desc: "Degree classification" },
  { key: "date_of_completion", label: "Date of Completion", required: true, desc: "Programme end date" },
  { key: "date_of_admission", label: "Date of Admission", required: false, desc: "" },
  { key: "faculty", label: "Faculty", required: false, desc: "" },
  { key: "department", label: "Department", required: false, desc: "" },
];

const KNOWN_ALIASES = {
  index_number: ["index number", "index no", "index no.", "reg. no.", "reg no", "registration number", "student id", "student number", "id number"],
  full_name: ["full name", "student name", "name", "student full name", "legal name", "student's name"],
  gender: ["gender", "sex", "student gender"],
  institutional_email: ["institutional email", "email", "student email", "e-mail", "uew email", "institutional e-mail"],
  programme: ["programme", "program", "programme of study", "course", "degree programme", "program of study"],
  class_of_degree: ["class of degree", "degree class", "classification", "class", "degree classification", "award class"],
  date_of_completion: ["date of completion", "completion date", "date completed", "graduation date", "date of graduation", "award date"],
  date_of_admission: ["date of admission", "admission date", "date admitted", "enrolment date", "enrollment date"],
  faculty: ["faculty", "school", "college"],
  department: ["department", "dept", "dept.", "unit"],
};

function suggestMapping(columns) {
  const mapping = {};
  const used = new Set();
  const normalized = Object.fromEntries(columns.map((c) => [c, c.toLowerCase().trim()]));

  for (const field of SYSTEM_FIELDS.map((f) => f.key)) {
    const aliases = KNOWN_ALIASES[field] || [];
    let match = null;
    for (const [col, norm] of Object.entries(normalized)) {
      if (aliases.includes(norm) || norm === field.replace(/_/g, " ")) {
        match = col;
        break;
      }
    }
    if (match && !used.has(match)) {
      mapping[field] = match;
      used.add(match);
    } else {
      mapping[field] = null;
    }
  }

  return mapping;
}

export default function Step2Mapping({
  columns,
  mapping,
  onUpdateMapping,
  error,
}) {
  const unmappedColumns = useMemo(() => {
    const used = new Set(Object.values(mapping).filter(Boolean));
    return columns.filter((c) => !used.has(c));
  }, [columns, mapping]);

  // Auto-map on first mount when mapping is empty
  useEffect(() => {
    if (columns.length > 0 && Object.keys(mapping).length === 0) {
      const suggested = suggestMapping(columns);
      for (const [field, col] of Object.entries(suggested)) {
        if (col) onUpdateMapping(field, col);
      }
    }
  }, [columns]); // eslint-disable-line react-hooks/exhaustive-deps

  const duplicateCols = useMemo(() => {
    const counts = {};
    for (const col of Object.values(mapping).filter(Boolean)) {
      counts[col] = (counts[col] || 0) + 1;
    }
    return Object.entries(counts)
      .filter(([, count]) => count > 1)
      .map(([col]) => col);
  }, [mapping]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Match each system field to the corresponding column in your file.
        Required fields must be mapped.
      </p>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-slate-700 w-1/3">
                System Field
              </th>
              <th className="text-left px-4 py-2 font-medium text-slate-700 w-2/3">
                Your File Column
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {SYSTEM_FIELDS.map((field) => {
              const isDup = duplicateCols.includes(mapping[field.key]);
              return (
                <tr key={field.key}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-800">
                      {field.label}
                      {field.required && (
                        <span className="text-red-500 ml-0.5">*</span>
                      )}
                    </div>
                    {field.desc && (
                      <div className="text-xs text-slate-500">{field.desc}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={mapping[field.key] || ""}
                      onChange={(e) =>
                        onUpdateMapping(field.key, e.target.value || null)
                      }
                      className={`w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                        isDup
                          ? "border-amber-300 bg-amber-50"
                          : "border-slate-200"
                      }`}
                    >
                      <option value="">
                        {field.required ? "— Select column —" : "— Not in file —"}
                      </option>
                      {columns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                    {isDup && (
                      <p className="text-xs text-amber-600 mt-0.5">
                        This column is already mapped to another field.
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {unmappedColumns.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-medium text-slate-600 mb-1">
            Unmapped columns — these will be ignored
          </p>
          <p className="text-xs text-slate-500">{unmappedColumns.join(", ")}</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

    </div>
  );
}
