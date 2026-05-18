/**
 * useDashboardStats - Domain-specific hook for fetching dashboard statistics
 * 
 * Wraps the generic useApiQuery hook to provide a domain-specific API
 * for fetching dashboard statistics with domain language.
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether the query is enabled (default: true)
 * @param {boolean} options.silent - Suppress error toasts (default: false)
 * 
 * @returns {Object} Query result
 * @returns {Object} data - Dashboard statistics object
 * @returns {boolean} isLoading - True on initial load
 * @returns {boolean} isRefreshing - True on manual refresh
 * @returns {Function} refresh - Function to manually refetch
 * @returns {Error} error - Error object if request failed
 * @returns {Function} invalidate - Function to invalidate cache
 */

import { useApiQuery } from '../api/useApiQuery.js';

export function useDashboardStats(options = {}) {
  const { enabled = true, silent = false, ...restOptions } = options;

  return useApiQuery('/analytics/stats/', {
    enabled,
    silent,
    ...restOptions,
  });
}
