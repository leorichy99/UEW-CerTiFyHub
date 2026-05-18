/**
 * Integration tests for useEditorHistory hook
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditorHistory } from './useEditorHistory.js';

describe('useEditorHistory', () => {
  const initialElements = [
    { id: 1, x: 0, y: 0, text: 'Element 1' },
    { id: 2, x: 100, y: 100, text: 'Element 2' },
  ];

  beforeEach(() => {
    // Clear any stored managers between tests
  });

  afterEach(() => {
    // Cleanup
  });

  describe('initialization', () => {
    it('should initialize with empty history', () => {
      const { result } = renderHook(() => useEditorHistory([]));
      
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });

    it('should initialize with initial elements', () => {
      const { result } = renderHook(() => useEditorHistory(initialElements));
      
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });

    it('should accept custom maxHistory option', () => {
      const { result } = renderHook(() => 
        useEditorHistory([], { maxHistory: 50 })
      );
      
      // Manager should be created with custom maxHistory
      expect(result.current).toBeDefined();
    });

    it('should accept custom clone function', () => {
      const customClone = jest.fn((state) => [...state]);
      const { result } = renderHook(() => 
        useEditorHistory([], { clone: customClone })
      );
      
      expect(result.current).toBeDefined();
    });

    it('should accept custom eviction hook', () => {
      const onEvict = jest.fn();
      const { result } = renderHook(() => 
        useEditorHistory([], { onEvict })
      );
      
      expect(result.current).toBeDefined();
    });
  });

  describe('push', () => {
    it('should add state to history on push', () => {
      const { result } = renderHook(() => useEditorHistory(initialElements));
      
      act(() => {
        result.current.push([
          { id: 1, x: 0, y: 0, text: 'Element 1' },
          { id: 2, x: 150, y: 100, text: 'Element 2 Modified' },
        ]);
      });
      
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    it('should clear future stack on push', () => {
      const { result } = renderHook(() => useEditorHistory(initialElements));
      
      // Push first state
      act(() => {
        result.current.push([
          { id: 1, x: 0, y: 0, text: 'Element 1' },
          { id: 2, x: 150, y: 100, text: 'Element 2 Modified' },
        ]);
      });
      
      // Undo
      act(() => {
        result.current.undo();
      });
      
      expect(result.current.canRedo).toBe(true);
      
      // Push new state (should clear future)
      act(() => {
        result.current.push([
          { id: 1, x: 0, y: 0, text: 'Element 1' },
          { id: 2, x: 200, y: 100, text: 'Element 2 New' },
        ]);
      });
      
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('undo', () => {
    it('should undo last action', () => {
      const { result } = renderHook(() => useEditorHistory(initialElements));
      
      // Push state
      act(() => {
        result.current.push([
          { id: 1, x: 0, y: 0, text: 'Element 1' },
          { id: 2, x: 150, y: 100, text: 'Element 2 Modified' },
        ]);
      });
      
      expect(result.current.canUndo).toBe(true);
      
      // Undo
      const previousState = act(() => result.current.undo());
      
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(true);
    });

    it('should return null when cannot undo', () => {
      const { result } = renderHook(() => useEditorHistory(initialElements));
      
      const resultState = act(() => result.current.undo());
      
      expect(resultState).toBeNull();
    });
  });

  describe('redo', () => {
    it('should redo last undone action', () => {
      const { result } = renderHook(() => useEditorHistory(initialElements));
      
      // Push state
      act(() => {
        result.current.push([
          { id: 1, x: 0, y: 0, text: 'Element 1' },
          { id: 2, x: 150, y: 100, text: 'Element 2 Modified' },
        ]);
      });
      
      // Undo
      act(() => {
        result.current.undo();
      });
      
      expect(result.current.canRedo).toBe(true);
      
      // Redo
      const resultState = act(() => result.current.redo());
      
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    it('should return null when cannot redo', () => {
      const { result } = renderHook(() => useEditorHistory(initialElements));
      
      const resultState = act(() => result.current.redo());
      
      expect(resultState).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear both past and future stacks', () => {
      const { result } = renderHook(() => useEditorHistory(initialElements));
      
      // Push state
      act(() => {
        result.current.push([
          { id: 1, x: 0, y: 0, text: 'Element 1' },
          { id: 2, x: 150, y: 100, text: 'Element 2 Modified' },
        ]);
      });
      
      // Undo
      act(() => {
        result.current.undo();
      });
      
      expect(result.current.canRedo).toBe(true);
      
      // Clear
      act(() => {
        result.current.clear();
      });
      
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset stacks with new initial state', () => {
      const { result } = renderHook(() => useEditorHistory(initialElements));
      
      // Push state
      act(() => {
        result.current.push([
          { id: 1, x: 0, y: 0, text: 'Element 1' },
          { id: 2, x: 150, y: 100, text: 'Element 2 Modified' },
        ]);
      });
      
      expect(result.current.canUndo).toBe(true);
      
      // Reset
      act(() => {
        result.current.reset([
          { id: 1, x: 0, y: 0, text: 'New Element 1' },
        ]);
      });
      
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('per-preset isolation', () => {
    it('should maintain separate history per preset', () => {
      const { result: result1 } = renderHook(() => 
        useEditorHistory(initialElements, {}, 'preset1')
      );
      const { result: result2 } = renderHook(() => 
        useEditorHistory([], {}, 'preset2')
      );
      
      // Push to preset1
      act(() => {
        result1.current.push([
          { id: 1, x: 0, y: 0, text: 'Preset1 Element' },
        ]);
      });
      
      // preset1 should have undo available
      expect(result1.current.canUndo).toBe(true);
      // preset2 should not
      expect(result2.current.canUndo).toBe(false);
    });
  });

  describe('element-aware cloning', () => {
    it('should clone elements with attrs property', () => {
      const elementsWithAttrs = [
        { id: 1, attrs: { x: 0, y: 0, text: 'Element 1' } },
      ];
      
      const { result } = renderHook(() => useEditorHistory(elementsWithAttrs));
      
      act(() => {
        result.current.push([
          { id: 1, attrs: { x: 100, y: 100, text: 'Element 1 Modified' } },
        ]);
      });
      
      // Should not throw error and should work correctly
      expect(result.current.canUndo).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should cleanup manager on unmount', () => {
      const { result, unmount } = renderHook(() => 
        useEditorHistory(initialElements, {}, 'cleanup-test')
      );
      
      expect(result.current).toBeDefined();
      
      unmount();
      
      // Manager should be cleaned up (no way to directly test this, but should not throw errors)
      const { result: result2 } = renderHook(() => 
        useEditorHistory([], {}, 'cleanup-test')
      );
      
      expect(result2.current).toBeDefined();
    });
  });
});
