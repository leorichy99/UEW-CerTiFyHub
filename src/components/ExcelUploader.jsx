/* eslint-disable react/prop-types */
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { Upload, X, Check } from "lucide-react";

export default function ExcelUploader({ onDataParsed }) {
  const [parsedData, setParsedData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({});

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = e.target.result;
      const workbook = XLSX.read(data, { type: "binary", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: "yyyy-mm-dd" });

      setParsedData(json);
      if (json.length > 0) {
        setColumns(Object.keys(json[0]));
      }
    };

    reader.readAsBinaryString(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    multiple: false,
  });

  const handleMappingChange = (excelColumn, dbField) => {
    setMapping({ ...mapping, [excelColumn]: dbField });
  };

  // Convert any date value to YYYY-MM-DD string
  const toISODate = (value) => {
    if (!value) return null;

    // Already a valid ISO date string (e.g. "2026-06-15")
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    // Date object from XLSX cellDates
    if (value instanceof Date && !isNaN(value.getTime())) {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const d = String(value.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // String that can be parsed (e.g. "June 15, 2026" or "15/06/2026")
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1900 && parsed.getFullYear() <= 2100) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      // Plain year like "2026"
      const yr = parseInt(value, 10);
      if (!isNaN(yr) && yr >= 1900 && yr <= 2100) return `${yr}-12-31`;
    }

    // Number that looks like a year
    if (typeof value === 'number' && value >= 1900 && value <= 2100) {
      return `${Math.floor(value)}-12-31`;
    }

    return null;
  };

  const handleSubmit = () => {
    // Transform data using mapping
    const mappedData = parsedData.map((row) => {
      const mappedRow = {};
      Object.keys(mapping).forEach((excelCol) => {
        const dbField = mapping[excelCol];
        if (dbField) {
          let value = row[excelCol];
          if (dbField === 'graduation_date') {
            value = toISODate(value);
          }
          mappedRow[dbField] = value;
        }
      });
      return mappedRow;
    });

    onDataParsed(mappedData);
  };

  return (
    <div className="space-y-6">
      {!parsedData ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition ${
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 hover:border-blue-400"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto mb-4 text-slate-400" size={48} />
          <p className="text-slate-600">
            {isDragActive
              ? "Drop the Excel file here"
              : "Drag and drop an Excel file, or click to browse"}
          </p>
          <p className="text-sm text-slate-400 mt-2">.xls or .xlsx files only</p>
        </div>
      ) : (
        <div className="border rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Map Columns</h3>
            <button
              onClick={() => setParsedData(null)}
              className="text-red-600 hover:text-red-700"
            >
              <X size={20} />
            </button>
          </div>

          <p className="text-sm text-slate-600 mb-4">
            Found {parsedData.length} rows. Map Excel columns to database
            fields:
          </p>

          <div className="space-y-3">
            {columns.map((col) => (
              <div key={col} className="flex items-center gap-4">
                <div className="flex-1 bg-slate-100 px-3 py-2 rounded">
                  {col}
                </div>
                <span className="text-slate-400">→</span>
                <select
                  className="flex-1 border px-3 py-2 rounded"
                  value={mapping[col] || ""}
                  onChange={(e) => handleMappingChange(col, e.target.value)}
                >
                  <option value="">-- Skip --</option>
                  <option value="student_id">Student ID</option>
                  <option value="full_name">Full Name</option>
                  <option value="email">Email</option>
                  <option value="program">Program</option>
                  <option value="graduation_date">Graduation Date</option>
                  <option value="cohort">Cohort</option>
                </select>
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={Object.keys(mapping).length === 0}
            className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition"
          >
            <Check size={20} />
            Import {parsedData.length} Students
          </button>
        </div>
      )}
    </div>
  );
}
