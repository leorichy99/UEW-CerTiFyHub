/**
 * useCertificates - Domain-specific hooks for certificate operations
 * 
 * Provides domain-specific hooks for certificate CRUD operations,
 * wrapping the generic useApiQuery and useApiMutation hooks.
 */

import { useApiQuery } from '../api/useApiQuery.js';
import { useApiMutation } from '../api/useApiMutation.js';

export function useCertificates(params = {}) {
  /**
   * Fetch list of certificates with optional filtering
   */
  return useApiQuery('/certificates/', { params });
}

export function useCertificate(id) {
  /**
   * Fetch a single certificate by ID
   */
  return useApiQuery(`/certificates/${id}/`);
}

export function useCreateCertificate() {
  /**
   * Create a new certificate
   */
  return useApiMutation('/certificates/', {
    method: 'POST',
  });
}

export function useUpdateCertificate(id) {
  /**
   * Update an existing certificate
   */
  return useApiMutation(`/certificates/${id}/`, {
    method: 'PATCH',
  });
}

export function useDeleteCertificate(id) {
  /**
   * Delete a certificate
   */
  return useApiMutation(`/certificates/${id}/`, {
    method: 'DELETE',
  });
}

export function useDownloadCertificate(id) {
  /**
   * Download certificate PDF
   * Note: This returns a blob, not JSON
   */
  return useApiMutation(`/certificates/${id}/download/`, {
    method: 'GET',
    config: { responseType: 'blob' },
  });
}

export function useCertificatePreview(id) {
  /**
   * Get certificate PNG preview
   * Note: This returns a blob, not JSON
   */
  return useApiQuery(`/certificates/${id}/preview/`, {
    config: { responseType: 'blob' },
  });
}

export function useRegenerateCertificate(id) {
  /**
   * Regenerate certificate PDF
   */
  return useApiMutation(`/certificates/${id}/regenerate/`, {
    method: 'POST',
  });
}

export function useRevokeCertificate(id) {
  /**
   * Revoke a certificate
   */
  return useApiMutation(`/certificates/${id}/revoke/`, {
    method: 'POST',
  });
}

export function useReactivateCertificate(id) {
  /**
   * Reactivate a revoked certificate
   */
  return useApiMutation(`/certificates/${id}/reactivate/`, {
    method: 'POST',
  });
}

export function useBulkIssue() {
  /**
   * Bulk issue certificates
   */
  return useApiMutation('/certificates/bulk_issue/', {
    method: 'POST',
  });
}

export function useBulkBundle() {
  /**
   * Bulk bundle certificates into multi-page PDF
   */
  return useApiMutation('/certificates/bulk_bundle/', {
    method: 'POST',
    config: { responseType: 'blob' },
  });
}
