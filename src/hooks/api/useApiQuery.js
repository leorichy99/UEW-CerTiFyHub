/**
 * useApiQuery - Generic React Query hook for GET requests
 * 
 * Wraps React Query's useQuery with domain-specific error handling,
 * caching, and a consistent API surface.
 * 
 * @param {string} url - The API endpoint URL
 * @param {Object} options - React Query and custom options
 * @param {boolean} options.enabled - Whether the query is enabled (default: true)
 * @param {Object} options.params - Query parameters
 * @param {Object} options.config - Axios config overrides
 * @param {Function} options.onError - Error callback
 * @param {boolean} options.silent - Suppress error toasts (default: false)
 * 
 * @returns {Object} Query result
 * @returns {any} data - Response data
 * @returns {boolean} isLoading - True on initial load
 * @returns {boolean} isRefreshing - True on manual refresh
 * @returns {Function} refresh - Function to manually refetch
 * @returns {Error} error - Error object if request failed
 * @returns {Function} invalidate - Function to invalidate cache
 * @returns {Object} meta - Additional metadata
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import api from '../../services/api.js';

export function useApiQuery(url, options = {}) {
  const {
    enabled = true,
    params = {},
    config = {},
    onError,
    silent = false,
    ...reactQueryOptions
  } = options;

  const queryClient = useQueryClient();
  const isManualRefreshRef = useRef(false);

  // Build query key for React Query caching
  const queryKey = [url, params];

  // Fetcher function
  const fetcher = useCallback(async () => {
    try {
      const response = await api.get(url, { params, ...config });
      return response.data;
    } catch (error) {
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }, [url, params, config, onError]);

  // React Query hook
  const query = useQuery({
    queryKey,
    queryFn: fetcher,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    ...reactQueryOptions,
  });

  // Manual refresh function
  const refresh = useCallback(() => {
    isManualRefreshRef.current = true;
    return query.refetch().finally(() => {
      isManualRefreshRef.current = false;
    });
  }, [query]);

  // Invalidate cache function
  const invalidate = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  // Determine if this is a manual refresh
  const isRefreshing = isManualRefreshRef.current && query.isFetching;

  // Meta information
  const meta = {
    url,
    params,
    queryKey,
    isFromCache: query.dataUpdatedAt > query.staleAt,
    lastUpdated: query.dataUpdatedAt,
  };

  return {
    data: query.data,
    isLoading: query.isLoading && !query.isFetching,
    isRefreshing,
    refresh,
    error: query.error,
    invalidate,
    meta,
    // Expose React Query internals for advanced use cases
    _query: query,
  };
}
