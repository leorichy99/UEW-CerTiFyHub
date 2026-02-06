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
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

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

  const handleSubmit = () => {
    // Transform data using mapping
    const mappedData = parsedData.map((row) => {
      const mappedRow = {};
      Object.keys(mapping).forEach((excelCol) => {
        const dbField = mapping[excelCol];
        if (dbField) {
          mappedRow[dbField] = row[excelCol];
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
              ? "border-indigo-500 bg-indigo-50"
              : "border-gray-300 hover:border-indigo-400"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-600">
            {isDragActive
              ? "Drop the Excel file here"
              : "Drag and drop an Excel file, or click to browse"}
          </p>
          <p className="text-sm text-gray-400 mt-2">.xls or .xlsx files only</p>
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

          <p className="text-sm text-gray-600 mb-4">
            Found {parsedData.length} rows. Map Excel columns to database
            fields:
          </p>

          <div className="space-y-3">
            {columns.map((col) => (
              <div key={col} className="flex items-center gap-4">
                <div className="flex-1 bg-gray-100 px-3 py-2 rounded">
                  {col}
                </div>
                <span className="text-gray-400">→</span>
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
            className="mt-6 w-full bg-indigo-600 text-white py-3 rounded font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Check size={20} />
            Import {parsedData.length} Students
          </button>
        </div>
      )}
    </div>
  );
}
