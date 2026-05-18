## Parent

#1 - Architectural Improvements: Extract Deep Modules for Testability

## What to build

Set up React Query infrastructure to enable efficient data fetching, caching, and state management across the frontend application.

Install `@tanstack/react-query` package. Create a global QueryClient instance in `src/main.jsx` with sensible defaults (staleTime, cacheTime, retry logic). Wrap the application with QueryClientProvider to make React Query available to all components.

Configure QueryClient with:
- Default staleTime of 5 minutes
- Default cacheTime of 10 minutes
- Retry logic for failed requests (3 retries with exponential backoff)
- Error logging for failed queries

This slice establishes the React Query foundation - no actual hooks are created yet. Subsequent slices will build useApiQuery and useApiMutation on top of this infrastructure.

## Acceptance criteria

- [ ] `@tanstack/react-query` is installed in package.json
- [ ] QueryClient is created in `src/main.jsx` with configured defaults
- [ ] App is wrapped with QueryClientProvider
- [ ] React Query DevTools are configured for development
- [ ] Configuration is documented in a `src/hooks/README.md` file

## Blocked by

None - can start immediately
