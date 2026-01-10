"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppMode } from "./AppModeContext";
import type { DockviewApi } from "dockview-react";

interface WorkspaceCallbacks {
  resetToDefault?: () => void;
  openSaveDialog?: () => void;
}

/**
 * Activates a panel and focuses an element within it after a delay
 */
function focusPanelElement(
  dockviewApi: DockviewApi,
  panelId: string,
  buttonText: string | null,
  elementSelector: string
): void {
  const panel = dockviewApi.getPanel(panelId);
  if (!panel) return;

  panel.api.setActive();

  setTimeout(() => {
    if (buttonText) {
      const button = Array.from(document.querySelectorAll("button")).find(
        (btn) => btn.textContent?.trim() === buttonText
      );
      button?.click();
    }

    setTimeout(
      () => {
        const element = document.querySelector<HTMLElement>(elementSelector);
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          element.focus();
          element.select();
        } else {
          element?.focus();
        }
      },
      buttonText ? 50 : 0
    );
  }, 100);
}

export function useKeyboardShortcuts(
  applyPreset?: (preset: "live" | "prep" | "minimal") => void,
  dockviewApi?: DockviewApi | null,
  enabled: boolean = true,
  workspaceCallbacks?: WorkspaceCallbacks
): void {
  const router = useRouter();
  const pathname = usePathname();
  const { mode, setMode, isOnAir, isFullscreenMode, setIsFullscreenMode } = useAppMode();

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent): void {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Escape - Unfocus input/textarea
      if (e.key === "Escape" && isTyping) {
        e.preventDefault();
        (target as HTMLInputElement | HTMLTextAreaElement).blur();
        return;
      }

      // Skip single-key shortcuts when typing (but allow modifier combos)
      if (isTyping && !cmdOrCtrl) return;

      // F - Toggle Fullscreen Mode
      if (e.key.toLowerCase() === "f" && !isTyping) {
        e.preventDefault();
        setIsFullscreenMode(!isFullscreenMode);
        return;
      }

      // L - Focus Lower Third Text input
      if (e.key.toLowerCase() === "l" && !isTyping && dockviewApi) {
        e.preventDefault();
        focusPanelElement(dockviewApi, "lowerThird", "Text", "#markdown");
        return;
      }

      // G - Focus Lower Third Guest Title input
      if (e.key.toLowerCase() === "g" && !isTyping && dockviewApi) {
        e.preventDefault();
        focusPanelElement(dockviewApi, "lowerThird", "Guest", "#title");
        return;
      }

      // P - Focus Poster Quick Add input
      if (e.key.toLowerCase() === "p" && !isTyping && dockviewApi) {
        e.preventDefault();
        focusPanelElement(dockviewApi, "poster", null, 'input[placeholder*="Paste"]');
        return;
      }

      // 1-0 - Trigger guests (only if not typing and no modifiers)
      if (!cmdOrCtrl && /^Digit[0-9]$/.test(e.code)) {
        e.preventDefault();
        const digitMatch = e.code.match(/^Digit([0-9])$/);
        if (digitMatch) {
          const digit = digitMatch[1];
          const index = digit === "0" ? 9 : parseInt(digit) - 1;

          const guestItems = Array.from(
            document.querySelectorAll('[title*="Show"][title*="lower third"]')
          ).filter((el) => el.tagName === "DIV" && el.classList.contains("cursor-pointer"));

          if (guestItems[index]) {
            (guestItems[index] as HTMLElement).click();
          }
        }
        return;
      }

      // Cmd/Ctrl + Shift + A - Switch to ADMIN mode
      if (cmdOrCtrl && e.shiftKey && e.key === "A") {
        e.preventDefault();
        if (mode !== "ADMIN" && !isOnAir) {
          if (pathname === "/dashboard" || pathname === "/") {
            router.push("/settings/general");
          } else {
            setMode("ADMIN");
          }
        }
        return;
      }

      // Cmd/Ctrl + Shift + L - Switch to LIVE mode
      if (cmdOrCtrl && e.shiftKey && e.key === "L") {
        e.preventDefault();
        if (mode !== "LIVE") {
          if (pathname !== "/dashboard" && pathname !== "/") {
            router.push("/dashboard");
          } else {
            setMode("LIVE");
          }
        }
        return;
      }

      // Cmd/Ctrl + Shift + R - Reset to default workspace
      if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        workspaceCallbacks?.resetToDefault?.();
        return;
      }

      // Cmd/Ctrl + Shift + S - Save current layout as workspace
      if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        workspaceCallbacks?.openSaveDialog?.();
        return;
      }

      // Layout presets - only in LIVE mode on dashboard
      const isOnDashboard = pathname === "/" || pathname === "/dashboard";
      if (mode === "LIVE" && isOnDashboard && applyPreset && cmdOrCtrl) {
        const presetMap: Record<string, "live" | "prep" | "minimal"> = {
          "1": "live",
          "2": "prep",
          "3": "minimal",
        };
        const preset = presetMap[e.key];
        if (preset) {
          e.preventDefault();
          applyPreset(preset);
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    mode,
    setMode,
    isOnAir,
    pathname,
    router,
    applyPreset,
    isFullscreenMode,
    setIsFullscreenMode,
    dockviewApi,
    enabled,
    workspaceCallbacks,
  ]);
}
