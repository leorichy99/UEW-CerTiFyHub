/**
 * Unit tests for useApiQuery hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApiQuery } from './useApiQuery.js';

// Mock the api module
vi.mock('../../services/api.js', () => ({
  default: {
    get: vi.fn(),
  },
}));

import api from '../../services/api.js';

describe('useApiQuery', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('basic functionality', () => {
    it('should fetch data from API', async () => {
      const mockData = { id: 1, name: 'Test' };
      api.get.mockResolvedValue({ data: mockData });

      const { result } = renderHook(() => useApiQuery('/test'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(api.get).toHaveBeenCalledWith('/test', { params: {} });
    });

    it('should pass query parameters', async () => {
      const mockData = { id: 1 };
      api.get.mockResolvedValue({ data: mockData });

      const params = { page: 1, limit: 10 };

      const { result } = renderHook(() => useApiQuery('/test', { params }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(api.get).toHaveBeenCalledWith('/test', { params });
    });

    it('should handle API errors', async () => {
      const mockError = new Error('API Error');
      api.get.mockRejectedValue(mockError);

      const { result } = renderHook(() => useApiQuery('/test'), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error).toBe(mockError);
    });

    it('should call onError callback on error', async () => {
      const mockError = new Error('API Error');
      api.get.mockRejectedValue(mockError);
      const onError = vi.fn();

      renderHook(() => useApiQuery('/test', { onError }), { wrapper });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(mockError);
      });
    });
  });

  describe('refresh functionality', () => {
    it('should provide refresh function', async () => {
      const mockData = { id: 1 };
      api.get.mockResolvedValue({ data: mockData });

      const { result } = renderHook(() => useApiQuery('/test'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.refresh).toBeDefined();
      expect(typeof result.current.refresh).toBe('function');
    });

    it('should refetch data when refresh is called', async () => {
      api.get.mockResolvedValue({ data: { id: 1 } });

      const { result } = renderHook(() => useApiQuery('/test'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(api.get).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refresh();
      });

      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('invalidate functionality', () => {
    it('should provide invalidate function', async () => {
      api.get.mockResolvedValue({ data: { id: 1 } });

      const { result } = renderHook(() => useApiQuery('/test'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.invalidate).toBeDefined();
      expect(typeof result.current.invalidate).toBe('function');
    });
  });

  describe('meta information', () => {
    it('should include meta information', async () => {
      const mockData = { id: 1 };
      api.get.mockResolvedValue({ data: mockData });

      const params = { page: 1 };

      const { result } = renderHook(() => useApiQuery('/test', { params }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.meta).toBeDefined();
      expect(result.current.meta.url).toBe('/test');
      expect(result.current.meta.params).toEqual(params);
      expect(result.current.meta.queryKey).toEqual(['/test', params]);
      expect(result.current.meta.lastUpdated).toBeDefined();
    });
  });

  describe('enabled option', () => {
    it('should not fetch when disabled', async () => {
      api.get.mockResolvedValue({ data: { id: 1 } });

      renderHook(() => useApiQuery('/test', { enabled: false }), { wrapper });

      expect(api.get).not.toHaveBeenCalled();
    });

    it('should fetch when enabled', async () => {
      const { rerender } = renderHook(
        ({ enabled }) => useApiQuery('/test', { enabled }),
        { wrapper, initialProps: { enabled: false } }
      );

      expect(api.get).not.toHaveBeenCalled();

      rerender({ enabled: true });

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });
    });
  });

  describe('React Query integration', () => {
    it('should expose internal query object', async () => {
      api.get.mockResolvedValue({ data: { id: 1 } });

      const { result } = renderHook(() => useApiQuery('/test'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current._query).toBeDefined();
      expect(result.current._query.isSuccess).toBe(true);
    });
  });
});
