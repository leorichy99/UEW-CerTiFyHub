/**
 * useEditorHistory - React hook for undo/redo functionality in the certificate editor
 * 
 * Wraps the HistoryManager class to provide React-friendly API with state management.
 * 
 * @param {Array} elements - Current editor elements array
 * @param {Object} options - Configuration options
 * @param {number} options.maxHistory - Maximum history stack size (default: 100)
 * @param {Function} options.clone - Custom clone function (default: element-aware shallow clone)
 * @param {Function} options.onEvict - Eviction hook called when states are evicted
 * @param {string} presetId - Preset identifier for per-preset history (optional)
 * 
 * @returns {Object} History API
 * @returns {Function} undo - Undo last action
 * @returns {Function} redo - Redo last undone action
 * @returns {boolean} canUndo - Whether undo is available
 * @returns {boolean} canRedo - Whether redo is available
 * @returns {Function} clear - Clear history stacks
 * @returns {Function} reset - Reset history with initial state
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { HistoryManager } from '../../lib/editor/HistoryManager.js';

export function useEditorHistory(elements, options = {}, presetId = 'default') {
  const {
    maxHistory = 100,
    clone = undefined,
    onEvict = undefined,
  } = options;

  // Default element-aware clone function
  const defaultClone = useCallback((state) => {
    if (Array.isArray(state)) {
      return state.map(item => {
        // Element-aware shallow clone: copy the element object but preserve complex properties
        if (item && typeof item === 'object') {
          const cloned = { ...item };
          // Deep clone attrs if present (common in Konva elements)
          if (item.attrs) {
            cloned.attrs = { ...item.attrs };
          }
          return cloned;
        }
        return item;
      });
    }
    return state;
  }, []);

  const finalClone = clone || defaultClone;

  // Store HistoryManager instances per preset
  const managersRef = useRef({});
  
  // Get or create manager for this preset
  const getManager = useCallback(() => {
    if (!managersRef.current[presetId]) {
      managersRef.current[presetId] = new HistoryManager({
        maxHistory,
        clone: finalClone,
        onEvict,
      });
    }
    return managersRef.current[presetId];
  }, [presetId, maxHistory, finalClone, onEvict]);

  // State for undo/redo availability
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Initialize manager with initial elements
  useEffect(() => {
    const manager = getManager();
    if (elements && manager.getState() === null) {
      manager.reset(elements);
      setCanUndo(false);
      setCanRedo(false);
    }
  }, [elements, getManager]);

  // Update undo/redo state when manager changes
  const updateState = useCallback(() => {
    const manager = getManager();
    setCanUndo(manager.canUndo);
    setCanRedo(manager.canRedo);
  }, [getManager]);

  // Push new state to history
  const push = useCallback((newElements) => {
    const manager = getManager();
    manager.push(newElements);
    updateState();
  }, [getManager, updateState]);

  // Undo last action
  const undo = useCallback(() => {
    const manager = getManager();
    const result = manager.undo();
    updateState();
    return result;
  }, [getManager, updateState]);

  // Redo last undone action
  const redo = useCallback(() => {
    const manager = getManager();
    const result = manager.redo();
    updateState();
    return result;
  }, [getManager, updateState]);

  // Clear history
  const clear = useCallback(() => {
    const manager = getManager();
    manager.clear();
    updateState();
  }, [getManager, updateState]);

  // Reset history with new initial state
  const reset = useCallback((initialElements) => {
    const manager = getManager();
    manager.reset(initialElements);
    updateState();
  }, [getManager, updateState]);

  // Cleanup manager on unmount
  useEffect(() => {
    return () => {
      if (managersRef.current[presetId]) {
        delete managersRef.current[presetId];
      }
    };
  }, [presetId]);

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
    reset,
    push,
  };
}
