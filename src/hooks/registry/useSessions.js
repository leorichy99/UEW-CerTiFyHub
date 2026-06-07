/**
 * Hooks for congregation sessions, student records, and import batches.
 */

import { useApiQuery } from '../api/useApiQuery.js';
import { useApiMutation } from '../api/useApiMutation.js';
import api from '../../services/api.js';

// ── Sessions ───────────────────────────────────────────────────────────────

export function useSessions(params = {}) {
  return useApiQuery('/registry/sessions/', { params });
}

export function useSession(id) {
  return useApiQuery(`/registry/sessions/${id}/`, { enabled: !!id });
}

export function useCreateSession() {
  return useApiMutation('/registry/sessions/', { method: 'POST' });
}

export function useCreateBatch() {
  return useApiMutation('/registry/sessions/quick-create/', { method: 'POST' });
}

export function useUpdateSession(id) {
  return useApiMutation(`/registry/sessions/${id}/`, { method: 'PATCH' });
}

export function useDeleteSession(id) {
  return useApiMutation(`/registry/sessions/${id}/`, { method: 'DELETE' });
}

export function useTransitionSession(id) {
  return useApiMutation(`/registry/sessions/${id}/transition/`, { method: 'POST' });
}

export function usePublishSession(id) {
  return useApiMutation(`/registry/sessions/${id}/publish/`, { method: 'POST' });
}

export function useCloseConfirmation(id) {
  return useApiMutation(`/registry/sessions/${id}/close-confirmation/`, { method: 'POST' });
}

export function useStartIssuance(id) {
  return useApiMutation(`/registry/sessions/${id}/start-issuance/`, { method: 'POST' });
}

export function useCompleteSession(id) {
  return useApiMutation(`/registry/sessions/${id}/complete/`, { method: 'POST' });
}

// ── Deadline extensions (Slice 2) ──────────────────────────────────────────

export function useExtendDeadline(id) {
  return useApiMutation(`/registry/sessions/${id}/extend-deadline/`, {
    method: 'POST',
  });
}

export function useDeadlineExtensions(id) {
  return useApiQuery(`/registry/sessions/${id}/deadline-extensions/`, {
    enabled: !!id,
  });
}

// ── Issuance batches (Slice 3) ─────────────────────────────────────────────

export function useIssuanceBatches(sessionId) {
  return useApiQuery(`/registry/sessions/${sessionId}/issuance-batches/`, {
    enabled: !!sessionId,
  });
}

export function useCreateIssuanceBatch(sessionId) {
  return useApiMutation(`/registry/sessions/${sessionId}/issuance-batches/`, {
    method: 'POST',
  });
}

// ── Records ────────────────────────────────────────────────────────────────

export function useSessionRecords(sessionId, params = {}) {
  return useApiQuery(`/registry/sessions/${sessionId}/records/`, {
    params, enabled: !!sessionId,
  });
}

export function useCreateRecord(sessionId) {
  return useApiMutation(`/registry/sessions/${sessionId}/records/`, { method: 'POST' });
}

export function useUpdateRecord(sessionId, recordId) {
  return useApiMutation(
    `/registry/sessions/${sessionId}/records/${recordId}/`,
    { method: 'PATCH' },
  );
}

export function useDeleteRecord(sessionId, recordId) {
  return useApiMutation(
    `/registry/sessions/${sessionId}/records/${recordId}/`,
    { method: 'DELETE' },
  );
}

// ── Import batches ─────────────────────────────────────────────────────────

export function useSessionImports(sessionId) {
  return useApiQuery(`/registry/sessions/${sessionId}/imports/`, {
    enabled: !!sessionId,
  });
}

// ── Disputes ───────────────────────────────────────────────────────────────

export function useSessionDisputes(sessionId) {
  return useApiQuery(`/registry/sessions/${sessionId}/disputes/`, {
    enabled: !!sessionId,
  });
}

export function useResolveDispute(sessionId, recordId) {
  return useApiMutation(
    `/registry/sessions/${sessionId}/records/${recordId}/resolve-dispute/`,
    { method: 'POST' },
  );
}

export async function uploadImportFile(sessionId, file) {
  const data = new FormData();
  data.append('file', file);
  const response = await api.post(
    `/registry/sessions/${sessionId}/imports/upload/`,
    data,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data;
}
