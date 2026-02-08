"use client";

import { useEffect } from "react";

interface UseVideoKeyboardShortcutsProps {
  enabled: boolean;
  currentTime: number;
  onAddChapter: (timestamp: number) => void;
  onSetInPoint: (timestamp: number) => void;
  onSetOutPoint: (timestamp: number) => void;
  onClearInPoint?: () => void;
}

/**
 * Hook for handling keyboard shortcuts in video editing.
 *
 * Provides the following shortcuts:
 * - `M` - Add chapter at current time
 * - `I` - Set in-point for clip
 * - `O` - Set out-point for clip
 * - `Escape` - Clear in-point
 *
 * Shortcuts are ignored when typing in input fields, textareas, or contenteditable elements.
 *
 * @example
 * ```typescript
 * useVideoKeyboardShortcuts({
 *   enabled: isVideoLoaded,
 *   currentTime: videoRef.current?.currentTime ?? 0,
 *   onAddChapter: (time) => addChapter(time),
 *   onSetInPoint: (time) => setInPoint(time),
 *   onSetOutPoint: (time) => setOutPoint(time),
 *   onClearInPoint: () => setInPoint(null),
 * });
 * ```
 */
export function useVideoKeyboardShortcuts({
  enabled,
  currentTime,
  onAddChapter,
  onSetInPoint,
  onSetOutPoint,
  onClearInPoint,
}: UseVideoKeyboardShortcutsProps) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // Check if user is typing in any input field
      const target = e.target as HTMLElement;
      const activeElement = document.activeElement as HTMLElement;

      // Skip if typing in form fields
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.isContentEditable
      ) {
        return; // Don't prevent default, just return
      }

      // Check if ANY dialog is open (Radix Dialog uses data-state="open")
      const openDialog = document.querySelector('[role="dialog"], [data-state="open"][data-radix-dialog-content]');
      if (openDialog) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "m":
          e.preventDefault();
          onAddChapter(currentTime);
          break;
        case "i":
          e.preventDefault();
          onSetInPoint(currentTime);
          break;
        case "o":
          e.preventDefault();
          onSetOutPoint(currentTime);
          break;
        case "escape":
          e.preventDefault();
          onClearInPoint?.();
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, currentTime, onAddChapter, onSetInPoint, onSetOutPoint, onClearInPoint]);
}
