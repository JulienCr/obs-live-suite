"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppMode } from "./AppModeContext";

export function useKeyboardShortcuts(applyPreset?: (preset: "live" | "prep" | "minimal") => void) {
  const router = useRouter();
  const pathname = usePathname();
  const { mode, setMode, isOnAir } = useAppMode();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + Shift + F - Fullscreen
      if (cmdOrCtrl && e.shiftKey && e.key === "F") {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
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
  }, [mode, setMode, isOnAir, pathname, router, applyPreset]);
}
