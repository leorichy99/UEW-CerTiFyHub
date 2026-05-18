## Parent

#1 - Architectural Improvements: Extract Deep Modules for Testability

## What to build

Create a pure HistoryManager class to encapsulate undo/redo stack management logic, making it testable independent of React.

Create `src/lib/editor/HistoryManager.js` with:
- Constructor accepting options: `{ maxHistory: 100, clone: (s) => {...}, onEvict: (states) => {...} }`
- `push(state)` method - adds state to past stack, clears future stack, enforces maxHistory limit
- `undo()` method - moves current state to future, pops from past, returns new current state
- `redo()` method - moves current state to past, pops from future, returns new current state
- `canUndo` getter - returns true if past stack has items
- `canRedo` getter - returns true if future stack has items
- `clear()` method - clears both past and future stacks
- `reset(initialState)` method - resets stacks with initial state

Default clone function: shallow clone array, shallow clone each element (element-aware).
Default maxHistory: 100 items.
Eviction: when stack exceeds limit, shift oldest items and call onEvict hook with batch of evicted states.

This slice creates the pure class only - no React integration yet. Subsequent slice will create the useEditorHistory hook.

## Acceptance criteria

- [ ] HistoryManager class exists in `src/lib/editor/HistoryManager.js`
- [ ] Constructor accepts options with defaults
- [ ] push() adds to past, clears future, enforces limit
- [ ] undo() moves current to future, pops from past
- [ ] redo() moves current to past, pops from future
- [ ] canUndo and canRedo getters work correctly
- [ ] clear() and reset() methods work correctly
- [ ] Eviction hook fires when stack exceeds limit
- [ ] Unit tests cover all methods and edge cases (empty stacks, single item, limit enforcement, eviction)
- [ ] Class usage is documented in a `src/lib/editor/README.md` file

## Blocked by

None - can start immediately
