/**
 * useApiMutation - Generic React Query hook for POST/PUT/DELETE requests
 * 
 * Wraps React Query's useMutation with domain-specific error handling
 * and a consistent API surface.
 * 
 * @param {string} url - The API endpoint URL
 * @param {Object} options - React Query and custom options
 * @param {string} options.method - HTTP method (default: POST)
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 * @param {Function} options.onSettled - Settled callback
 * @param {Object} options.config - Axios config overrides
 * 
 * @returns {Object} Mutation result
 * @returns {Function} execute - Function to execute mutation
 * @returns {boolean} isExecuting - True while mutation is in progress
 * @returns {Error} error - Error object if mutation failed
 * @returns {any} result - Response data on success
 */

import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import api from '../../services/api.js';

export function useApiMutation(url, options = {}) {
  const {
    method = 'POST',
    onSuccess,
    onError,
    onSettled,
    config = {},
    ...reactQueryOptions
  } = options;

  // Mutation function
  const mutationFn = useCallback(async (data) => {
    try {
      const response = await api({
        url,
        method,
        data,
        ...config,
      });
      return response.data;
    } catch (error) {
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }, [url, method, config, onError]);

  // React Query mutation hook
  const mutation = useMutation({
    mutationFn,
    onSuccess: (data, variables, context) => {
      if (onSuccess) {
        onSuccess(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      if (onError) {
        onError(error, variables, context);
      }
    },
    onSettled: (data, error, variables, context) => {
      if (onSettled) {
        onSettled(data, error, variables, context);
      }
    },
    retry: 1,
    ...reactQueryOptions,
  });

  // Execute function with method override support
  const execute = useCallback((data, overrideMethod) => {
    return mutation.mutateAsync(data, {
      onSuccess: (responseData, variables) => {
        if (onSuccess) {
          onSuccess(responseData, variables);
        }
      },
    });
  }, [mutation, onSuccess]);

  return {
    execute,
    isExecuting: mutation.isPending,
    error: mutation.error,
    result: mutation.data,
    _mutation: mutation,
  };
}
