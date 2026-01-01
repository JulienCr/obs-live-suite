import { DashboardShell } from "@/components/shell/DashboardShell";
import { CommandPalette } from "@/components/shell/CommandPalette";

/**
 * Main dashboard page with Dockview IDE-style panels
 */
export default function DashboardPage() {
  return (
    <>
      <CommandPalette />
      <DashboardShell />
    </>
  );
}
