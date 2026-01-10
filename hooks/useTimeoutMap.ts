"use client";

import { useRef, useCallback, useEffect } from "react";

/**
 * Hook for managing a map of named timeouts with automatic cleanup.
 * Useful for overlay auto-hide timers and similar patterns.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { set, clear, clearAll } = useTimeoutMap();
 *
 *   const handleShow = (id: string, duration: number) => {
 *     set(id, () => hideItem(id), duration * 1000);
 *   };
 *
 *   const handleHide = (id: string) => {
 *     clear(id);
 *     hideItem(id);
 *   };
 * }
 * ```
 */
export function useTimeoutMap() {
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const clear = useCallback((key: string) => {
    const timeout = timeoutsRef.current.get(key);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(key);
    }
  }, []);

  const set = useCallback(
    (key: string, callback: () => void, delayMs: number) => {
      clear(key);
      if (delayMs > 0) {
        const timeout = setTimeout(() => {
          callback();
          timeoutsRef.current.delete(key);
        }, delayMs);
        timeoutsRef.current.set(key, timeout);
      }
    },
    [clear]
  );

  const clearAll = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  return { set, clear, clearAll };
}
