/**
 * Faculty + Department hooks for the registry app.
 */

import { useApiQuery } from '../api/useApiQuery.js';
import { useApiMutation } from '../api/useApiMutation.js';

export function useFaculties(params = {}) {
  return useApiQuery('/registry/faculties/', { params });
}

export function useDepartments(params = {}) {
  return useApiQuery('/registry/departments/', { params });
}

export function useCreateFaculty() {
  return useApiMutation('/registry/faculties/', { method: 'POST' });
}

export function useUpdateFaculty(id) {
  return useApiMutation(`/registry/faculties/${id}/`, { method: 'PATCH' });
}

export function useDeleteFaculty(id) {
  return useApiMutation(`/registry/faculties/${id}/`, { method: 'DELETE' });
}

export function useCreateDepartment() {
  return useApiMutation('/registry/departments/', { method: 'POST' });
}

export function useUpdateDepartment(id) {
  return useApiMutation(`/registry/departments/${id}/`, { method: 'PATCH' });
}

export function useDeleteDepartment(id) {
  return useApiMutation(`/registry/departments/${id}/`, { method: 'DELETE' });
}
