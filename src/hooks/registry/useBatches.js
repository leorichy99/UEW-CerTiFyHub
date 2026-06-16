/**
 * Hooks for issuance batches, student records, and import batches.
 */

import { useApiQuery } from '../api/useApiQuery.js';
import { useApiMutation } from '../api/useApiMutation.js';
import api from '../../services/api.js';

// ── Batches ────────────────────────────────────────────────────────────────

export function useBatches(params = {}) {
  return useApiQuery('/registry/batches/', { params });
}

export function useBatch(id) {
  return useApiQuery(`/registry/batches/${id}/`, { enabled: !!id });
}

export function useCreateBatch() {
  return useApiMutation('/registry/batches/', { method: 'POST' });
}

export function useUpdateBatch(id) {
  return useApiMutation(`/registry/batches/${id}/`, { method: 'PATCH' });
}

export function useDeleteBatch(id) {
  return useApiMutation(`/registry/batches/${id}/`, { method: 'DELETE' });
}

export function useTransitionBatch(id) {
  return useApiMutation(`/registry/batches/${id}/transition/`, { method: 'POST' });
}

export function usePublishBatch(id) {
  return useApiMutation(`/registry/batches/${id}/publish/`, { method: 'POST' });
}

export function useCloseConfirmation(id) {
  return useApiMutation(`/registry/batches/${id}/close-confirmation/`, { method: 'POST' });
}

export function useStartIssuance(id) {
  return useApiMutation(`/registry/batches/${id}/start-issuance/`, { method: 'POST' });
}

export function useCompleteBatch(id) {
  return useApiMutation(`/registry/batches/${id}/complete/`, { method: 'POST' });
}

// ── Deadline extensions ────────────────────────────────────────────────────

export function useExtendDeadline(id) {
  return useApiMutation(`/registry/batches/${id}/extend-deadline/`, {
    method: 'POST',
  });
}

export function useDeadlineExtensions(id) {
  return useApiQuery(`/registry/batches/${id}/deadline-extensions/`, {
    enabled: !!id,
  });
}

// ── Issuance runs ──────────────────────────────────────────────────────────

export function useIssuanceRuns(batchId) {
  return useApiQuery(`/registry/batches/${batchId}/issuance-runs/`, {
    enabled: !!batchId,
  });
}

export function useCreateIssuanceRun(batchId) {
  return useApiMutation(`/registry/batches/${batchId}/issuance-runs/`, {
    method: 'POST',
  });
}

// ── Records ────────────────────────────────────────────────────────────────

export function useBatchRecords(batchId, params = {}) {
  return useApiQuery(`/registry/batches/${batchId}/records/`, {
    params, enabled: !!batchId,
  });
}

export function useCreateRecord(batchId) {
  return useApiMutation(`/registry/batches/${batchId}/records/`, { method: 'POST' });
}

export function useUpdateRecord(batchId, recordId) {
  return useApiMutation(
    `/registry/batches/${batchId}/records/${recordId}/`,
    { method: 'PATCH' },
  );
}

export function useDeleteRecord(batchId, recordId) {
  return useApiMutation(
    `/registry/batches/${batchId}/records/${recordId}/`,
    { method: 'DELETE' },
  );
}

// ── Import batches ─────────────────────────────────────────────────────────

export function useBatchImports(batchId) {
  return useApiQuery(`/registry/batches/${batchId}/imports/`, {
    enabled: !!batchId,
  });
}

// ── Disputes ───────────────────────────────────────────────────────────────

export function useBatchDisputes(batchId) {
  return useApiQuery(`/registry/batches/${batchId}/disputes/`, {
    enabled: !!batchId,
  });
}

export function useResolveDispute(batchId, recordId) {
  return useApiMutation(
    `/registry/batches/${batchId}/records/${recordId}/resolve-dispute/`,
    { method: 'POST' },
  );
}

export async function uploadImportFile(batchId, file) {
  const data = new FormData();
  data.append('file', file);
  const response = await api.post(
    `/registry/batches/${batchId}/imports/upload/`,
    data,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data;
}

// ── 4-step import wizard ───────────────────────────────────────────────────

export async function uploadImportTempFile(batchId, file) {
  const data = new FormData();
  data.append('file', file);
  const response = await api.post(
    `/registry/batches/${batchId}/import/upload-file/`,
    data,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data;
}

export async function previewImport(batchId, tempFileId, mapping) {
  const response = await api.post(
    `/registry/batches/${batchId}/import/preview/`,
    { temp_file_id: tempFileId, mapping },
  );
  return response.data;
}

export async function confirmImport(batchId, tempFileId, mapping, skipInvalidRows) {
  const response = await api.post(
    `/registry/batches/${batchId}/import/confirm/`,
    { temp_file_id: tempFileId, mapping, skip_invalid_rows: skipInvalidRows },
  );
  return response.data;
}
