# Fix Notification Streaming

## Root Cause
In `src/hooks/useNotificationSSE.js`, the `useEffect` cleanup sets `mountedRef.current = false`, but on subsequent re-runs (triggered when `enabled` flips from `false` to `true` as auth initializes), it never resets `mountedRef.current = true`. The `connect()` function bails immediately because `!mountedRef.current` is true, so the SSE stream never actually starts after the first render cycle. This is why notifications only appear on login (REST API fetch) but never in real time.

The sibling hook `useNotificationSocket.js` already has the correct pattern (`mountedRef.current = true` at the top of the effect).

## Fix
- **File:** `src/hooks/useNotificationSSE.js`
- **Change:** Add `mountedRef.current = true;` at the very top of the `useEffect` body, before the `if (enabled)` check.

## Verification
1. Start the dev servers (Vite + Daphne).
2. Log in and open the browser console.
3. Trigger an event that creates a notification (e.g. extend a batch deadline).
4. Confirm the toast/notification bell updates immediately without a page reload or re-login.

## Risks
- None. This is a one-line bugfix that aligns the SSE hook with the already-working WebSocket hook pattern.
