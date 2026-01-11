"use client";

import { useRef, useCallback, useEffect } from "react";

interface UseDebouncedActionOptions {
  /** Delay in milliseconds (default: 100) */
  delay?: number;

  /** Whether debouncing is currently active (default: true) */
  enabled?: boolean;
}

/**
 * Hook for debounced actions, commonly used for live updates.
 * Handles cleanup on unmount automatically.
 *
 * @example
 * ```tsx
 * const debouncedUpdate = useDebouncedAction(
 *   (value: string) => sendUpdate(value),
 *   { delay: 100, enabled: isRunning }
 * );
 *
 * // Call debouncedUpdate instead of sendUpdate directly
 * debouncedUpdate(newValue);
 * ```
 */
export function useDebouncedAction<T extends (...args: never[]) => void>(
  action: T,
  { delay = 100, enabled = true }: UseDebouncedActionOptions = {}
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const actionRef = useRef(action);

  // Keep action ref updated
  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedAction = useCallback(
    (...args: Parameters<T>) => {
      if (!enabled) {
        actionRef.current(...args);
        return;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        actionRef.current(...args);
      }, delay);
    },
    [delay, enabled]
  ) as T;

  return debouncedAction;
}
