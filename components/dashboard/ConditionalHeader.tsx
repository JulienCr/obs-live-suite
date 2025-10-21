"use client";

import { usePathname } from "next/navigation";
import { DashboardHeader } from "./DashboardHeader";

/**
 * Conditionally renders DashboardHeader based on current route
 * Excludes header from overlay pages meant for OBS browser sources
 */
export function ConditionalHeader() {
  const pathname = usePathname();
  
  // Don't show header on overlay pages
  if (pathname?.startsWith("/overlays")) {
    return null;
  }
  
  return <DashboardHeader />;
}

