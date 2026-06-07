/**
 * Hooks for Congregations (Slice 5).
 *
 * Congregations are the umbrella over sessions: one row per academic-year
 * graduation event. The detail endpoint also returns the embedded
 * `sessions` array for the year.
 */

import { useApiQuery } from '../api/useApiQuery.js';
import { useApiMutation } from '../api/useApiMutation.js';

const BASE = '/registry/congregations/';

export function useCongregations(params = {}) {
  return useApiQuery(BASE, { params });
}

export function useCongregation(id) {
  return useApiQuery(`${BASE}${id}/`, { enabled: !!id });
}

export function useCreateCongregation() {
  return useApiMutation(BASE, { method: 'POST' });
}

export function useUpdateCongregation(id) {
  return useApiMutation(`${BASE}${id}/`, { method: 'PATCH' });
}

export function useArchiveCongregation(id) {
  return useApiMutation(`${BASE}${id}/archive/`, { method: 'POST' });
}
