import { useMemo } from "react";
import {
  CheckCircle2, XCircle, AlertTriangle, Loader2,
} from "lucide-react";
import Table from "../ui/Table.jsx";

export default function Step3Review({
  preview,
  loading,
  skipInvalid,
  onToggleSkipInvalid,
}) {
  const issueGroups = useMemo(() => {
    if (!preview?.issues) return {};
    const groups = {};
    for (const issue of preview.issues) {
      const key = issue.field || "general";
      if (!groups[key]) groups[key] = [];
      groups[key].push(issue);
    }
    return groups;
  }, [preview]);

  const hasIssues = preview?.issues?.length > 0;
  const totalPreviewRows = preview?.preview_rows?.length || 0;
  const totalRows = preview?.total_rows || 0;

  const fieldLabels = {
    index_number: "Index Number",
    first_name: "First Name",
    other_names: "Other Names",
    last_name: "Last Name",
    gender: "Gender",
    institutional_email: "Email",
    programme: "Programme",
    class_of_degree: "Class",
    date_of_completion: "Completion",
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-600 mb-3" size={28} />
        <p className="text-sm text-slate-600">Generating preview…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-slate-600 flex-wrap">
        <span>{totalPreviewRows} preview rows</span>
        <span className="text-slate-300">·</span>
        <span>Total rows in file: {totalRows}</span>
        {hasIssues && (
          <>
            <span className="text-slate-300">·</span>
            <span className="text-amber-700">
              Estimated issues: {preview.estimated_issues}
            </span>
          </>
        )}
      </div>

      <div className="border border-slate-200 rounded-lg overflow-auto max-h-[420px]">
        <Table>
          <Table.Head>
            <tr>
              {Object.keys(fieldLabels).map((k) => (
                <Table.HeaderCell key={k} className="whitespace-nowrap">
                  {fieldLabels[k]}
                </Table.HeaderCell>
              ))}
              <Table.HeaderCell className="whitespace-nowrap">Status</Table.HeaderCell>
            </tr>
          </Table.Head>
          <Table.Body>
            {preview?.preview_rows?.map((row, i) => (
              <Table.Row key={i}>
                {Object.keys(fieldLabels).map((k) => (
                  <Table.Cell key={k} className="whitespace-nowrap">
                    {row[k] || "—"}
                  </Table.Cell>
                ))}
                <Table.Cell className="whitespace-nowrap">
                  {row._status === "valid" ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 size={12} /> Valid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-600">
                      <XCircle size={12} /> {row._issue}
                    </span>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>

      {hasIssues && (
        <div className="border border-amber-200 rounded-lg overflow-hidden">
          <div className="bg-amber-50 px-3 py-2 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-600" />
            <span className="text-xs font-medium text-amber-800">
              Issues found in preview ({preview.issues.length} rows affected)
            </span>
          </div>
          <div className="p-3 space-y-2 max-h-[180px] overflow-auto">
            {Object.entries(issueGroups).map(([field, issues]) => (
              <div key={field}>
                <p className="text-xs font-medium text-slate-700 mb-1">
                  {fieldLabels[field] || field} ({issues.length} row{issues.length > 1 ? "s" : ""})
                </p>
                <ul className="text-xs text-slate-600 space-y-0.5 ml-3">
                  {issues.map((issue, i) => (
                    <li key={i}>
                      Row {issue.row}: {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasIssues && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={skipInvalid}
            onChange={(e) => onToggleSkipInvalid(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-slate-700">
            Skip rows with issues and import only valid rows
          </span>
        </label>
      )}

      {!hasIssues && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
          No issues detected in the preview. All {totalPreviewRows} rows appear valid.
        </div>
      )}

    </div>
  );
}
