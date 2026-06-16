import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload, FileSpreadsheet, Download, AlertTriangle, ChevronRight,
} from "lucide-react";
import { generateImportTemplate } from "../../utils/importFileParser.js";

export default function Step1Upload({
  file,
  columns,
  rowCount,
  error,
  onFileSelect,
}) {
  const onDrop = useCallback(
    (accepted) => {
      if (accepted?.[0]) onFileSelect(accepted[0]);
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
  });

  const downloadTemplate = () => {
    const blob = generateImportTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Upload a CSV or XLSX file with your student records.
        </p>
        <button
          type="button"
          onClick={downloadTemplate}
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Download size={14} />
          Download the standard import template
        </button>
      </div>

      <div
        {...getRootProps()}
        className={`bg-white border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
          isDragActive
            ? "border-blue-500 bg-blue-50/50"
            : "border-slate-300 hover:border-slate-400"
        }`}
      >
        <input {...getInputProps()} />
        <FileSpreadsheet
          className={`mx-auto mb-3 transition ${
            isDragActive ? "text-blue-500" : "text-slate-400"
          }`}
          size={40}
        />
        <p className="text-sm text-slate-700 font-medium mb-1">
          {isDragActive
            ? "Drop the file here"
            : "Drag and drop a CSV or XLSX file, or click to browse"}
        </p>
        <p className="text-xs text-slate-500">Max file size: 10MB</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {file && columns.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="text-sm font-medium text-slate-800 mb-2 flex items-center gap-2">
            <ChevronRight size={14} className="text-blue-500" />
            File selected: <span className="text-slate-600">{file.name}</span>
          </div>
          <p className="text-xs text-slate-600 mb-2">
            Columns detected ({columns.length}):{" "}
            <span className="font-medium">{columns.join(" / ")}</span>
          </p>
          <p className="text-xs text-slate-500">
            Rows estimated: {rowCount}
          </p>
        </div>
      )}
    </div>
  );
}
