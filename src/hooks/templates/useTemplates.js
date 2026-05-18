/**
 * useTemplates - Domain-specific hooks for template operations
 * 
 * Provides domain-specific hooks for template CRUD operations,
 * wrapping the generic useApiQuery and useApiMutation hooks.
 */

import { useApiQuery } from '../api/useApiQuery.js';
import { useApiMutation } from '../api/useApiMutation.js';

export function useTemplates() {
  /**
   * Fetch all templates
   */
  return useApiQuery('/templates/');
}

export function useTemplate(id) {
  /**
   * Fetch a single template by ID
   */
  return useApiQuery(`/templates/${id}/`);
}

export function useCreateTemplate() {
  /**
   * Create a new template
   */
  return useApiMutation('/templates/', {
    method: 'POST',
  });
}

export function useUpdateTemplate(id) {
  /**
   * Update an existing template
   */
  return useApiMutation(`/templates/${id}/`, {
    method: 'PATCH',
  });
}

export function useDeleteTemplate(id) {
  /**
   * Delete a template
   */
  return useApiMutation(`/templates/${id}/`, {
    method: 'DELETE',
  });
}

export function useLockTemplate(id) {
  /**
   * Lock a template (prevent further edits)
   */
  return useApiMutation(`/templates/${id}/lock/`, {
    method: 'POST',
  });
}

export function useUnlockTemplate(id) {
  /**
   * Unlock a template (allow edits)
   */
  return useApiMutation(`/templates/${id}/unlock/`, {
    method: 'POST',
  });
}

export function useSystemFonts() {
  /**
   * Fetch available system fonts
   */
  return useApiQuery('/templates/system-fonts/');
}
