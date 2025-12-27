"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppMode } from "./AppModeContext";
import { DashboardHeader } from "../dashboard/DashboardHeader";
import { AdminSidebar } from "../dashboard/AdminSidebar";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { mode, setMode, isFullscreenMode } = useAppMode();

  // Enable global keyboard shortcuts (mode switching, fullscreen)
  useKeyboardShortcuts();

  // Sync mode with current route on initial load
  useEffect(() => {
    if (!pathname) return;

    // Determine mode based on route
    const isLiveRoute = pathname === "/" || pathname === "/dashboard" || pathname === "/dashboard-v2";

    if (isLiveRoute && mode !== "LIVE") {
      setMode("LIVE");
    } else if (!isLiveRoute && mode !== "ADMIN" && !pathname.startsWith("/overlays")) {
      setMode("ADMIN");
    }
  }, [pathname]); // Only run on pathname change, not on mode change to avoid loops

  // Don't show header/sidebar on overlay pages (for OBS browser sources)
  const isOverlayPage = pathname?.startsWith("/overlays");

  if (isOverlayPage) {
    return <>{children}</>;
  }

  const showSidebar = mode === "ADMIN" && !isFullscreenMode;

  return (
    <div className="min-h-screen flex flex-col">
      {!isFullscreenMode && <DashboardHeader />}
      <div className="flex flex-1 overflow-hidden">
        {showSidebar && <AdminSidebar />}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
