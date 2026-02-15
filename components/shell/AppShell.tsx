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

  const isDashboard = pathname === "/" || pathname === "/dashboard";
  const isOverlayPage = pathname?.startsWith("/overlays");
  const isPresenterPage = pathname?.startsWith("/presenter");

  useKeyboardShortcuts(undefined, undefined, !isDashboard);

  useEffect(() => {
    if (!pathname) return;

    if (isDashboard && mode !== "LIVE") {
      setMode("LIVE");
    } else if (!isDashboard && mode !== "ADMIN" && !isOverlayPage) {
      setMode("ADMIN");
    }
  }, [pathname]); // Only run on pathname change, not on mode change to avoid loops

  if (isOverlayPage || isPresenterPage) {
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
