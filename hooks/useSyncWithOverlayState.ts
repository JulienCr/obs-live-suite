"use client";

import { useEffect, useRef } from "react";
import { useOverlayActiveState, OverlayActiveState } from "./useOverlayActiveState";

/**
 * Overlay type keys that can be synced
 */
export type OverlayType = keyof OverlayActiveState;

/**
 * Options for useSyncWithOverlayState hook
 */
export interface UseSyncWithOverlayStateOptions {
  /**
   * The overlay type to sync with
   */
  overlayType: OverlayType;

  /**
   * Current local active state
   */
  localActive: boolean;

  /**
   * Callback when the overlay becomes inactive externally
   * (e.g., from EventLog stop button or another panel)
   */
  onExternalHide: () => void;

  /**
   * Optional callback when the overlay becomes active externally
   * (e.g., from EventLog replay button)
   */
  onExternalShow?: (state: OverlayActiveState[OverlayType]) => void;
}

/**
 * Hook to sync local panel state with the shared overlay active state.
 *
 * This hook handles the common pattern of:
 * 1. Detecting when an overlay is hidden externally (e.g., EventLog stop)
 * 2. Detecting when an overlay is shown externally (e.g., EventLog replay)
 * 3. Calling appropriate callbacks to update local panel state
 *
 * @param options - Configuration options
 * @returns The current overlay active state for the specified type
 *
 * @example
 * ```tsx
 * function LowerThirdPanel() {
 *   const [isVisible, setIsVisible] = useState(false);
 *
 *   const overlayState = useSyncWithOverlayState({
 *     overlayType: "lowerThird",
 *     localActive: isVisible,
 *     onExternalHide: () => setIsVisible(false),
 *   });
 *
 *   return <div>{overlayState.active ? "Active" : "Inactive"}</div>;
 * }
 * ```
 */
export function useSyncWithOverlayState({
  overlayType,
  localActive,
  onExternalHide,
  onExternalShow,
}: UseSyncWithOverlayStateOptions): OverlayActiveState[OverlayType] {
  const overlayState = useOverlayActiveState();
  const currentState = overlayState[overlayType];
  const prevActiveRef = useRef(currentState.active);

  // Sync when overlay is hidden externally
  useEffect(() => {
    if (!currentState.active && localActive) {
      onExternalHide();
    }
  }, [currentState.active, localActive, onExternalHide]);

  // Sync when overlay is shown externally (optional)
  // Only trigger on actual activation, not continued active state
  useEffect(() => {
    const wasActive = prevActiveRef.current;
    const isActive = currentState.active;
    prevActiveRef.current = isActive;

    // Only trigger on actual activation, not continued active state
    if (isActive && !wasActive && onExternalShow) {
      onExternalShow(currentState);
    }
  }, [currentState, onExternalShow]);

  return currentState;
}

/**
 * Simplified hook for panels that only need hide sync.
 *
 * @param overlayType - The overlay type to sync with
 * @param localActive - Current local active state
 * @param onExternalHide - Callback when hidden externally
 * @returns The full overlay active state object
 */
export function useOverlayHideSync(
  overlayType: OverlayType,
  localActive: boolean,
  onExternalHide: () => void
): OverlayActiveState {
  const overlayState = useOverlayActiveState();
  const currentState = overlayState[overlayType];

  useEffect(() => {
    if (!currentState.active && localActive) {
      onExternalHide();
    }
  }, [currentState.active, localActive, onExternalHide]);

  return overlayState;
}
