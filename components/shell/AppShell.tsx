"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppMode } from "./AppModeContext";
import { DashboardHeader } from "../dashboard/DashboardHeader";
import { AdminSidebar } from "../dashboard/AdminSidebar";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { WorkspacesProvider } from "./WorkspacesContext";
import { PanelColorsProvider } from "./PanelColorsContext";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { mode, setMode, isFullscreenMode } = useAppMode();

  // Determine if we're on the dashboard page
  const isOnDashboard = pathname === "/" || pathname === "/dashboard";

  // Enable global keyboard shortcuts ONLY on non-dashboard pages
  // (DashboardShell handles shortcuts on dashboard to avoid duplicate listeners)
  // Pass a flag to disable the hook on dashboard
  useKeyboardShortcuts(undefined, undefined, !isOnDashboard);

  // Sync mode with current route on initial load
  useEffect(() => {
    if (!pathname) return;

    // Determine mode based on route
    const isLiveRoute = pathname === "/" || pathname === "/dashboard";

    if (isLiveRoute && mode !== "LIVE") {
      setMode("LIVE");
    } else if (!isLiveRoute && mode !== "ADMIN" && !pathname.startsWith("/overlays")) {
      setMode("ADMIN");
    }
  }, [pathname]); // Only run on pathname change, not on mode change to avoid loops

  // Don't show header/sidebar on overlay pages (for OBS browser sources) or presenter page
  const isOverlayPage = pathname?.startsWith("/overlays");
  const isPresenterPage = pathname?.startsWith("/presenter");

  if (isOverlayPage || isPresenterPage) {
    return <>{children}</>;
  }

  const showSidebar = mode === "ADMIN" && !isFullscreenMode;

  return (
    <PanelColorsProvider>
      <WorkspacesProvider>
        <div className="min-h-screen flex flex-col">
          {!isFullscreenMode && <DashboardHeader />}
          <div className="flex flex-1 overflow-hidden">
            {showSidebar && <AdminSidebar />}
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </WorkspacesProvider>
    </PanelColorsProvider>
  );
}
