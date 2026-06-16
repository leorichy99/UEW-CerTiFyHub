import Papa from 'papaparse';

/**
 * Parse a CSV or XLSX file in the browser and extract column headers + row count.
 * Returns { columns: string[], rowCount: number, error?: string }.
 */
export async function parseImportFile(file) {
  const name = (file.name || '').toLowerCase();
  const isXlsx = name.endsWith('.xlsx') || name.endsWith('.xls');

  try {
    const buffer = await file.arrayBuffer();
    if (isXlsx) {
      return parseXlsx(buffer);
    }
    return parseCsv(buffer);
  } catch (e) {
    return { columns: [], rowCount: 0, error: e.message || 'Failed to read file.' };
  }
}

function parseCsv(buffer) {
  const text = new TextDecoder('utf-8').decode(buffer);
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

  if (parsed.errors.length > 0 && parsed.errors[0].code === 'TooFewFields') {
    return { columns: [], rowCount: 0, error: 'This file could not be read. Ensure it is a valid CSV or XLSX file and try again.' };
  }

  const columns = parsed.meta.fields || [];
  const rowCount = parsed.data.length;

  if (columns.length === 0) {
    return { columns: [], rowCount: 0, error: 'The first row of this file does not appear to contain column headers. If your file has no header row, add one before importing.' };
  }

  return { columns, rowCount };
}

async function parseXlsx(buffer) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rows.length === 0) {
    return { columns: [], rowCount: 0, error: 'File is empty or unreadable.' };
  }

  const columns = rows[0].map((h) => String(h).trim()).filter(Boolean);
  const rowCount = rows.length - 1;

  if (columns.length === 0) {
    return { columns: [], rowCount: 0, error: 'The first row of this file does not appear to contain column headers. If your file has no header row, add one before importing.' };
  }

  return { columns, rowCount };
}

/**
 * Generate a standard import template CSV as a Blob.
 */
export function generateImportTemplate() {
  const headers = [
    'Index Number',
    'Full Name',
    'Gender',
    'Institutional Email',
    'Programme',
    'Class of Degree',
    'Date of Completion',
    'Date of Admission',
    'Faculty',
    'Department',
  ];
  const example = [
    'UEW/2021/0001',
    'John Doe',
    'Male',
    'j.doe@uew.edu.gh',
    'B.Ed Mathematics',
    'Second Class Upper',
    '2024-06-30',
    '2020-09-01',
    'Faculty of Science and Education',
    'Department of Mathematics',
  ];
  const csv = Papa.unparse([headers, example]);
  return new Blob([csv], { type: 'text/csv' });
}
