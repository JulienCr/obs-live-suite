"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppMode } from "./AppModeContext";
import { AppSidebar } from "./AppSidebar";
import { ContentTopBar } from "./ContentTopBar";
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

  return (
    <div className="h-screen flex overflow-hidden">
      {!isFullscreenMode && <AppSidebar />}
      <div className="flex-1 flex flex-col min-w-0 shadow-[-4px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-4px_0_12px_-2px_rgba(0,0,0,0.4)] z-10">
        {!isFullscreenMode && <ContentTopBar />}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
