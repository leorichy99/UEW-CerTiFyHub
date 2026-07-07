import { useState, useCallback, useEffect, useRef } from 'react';
import { parseImportFile } from '../../utils/importFileParser.js';
import {
  uploadImportTempFile,
  previewImport,
  confirmImport,
} from './useBatches.js';

const STEPS = [
  { label: 'Import', key: 1 },
  { label: 'Field Mapping', key: 2 },
  { label: 'Review', key: 3 },
  { label: 'Upload', key: 4 },
];

export function useImportWizard(batchId) {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  // Step 1 state
  const [file, setFile] = useState(null);
  const [parsedColumns, setParsedColumns] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [parseError, setParseError] = useState('');

  // Step 2 state
  const [mapping, setMapping] = useState({});
  const [mappingError, setMappingError] = useState('');

  // Step 3 state
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [skipInvalid, setSkipInvalid] = useState(false);

  // Step 4 state
  const [importBatchId, setImportBatchId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [sseError, setSseError] = useState('');
  const sseRef = useRef(null);

  const reset = useCallback(() => {
    setCurrentStep(1);
    setCompletedSteps(new Set());
    setFile(null);
    setParsedColumns([]);
    setRowCount(0);
    setParseError('');
    setMapping({});
    setMappingError('');
    setPreview(null);
    setPreviewLoading(false);
    setSkipInvalid(false);
    setImportBatchId(null);
    setProgress(null);
    setSseError('');
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
  }, []);

  // ── Step 1: Parse file on the frontend ─────────────────────────────

  const parseFile = useCallback(async (selectedFile) => {
    setFile(selectedFile);
    setParseError('');
    const result = await parseImportFile(selectedFile);
    if (result.error) {
      setParseError(result.error);
      setParsedColumns([]);
      setRowCount(0);
    } else {
      setParsedColumns(result.columns);
      setRowCount(result.rowCount);
    }
  }, []);

  const uploadTempFile = useCallback(async () => {
    if (!file) return;
    try {
      const data = await uploadImportTempFile(batchId, file);
      setParsedColumns(data.columns);
      setRowCount(data.row_count_estimate);
      return data.temp_file_id;
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.response?.data?.file || 'Upload failed';
      setParseError(msg);
      throw e;
    }
  }, [batchId, file]);

  // ── Step 2: Mapping ─────────────────────────────────────────────────

  const updateMapping = useCallback((field, sourceColumn) => {
    setMapping((prev) => ({ ...prev, [field]: sourceColumn }));
    setMappingError('');
  }, []);

  const validateMapping = useCallback(() => {
    const requiredFields = [
      'index_number', 'first_name', 'last_name',
      'institutional_email', 'programme',
      'class_of_degree', 'date_of_completion',
    ];
    const missing = requiredFields.filter((f) => !mapping[f]);
    if (missing.length > 0) {
      setMappingError(`All required fields must be mapped. Missing: ${missing.join(', ')}`);
      return false;
    }

    // Check for duplicate mappings
    const used = Object.entries(mapping).filter(([, v]) => v);
    const seen = new Set();
    for (const [, col] of used) {
      if (seen.has(col)) {
        setMappingError(`Each column can only be mapped to one system field. Duplicate: ${col}`);
        return false;
      }
      seen.add(col);
    }

    setMappingError('');
    return true;
  }, [mapping]);

  // ── Step 3: Preview ─────────────────────────────────────────────────

  const loadPreview = useCallback(async (tempFileId) => {
    setPreviewLoading(true);
    try {
      const data = await previewImport(batchId, tempFileId, mapping);
      setPreview(data);
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Preview generation failed.';
      setMappingError(msg);
      throw e;
    } finally {
      setPreviewLoading(false);
    }
  }, [batchId, mapping]);

  // ── Step 4: Confirm & SSE ─────────────────────────────────────────

  const startImport = useCallback(async (tempFileId) => {
    const data = await confirmImport(batchId, tempFileId, mapping, skipInvalid);
    setImportBatchId(data.import_batch_id);
    return data.import_batch_id;
  }, [batchId, mapping, skipInvalid]);

  useEffect(() => {
    if (!importBatchId) return;

    const token = localStorage.getItem('accessToken') || '';
    const url = `/api/registry/batches/${batchId}/import/${importBatchId}/stream/?token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);
    sseRef.current = source;

    source.addEventListener('import_progress', (e) => {
      try { setProgress(JSON.parse(e.data)); }
      catch (err) { setSseError('Invalid progress data'); }
    });

    source.addEventListener('import_complete', (e) => {
      try {
        const data = JSON.parse(e.data);
        setProgress((prev) => ({
          ...prev,
          ...data,
          complete: true,
          percent: 100,
        }));
      }
      catch (err) { setSseError('Invalid completion data'); }
    });

    source.addEventListener('error', () => {
      setSseError('SSE connection error');
      if (source.readyState === EventSource.CLOSED) source.close();
    });

    return () => source.close();
  }, [importBatchId, batchId]);

  // ── Navigation ───────────────────────────────────────────────────────

  const goToStep = useCallback((step) => {
    if (step <= currentStep || completedSteps.has(step - 1)) {
      setCurrentStep(step);
    }
  }, [currentStep, completedSteps]);

  const nextStep = useCallback(() => {
    setCompletedSteps((prev) => new Set(prev).add(currentStep));
    setCurrentStep((s) => Math.min(s + 1, 4));
  }, [currentStep]);

  const prevStep = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  return {
    steps: STEPS,
    currentStep,
    completedSteps,
    goToStep,
    nextStep,
    prevStep,
    reset,

    // Step 1
    file,
    parsedColumns,
    rowCount,
    parseError,
    parseFile,
    uploadTempFile,

    // Step 2
    mapping,
    updateMapping,
    validateMapping,
    mappingError,

    // Step 3
    preview,
    previewLoading,
    skipInvalid,
    setSkipInvalid,
    loadPreview,

    // Step 4
    importBatchId,
    progress,
    sseError,
    startImport,
  };
}
