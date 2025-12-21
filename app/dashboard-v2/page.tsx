import { DashboardShell } from "@/components/shell/DashboardShell";
import { CommandPalette } from "@/components/shell/CommandPalette";

export default function DashboardV2() {
  return (
    <>
      <CommandPalette />
      <DashboardShell />
    </>
  );
}