/**
 * Hooks for congregation templates (Slice 4).
 *
 * Templates are reusable session-creation scaffolds: one row in
 * `CongregationTemplate` + N `CongregationTemplateSessionDef`s. The matching
 * REST surface lives at `/api/registry/congregation-templates/` with two
 * custom actions:
 *   - POST .../{id}/apply/            — instantiate into a congregation
 *   - POST .../from-congregation/     — snapshot from a congregation
 */

import { useApiQuery } from '../api/useApiQuery.js';
import { useApiMutation } from '../api/useApiMutation.js';

const BASE = '/registry/congregation-templates/';

export function useCongregationTemplates(params = {}) {
  return useApiQuery(BASE, { params });
}

export function useCongregationTemplate(id) {
  return useApiQuery(`${BASE}${id}/`, { enabled: !!id });
}

export function useCreateCongregationTemplate() {
  return useApiMutation(BASE, { method: 'POST' });
}

export function useUpdateCongregationTemplate(id) {
  return useApiMutation(`${BASE}${id}/`, { method: 'PATCH' });
}

export function useDeleteCongregationTemplate(id) {
  return useApiMutation(`${BASE}${id}/`, { method: 'DELETE' });
}

export function useApplyCongregationTemplate(id) {
  return useApiMutation(`${BASE}${id}/apply/`, { method: 'POST' });
}

export function useSnapshotCongregationTemplate() {
  return useApiMutation(`${BASE}from-congregation/`, { method: 'POST' });
}
