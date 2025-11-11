"use client";

import { DashboardShell } from "@/components/shell/DashboardShell";
import { CommandPalette } from "@/components/shell/CommandPalette";

/**
 * DashboardContainer - Main dashboard layout with Blueprint + Dockview
 * Migrated from custom grid + DnD to Dockview IDE-style panels
 */
export function DashboardContainer() {
  return (
    <>
      <CommandPalette />
      <DashboardShell />
    </>
  );
}
