/**
 * Unit tests for useApiMutation hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApiMutation } from './useApiMutation.js';

// Mock the api module
vi.mock('../../services/api.js', () => ({
  default: vi.fn(),
}));

import api from '../../services/api.js';

describe('useApiMutation', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: {
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
    it('should execute POST mutation', async () => {
      const mockData = { id: 1, name: 'Test' };
      api.mockResolvedValue({ data: mockData });

      const { result } = renderHook(() => useApiMutation('/test'), { wrapper });

      const response = await result.current.execute({ name: 'Test' });

      expect(response).toEqual(mockData);
      expect(api).toHaveBeenCalledWith({
        url: '/test',
        method: 'POST',
        data: { name: 'Test' },
      });
    });

    it('should use specified HTTP method', async () => {
      const mockData = { id: 1 };
      api.mockResolvedValue({ data: mockData });

      const { result } = renderHook(() => useApiMutation('/test', { method: 'PUT' }), { wrapper });

      await result.current.execute({ name: 'Test' });

      expect(api).toHaveBeenCalledWith({
        url: '/test',
        method: 'PUT',
        data: { name: 'Test' },
      });
    });

    it('should handle API errors', async () => {
      const mockError = new Error('API Error');
      api.mockRejectedValue(mockError);

      const { result } = renderHook(() => useApiMutation('/test'), { wrapper });

      await expect(result.current.execute({ name: 'Test' })).rejects.toThrow();

      expect(result.current.error).toBe(mockError);
    });

    it('should call onError callback on error', async () => {
      const mockError = new Error('API Error');
      api.mockRejectedValue(mockError);
      const onError = vi.fn();

      const { result } = renderHook(() => useApiMutation('/test', { onError }), { wrapper });

      try {
        await result.current.execute({ name: 'Test' });
      } catch (e) {
        // Expected
      }

      expect(onError).toHaveBeenCalledWith(mockError, { name: 'Test' });
    });
  });

  describe('execution state', () => {
    it('should track execution state', async () => {
      api.mockResolvedValue({ data: { id: 1 } });

      const { result } = renderHook(() => useApiMutation('/test'), { wrapper });

      expect(result.current.isExecuting).toBe(false);

      const promise = result.current.execute({ name: 'Test' });

      expect(result.current.isExecuting).toBe(true);

      await promise;

      expect(result.current.isExecuting).toBe(false);
    });

    it('should set result on success', async () => {
      const mockData = { id: 1, name: 'Test' };
      api.mockResolvedValue({ data: mockData });

      const { result } = renderHook(() => useApiMutation('/test'), { wrapper });

      await result.current.execute({ name: 'Test' });

      expect(result.current.result).toEqual(mockData);
    });
  });

  describe('callbacks', () => {
    it('should call onSuccess callback on success', async () => {
      const mockData = { id: 1 };
      api.mockResolvedValue({ data: mockData });
      const onSuccess = vi.fn();

      const { result } = renderHook(() => useApiMutation('/test', { onSuccess }), { wrapper });

      await result.current.execute({ name: 'Test' });

      expect(onSuccess).toHaveBeenCalledWith(mockData, { name: 'Test' });
    });

    it('should call onSettled callback on completion', async () => {
      const mockData = { id: 1 };
      api.mockResolvedValue({ data: mockData });
      const onSettled = vi.fn();

      const { result } = renderHook(() => useApiMutation('/test', { onSettled }), { wrapper });

      await result.current.execute({ name: 'Test' });

      expect(onSettled).toHaveBeenCalledWith(mockData, null, { name: 'Test' });
    });
  });

  describe('React Query integration', () => {
    it('should expose internal mutation object', async () => {
      api.mockResolvedValue({ data: { id: 1 } });

      const { result } = renderHook(() => useApiMutation('/test'), { wrapper });

      expect(result.current._mutation).toBeDefined();
    });
  });

  describe('config overrides', () => {
    it('should pass axios config overrides', async () => {
      const mockData = { id: 1 };
      api.mockResolvedValue({ data: mockData });

      const config = { headers: { 'X-Custom-Header': 'value' } };

      const { result } = renderHook(() => useApiMutation('/test', { config }), { wrapper });

      await result.current.execute({ name: 'Test' });

      expect(api).toHaveBeenCalledWith({
        url: '/test',
        method: 'POST',
        data: { name: 'Test' },
        headers: { 'X-Custom-Header': 'value' },
      });
    });
  });
});
