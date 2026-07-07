import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const LOCKED_KEY = "session_locked";

export function useSessionLockout() {
  const { isAuthenticated } = useAuth();
  const [isLocked, setIsLocked] = useState(() => {
    try { return localStorage.getItem(LOCKED_KEY) === "true"; } catch { return false; }
  });
  const lastActivityRef = useRef(Date.now());
  const timerRef = useRef(null);

  const lock = useCallback(() => {
    setIsLocked(true);
    try { localStorage.setItem(LOCKED_KEY, "true"); } catch { /* ignore */ }
  }, []);

  const unlock = useCallback(() => {
    setIsLocked(false);
    lastActivityRef.current = Date.now();
    try { localStorage.removeItem(LOCKED_KEY); } catch { /* ignore */ }
  }, []);

  const resetTimer = useCallback(() => {
    if (isLocked) return;
    lastActivityRef.current = Date.now();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(lock, IDLE_TIMEOUT);
  }, [isLocked, lock]);

  // Listen for user activity events
  useEffect(() => {
    if (!isAuthenticated || isLocked) return;

    const events = ["mousemove", "keydown", "touchstart", "click"];
    const handler = () => resetTimer();

    events.forEach((e) => window.addEventListener(e, handler));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAuthenticated, isLocked, resetTimer]);

  // Listen for API activity (successful responses reset the timer)
  useEffect(() => {
    if (!isAuthenticated || isLocked) return;

    const handler = () => resetTimer();
    window.addEventListener("api:activity", handler);
    return () => window.removeEventListener("api:activity", handler);
  }, [isAuthenticated, isLocked, resetTimer]);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { isLocked, lock, unlock };
}
