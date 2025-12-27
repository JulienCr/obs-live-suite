"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppMode } from "./AppModeContext";
import type { DockviewApi } from "dockview-react";

export function useKeyboardShortcuts(
  applyPreset?: (preset: "live" | "prep" | "minimal") => void,
  dockviewApi?: DockviewApi | null
) {
  const router = useRouter();
  const pathname = usePathname();
  const { mode, setMode, isOnAir, isFullscreenMode, setIsFullscreenMode } = useAppMode();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Check if user is typing in an input field
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || 
                       target.tagName === "TEXTAREA" || 
                       target.isContentEditable;

      // Escape - Unfocus input/textarea if currently focused
      if (e.key === "Escape" && isTyping) {
        e.preventDefault();
        (target as HTMLInputElement | HTMLTextAreaElement).blur();
        return;
      }

      // F - Toggle Fullscreen Mode (only if not typing)
      if ((e.key === "F" || e.key === "f") && !isTyping) {
        e.preventDefault();
        setIsFullscreenMode(!isFullscreenMode);
        return;
      }

      // L - Focus Lower Third Text input (only if not typing and dockview available)
      if ((e.key === "L" || e.key === "l") && !isTyping && dockviewApi) {
        e.preventDefault();
        const panel = dockviewApi.getPanel("lowerThird");
        if (panel) {
          panel.api.setActive();
          // Wait for panel to be active, then switch to text mode and focus the markdown textarea
          setTimeout(() => {
            // Find and click the "Text" button to switch to text mode
            const textModeButtons = Array.from(document.querySelectorAll('button')).filter(
              btn => btn.textContent?.trim() === 'Text'
            );
            const textModeButton = textModeButtons[0];
            if (textModeButton) {
              textModeButton.click();
            }
            
            // Focus the markdown textarea
            setTimeout(() => {
              const textarea = document.querySelector<HTMLTextAreaElement>('#markdown');
              if (textarea) {
                textarea.focus();
                textarea.select();
              }
            }, 50);
          }, 100);
        }
        return;
      }

      // G - Focus Lower Third Guest Title input (only if not typing and dockview available)
      if ((e.key === "G" || e.key === "g") && !isTyping && dockviewApi) {
        e.preventDefault();
        const panel = dockviewApi.getPanel("lowerThird");
        if (panel) {
          panel.api.setActive();
          // Wait for panel to be active, then switch to guest mode and focus the title input
          setTimeout(() => {
            // Find and click the "Guest" button to switch to guest mode
            const guestModeButtons = Array.from(document.querySelectorAll('button')).filter(
              btn => btn.textContent?.trim() === 'Guest'
            );
            const guestModeButton = guestModeButtons[0];
            if (guestModeButton) {
              guestModeButton.click();
            }
            
            // Focus the title input
            setTimeout(() => {
              const titleInput = document.querySelector<HTMLInputElement>('#title');
              if (titleInput) {
                titleInput.focus();
                titleInput.select();
              }
            }, 50);
          }, 100);
        }
        return;
      }

      // P - Focus Poster Quick Add input (only if not typing and dockview available)
      if ((e.key === "P" || e.key === "p") && !isTyping && dockviewApi) {
        e.preventDefault();
        const panel = dockviewApi.getPanel("poster");
        if (panel) {
          panel.api.setActive();
          // Wait for panel to be active, then focus the URL input in PosterQuickAdd
          setTimeout(() => {
            // Find the input within the poster panel that has placeholder containing "Paste"
            const urlInput = document.querySelector<HTMLInputElement>('input[placeholder*="Paste"]');
            if (urlInput) {
              urlInput.focus();
            }
          }, 100);
        }
        return;
      }

      // 1-0 - Trigger guests (only if not typing)
      // Use e.code to detect physical key position (works with any keyboard layout)
      if (!isTyping && /^Digit[0-9]$/.test(e.code)) {
        e.preventDefault();
        const digitMatch = e.code.match(/^Digit([0-9])$/);
        if (digitMatch) {
          const digit = digitMatch[1];
          const number = digit === "0" ? 9 : parseInt(digit) - 1; // 1=0, 2=1, ..., 0=9
          
          // Find all guest items in the Quick Guests panel
          const guestItems = Array.from(document.querySelectorAll('[title*="Show"][title*="lower third"]'))
            .filter(el => el.tagName === 'DIV' && el.classList.contains('cursor-pointer'));
          
          if (guestItems[number]) {
            (guestItems[number] as HTMLElement).click();
          }
        }
        return;
      }

      // Cmd/Ctrl + Shift + A - Switch to ADMIN mode
      if (cmdOrCtrl && e.shiftKey && e.key === "A") {
        e.preventDefault();
        if (mode !== "ADMIN") {
          if (!isOnAir) {
            setMode("ADMIN");
            if (pathname === "/dashboard" || pathname === "/dashboard-v2" || pathname === "/") {
              router.push("/settings");
            }
          }
        }
        return;
      }

      // Cmd/Ctrl + Shift + L - Switch to LIVE mode
      if (cmdOrCtrl && e.shiftKey && e.key === "L") {
        e.preventDefault();
        if (mode !== "LIVE") {
          setMode("LIVE");
          if (pathname !== "/dashboard" && pathname !== "/dashboard-v2" && pathname !== "/") {
            router.push("/dashboard");
          }
        }
        return;
      }

      // Layout presets - only in LIVE mode on dashboard
      const isOnDashboard = pathname === "/" || pathname === "/dashboard" || pathname === "/dashboard-v2";
      if (mode === "LIVE" && isOnDashboard && applyPreset) {
        // Cmd/Ctrl + 1 - Live preset
        if (cmdOrCtrl && e.key === "1") {
          e.preventDefault();
          applyPreset("live");
          return;
        }

        // Cmd/Ctrl + 2 - Prep preset
        if (cmdOrCtrl && e.key === "2") {
          e.preventDefault();
          applyPreset("prep");
          return;
        }

        // Cmd/Ctrl + 3 - Minimal preset
        if (cmdOrCtrl && e.key === "3") {
          e.preventDefault();
          applyPreset("minimal");
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, setMode, isOnAir, pathname, router, applyPreset, isFullscreenMode, setIsFullscreenMode, dockviewApi]);
}
