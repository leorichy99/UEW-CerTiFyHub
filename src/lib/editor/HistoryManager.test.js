/**
 * Unit tests for HistoryManager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryManager } from './HistoryManager.js';

describe('HistoryManager', () => {
  let manager;

  beforeEach(() => {
    manager = new HistoryManager();
  });

  describe('constructor', () => {
    it('should initialize with empty stacks', () => {
      expect(manager.past).toEqual([]);
      expect(manager.future).toEqual([]);
      expect(manager.current).toBeNull();
    });

    it('should accept custom maxHistory', () => {
      const customManager = new HistoryManager({ maxHistory: 50 });
      expect(customManager.maxHistory).toBe(50);
    });

    it('should use default maxHistory of 100', () => {
      expect(manager.maxHistory).toBe(100);
    });

    it('should accept custom clone function', () => {
      const customClone = (state) => JSON.parse(JSON.stringify(state));
      const customManager = new HistoryManager({ clone: customClone });
      expect(customManager.clone).toBe(customClone);
    });

    it('should accept custom eviction hook', () => {
      const onEvict = jest.fn();
      const customManager = new HistoryManager({ onEvict });
      expect(customManager.onEvict).toBe(onEvict);
    });
  });

  describe('push', () => {
    it('should set current state on first push', () => {
      const state = [{ id: 1, x: 0 }];
      manager.push(state);
      
      expect(manager.current).toEqual(state);
      expect(manager.past).toEqual([]);
    });

    it('should move current to past on subsequent push', () => {
      manager.push([{ id: 1, x: 0 }]);
      manager.push([{ id: 1, x: 10 }]);
      
      expect(manager.past).toEqual([{ id: 1, x: 0 }]);
      expect(manager.current).toEqual([{ id: 1, x: 10 }]);
    });

    it('should clear future stack on push', () => {
      manager.push([{ id: 1, x: 0 }]);
      manager.push([{ id: 1, x: 10 }]);
      manager.undo();
      manager.push([{ id: 1, x: 20 }]);
      
      expect(manager.future).toEqual([]);
    });

    it('should clone state before storing', () => {
      const state = [{ id: 1, x: 0 }];
      manager.push(state);
      state[0].x = 100;
      
      expect(manager.current[0].x).toBe(0);
    });

    it('should enforce maxHistory limit', () => {
      const onEvict = jest.fn();
      const limitedManager = new HistoryManager({ maxHistory: 3, onEvict });
      
      for (let i = 0; i < 5; i++) {
        limitedManager.push([{ id: i }]);
      }
      
      expect(limitedManager.past.length).toBe(3);
      expect(onEvict).toHaveBeenCalled();
    });

    it('should call eviction hook with evicted states', () => {
      const onEvict = jest.fn();
      const limitedManager = new HistoryManager({ maxHistory: 2, onEvict });
      
      limitedManager.push([{ id: 0 }]);
      limitedManager.push([{ id: 1 }]);
      limitedManager.push([{ id: 2 }]);
      
      expect(onEvict).toHaveBeenCalledWith([{ id: 0 }]);
    });
  });

  describe('undo', () => {
    it('should return null when cannot undo', () => {
      expect(manager.undo()).toBeNull();
    });

    it('should move current to future and pop from past', () => {
      manager.push([{ id: 1, x: 0 }]);
      manager.push([{ id: 1, x: 10 }]);
      
      const result = manager.undo();
      
      expect(result).toEqual([{ id: 1, x: 0 }]);
      expect(manager.future).toEqual([{ id: 1, x: 10 }]);
      expect(manager.past).toEqual([]);
    });

    it('should update canUndo after undo', () => {
      manager.push([{ id: 1 }]);
      manager.push([{ id: 2 }]);
      
      expect(manager.canUndo).toBe(true);
      manager.undo();
      expect(manager.canUndo).toBe(false);
    });

    it('should update canRedo after undo', () => {
      manager.push([{ id: 1 }]);
      manager.push([{ id: 2 }]);
      
      expect(manager.canRedo).toBe(false);
      manager.undo();
      expect(manager.canRedo).toBe(true);
    });
  });

  describe('redo', () => {
    it('should return null when cannot redo', () => {
      expect(manager.redo()).toBeNull();
    });

    it('should move current to past and pop from future', () => {
      manager.push([{ id: 1, x: 0 }]);
      manager.push([{ id: 1, x: 10 }]);
      manager.undo();
      
      const result = manager.redo();
      
      expect(result).toEqual([{ id: 1, x: 10 }]);
      expect(manager.past).toEqual([{ id: 1, x: 0 }]);
      expect(manager.future).toEqual([]);
    });

    it('should update canRedo after redo', () => {
      manager.push([{ id: 1 }]);
      manager.push([{ id: 2 }]);
      manager.undo();
      
      expect(manager.canRedo).toBe(true);
      manager.redo();
      expect(manager.canRedo).toBe(false);
    });

    it('should update canUndo after redo', () => {
      manager.push([{ id: 1 }]);
      manager.push([{ id: 2 }]);
      manager.undo();
      
      expect(manager.canUndo).toBe(false);
      manager.redo();
      expect(manager.canUndo).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear both past and future stacks', () => {
      manager.push([{ id: 1 }]);
      manager.push([{ id: 2 }]);
      manager.undo();
      
      manager.clear();
      
      expect(manager.past).toEqual([]);
      expect(manager.future).toEqual([]);
      expect(manager.current).toEqual([{ id: 2 }]); // current unchanged
    });
  });

  describe('reset', () => {
    it('should reset stacks with initial state', () => {
      manager.push([{ id: 1 }]);
      manager.push([{ id: 2 }]);
      manager.undo();
      
      manager.reset([{ id: 3 }]);
      
      expect(manager.past).toEqual([]);
      expect(manager.future).toEqual([]);
      expect(manager.current).toEqual([{ id: 3 }]);
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const state = [{ id: 1 }];
      manager.push(state);
      
      expect(manager.getState()).toEqual(state);
    });

    it('should return null when no state', () => {
      expect(manager.getState()).toBeNull();
    });
  });

  describe('canUndo and canRedo', () => {
    it('canUndo should be false initially', () => {
      expect(manager.canUndo).toBe(false);
    });

    it('canRedo should be false initially', () => {
      expect(manager.canRedo).toBe(false);
    });

    it('canUndo should be true after push', () => {
      manager.push([{ id: 1 }]);
      manager.push([{ id: 2 }]);
      
      expect(manager.canUndo).toBe(true);
    });

    it('canRedo should be true after undo', () => {
      manager.push([{ id: 1 }]);
      manager.push([{ id: 2 }]);
      manager.undo();
      
      expect(manager.canRedo).toBe(true);
    });
  });

  describe('custom clone strategy', () => {
    it('should use custom clone function', () => {
      const customClone = jest.fn((state) => [...state]);
      const customManager = new HistoryManager({ clone: customClone });
      
      customManager.push([{ id: 1 }]);
      
      expect(customClone).toHaveBeenCalled();
    });
  });
});
