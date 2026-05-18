/**
 * useStudents - Domain-specific hooks for student operations
 * 
 * Provides domain-specific hooks for student CRUD operations,
 * wrapping the generic useApiQuery and useApiMutation hooks.
 */

import { useApiQuery } from '../api/useApiQuery.js';
import { useApiMutation } from '../api/useApiMutation.js';

export function useStudents(params = {}) {
  /**
   * Fetch list of students with optional filtering
   */
  return useApiQuery('/students/', { params });
}

export function useStudent(id) {
  /**
   * Fetch a single student by ID
   */
  return useApiQuery(`/students/${id}/`);
}

export function useCreateStudent() {
  /**
   * Create a new student
   */
  return useApiMutation('/students/', {
    method: 'POST',
  });
}

export function useUpdateStudent(id) {
  /**
   * Update an existing student
   */
  return useApiMutation(`/students/${id}/`, {
    method: 'PATCH',
  });
}

export function useDeleteStudent(id) {
  /**
   * Delete a student
   */
  return useApiMutation(`/students/${id}/`, {
    method: 'DELETE',
  });
}

export function useBulkCreateStudents() {
  /**
   * Bulk create students
   */
  return useApiMutation('/students/bulk_create/', {
    method: 'POST',
  });
}
