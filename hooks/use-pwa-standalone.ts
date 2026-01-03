"use client";

import { useState, useEffect } from "react";

interface UsePwaStandaloneReturn {
  /** Whether the app is running in standalone mode (installed PWA) */
  isStandalone: boolean;
}

/**
 * Hook to detect if the app is running in PWA standalone mode
 *
 * Detection methods:
 * 1. navigator.standalone - iOS Safari specific property
 * 2. matchMedia("(display-mode: standalone)") - works for most browsers
 * 3. matchMedia("(display-mode: fullscreen)") - fallback
 */
export function usePwaStandalone(): UsePwaStandaloneReturn {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkStandalone = (): boolean => {
      // Method 1: iOS Safari specific
      const nav = window.navigator as Navigator & { standalone?: boolean };
      if ("standalone" in nav && nav.standalone === true) {
        return true;
      }

      // Method 2: CSS media query (works for Android, desktop PWAs)
      if (window.matchMedia("(display-mode: standalone)").matches) {
        return true;
      }

      // Method 3: Fullscreen mode fallback
      if (window.matchMedia("(display-mode: fullscreen)").matches) {
        return true;
      }

      return false;
    };

    setIsStandalone(checkStandalone());

    // Listen for display mode changes (e.g., if user installs PWA while page is open)
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleChange = () => {
      setIsStandalone(checkStandalone());
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return { isStandalone };
}
