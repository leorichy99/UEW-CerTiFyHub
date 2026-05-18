/**
 * HistoryManager - Pure class for undo/redo stack management
 * 
 * Manages past and future stacks for state history, supporting:
 * - Push states to history
 * - Undo/redo operations
 * - Configurable stack limits
 * - Eviction hooks
 * - Custom cloning strategies
 */

export class HistoryManager {
  constructor(options = {}) {
    this.maxHistory = options.maxHistory ?? 100;
    this.clone = options.clone ?? this._defaultClone;
    this.onEvict = options.onEvict ?? (() => {});
    
    this.past = [];
    this.future = [];
    this.current = null;
  }

  /**
   * Default clone function: shallow clone array, shallow clone each element
   */
  _defaultClone(state) {
    if (Array.isArray(state)) {
      return state.map(item => ({ ...item }));
    }
    return state;
  }

  /**
   * Push a new state to history
   * - Adds current state to past stack
   * - Clears future stack
   * - Enforces maxHistory limit
   */
  push(state) {
    if (this.current !== null) {
      this.past.push(this.clone(this.current));
    }
    
    this.current = this.clone(state);
    this.future = [];
    
    // Enforce maxHistory limit
    if (this.past.length > this.maxHistory) {
      const evicted = this.past.splice(0, this.past.length - this.maxHistory);
      this.onEvict(evicted);
    }
  }

  /**
   * Undo: move current to future, pop from past
   */
  undo() {
    if (!this.canUndo) {
      return this.current;
    }
    
    this.future.push(this.clone(this.current));
    this.current = this.past.pop();
    
    return this.current;
  }

  /**
   * Redo: move current to past, pop from future
   */
  redo() {
    if (!this.canRedo) {
      return this.current;
    }
    
    this.past.push(this.clone(this.current));
    this.current = this.future.pop();
    
    return this.current;
  }

  /**
   * Check if undo is available
   */
  get canUndo() {
    return this.past.length > 0;
  }

  /**
   * Check if redo is available
   */
  get canRedo() {
    return this.future.length > 0;
  }

  /**
   * Clear both past and future stacks
   */
  clear() {
    this.past = [];
    this.future = [];
  }

  /**
   * Reset stacks with initial state
   */
  reset(initialState) {
    this.past = [];
    this.future = [];
    this.current = this.clone(initialState);
  }

  /**
   * Get current state
   */
  getState() {
    return this.current;
  }
}
