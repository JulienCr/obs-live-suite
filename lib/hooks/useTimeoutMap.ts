"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Hook for managing multiple named timeouts with automatic cleanup on unmount.
 *
 * This replaces the common pattern of using multiple refs for timeout management:
 *
 * @example
 * ```typescript
 * // Before (manual refs):
 * const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
 * const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
 *
 * // Set timeout
 * if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
 * reconnectTimeoutRef.current = setTimeout(() => { ... }, delay);
 *
 * // Cleanup
 * useEffect(() => {
 *   return () => {
 *     if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
 *     if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
 *   };
 * }, []);
 *
 * // After (using useTimeoutMap):
 * const timeouts = useTimeoutMap();
 * timeouts.set("reconnect", () => { ... }, delay);
 * timeouts.set("hide", () => { ... }, hideDelay);
 * // Auto-cleanup on unmount
 * ```
 *
 * @returns Object with set, clear, clearAll, and has methods
 */
export function useTimeoutMap() {
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Set a named timeout. If a timeout with the same name already exists,
   * it will be cleared before setting the new one.
   *
   * @param name - Unique identifier for this timeout
   * @param callback - Function to execute after the delay
   * @param delay - Delay in milliseconds
   */
  const set = useCallback(
    (name: string, callback: () => void, delay: number) => {
      // Clear existing timeout with the same name
      const existing = timeoutsRef.current.get(name);
      if (existing !== undefined) {
        clearTimeout(existing);
      }

      // Set new timeout
      const timeoutId = setTimeout(() => {
        timeoutsRef.current.delete(name);
        callback();
      }, delay);

      timeoutsRef.current.set(name, timeoutId);
    },
    []
  );

  /**
   * Clear a specific named timeout.
   *
   * @param name - The name of the timeout to clear
   * @returns true if a timeout was cleared, false if no timeout existed with that name
   */
  const clear = useCallback((name: string): boolean => {
    const timeoutId = timeoutsRef.current.get(name);
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutsRef.current.delete(name);
      return true;
    }
    return false;
  }, []);

  /**
   * Clear all active timeouts.
   */
  const clearAll = useCallback(() => {
    timeoutsRef.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    timeoutsRef.current.clear();
  }, []);

  /**
   * Check if a timeout with the given name is currently active.
   *
   * @param name - The name of the timeout to check
   * @returns true if the timeout exists and is active
   */
  const has = useCallback((name: string): boolean => {
    return timeoutsRef.current.has(name);
  }, []);

  /**
   * Get the number of active timeouts.
   */
  const size = useCallback((): number => {
    return timeoutsRef.current.size;
  }, []);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      timeoutsRef.current.clear();
    };
  }, []);

  return {
    set,
    clear,
    clearAll,
    has,
    size,
  };
}

/**
 * Type for the return value of useTimeoutMap hook.
 */
export type TimeoutMap = ReturnType<typeof useTimeoutMap>;
