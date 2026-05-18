# React Hooks

This directory contains reusable React hooks for data fetching, state management, and domain-specific logic.

## Directory Structure

```
src/hooks/
├── api/                    # Generic API hooks
│   ├── useApiQuery.js      # Generic query hook (GET requests)
│   └── useApiMutation.js   # Generic mutation hook (POST/PUT/DELETE)
├── dashboard/              # Dashboard-specific hooks
│   └── useDashboardStats.js
├── certificates/           # Certificate-specific hooks
│   └── ...
└── editor/                 # Editor-specific hooks
    └── useEditorHistory.js
```

## React Query Configuration

The app uses `@tanstack/react-query` for data fetching, caching, and state management. QueryClient is configured in `src/main.jsx` with:

- **staleTime**: 5 minutes (data considered fresh for 5 minutes)
- **cacheTime**: 10 minutes (data kept in cache for 10 minutes)
- **retry**: 3 attempts with exponential backoff
- **refetchOnWindowFocus**: false (don't refetch when window regains focus)

DevTools are available in development via the React Query DevTools button.

## Generic API Hooks

### useApiQuery

Generic hook for GET requests:

```javascript
import { useApiQuery } from '@/hooks/api/useApiQuery'

const { data, isLoading, isRefreshing, refresh, error, invalidate, meta } = useApiQuery('/analytics/stats/')
```

Returns:
- `data`: Response data
- `isLoading`: True on initial load
- `isRefreshing`: True on manual refresh
- `refresh()`: Function to manually refetch
- `error`: Error object if request failed
- `invalidate()`: Function to invalidate cache
- `meta`: Additional metadata

### useApiMutation

Generic hook for POST/PUT/DELETE requests:

```javascript
import { useApiMutation } from '@/hooks/api/useApiMutation'

const { execute, isExecuting, error, result } = useApiMutation('/api/certificates/')

// Execute mutation
await execute({ method: 'POST', data: { name: 'Test' } })
```

Returns:
- `execute()`: Function to execute mutation
- `isExecuting`: True while mutation is in progress
- `error`: Error object if mutation failed
- `result`: Response data on success

## Page-Specific Hooks

Domain-specific hooks wrap generic hooks with endpoint configuration and domain language:

```javascript
import { useDashboardStats } from '@/hooks/dashboard/useDashboardStats'

const { data, isLoading, refresh } = useDashboardStats()
```

## Editor Hooks

### useEditorHistory

Hook for undo/redo functionality in the certificate editor:

```javascript
import { useEditorHistory } from '@/hooks/editor/useEditorHistory'

const { undo, redo, canUndo, canRedo, clear, reset } = useEditorHistory(elements, {
  maxHistory: 100,
  onEvict: (evictedStates) => console.log('Evicted:', evictedStates)
})
```

## Conventions

- Generic hooks go in `api/`
- Page-specific hooks go in domain folders (dashboard, certificates, etc.)
- All hooks should use TypeScript or JSDoc for type safety
- Hooks should handle loading, error, and empty states
- Use domain language in hook names and parameters
