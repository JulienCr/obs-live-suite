import { DashboardShell } from "@/components/shell/DashboardShell";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { PanelColorRepository } from "@/lib/repositories/PanelColorRepository";
import type { ColorScheme } from "@/lib/models/PanelColor";

/**
 * Main dashboard page with Dockview IDE-style panels.
 * Fetches panel colors server-side so they're available on first render.
 */
export default async function DashboardPage() {
  const initialColors = getInitialColors();

  return (
    <>
      <CommandPalette />
      <DashboardShell initialColors={initialColors} />
    </>
  );
}

function getInitialColors(): Record<string, { scheme: ColorScheme }> {
  try {
    const rows = PanelColorRepository.getInstance().getAllPanelColors();
    const colorMap: Record<string, { scheme: ColorScheme }> = {};
    for (const row of rows) {
      colorMap[row.panelId] = { scheme: row.scheme as ColorScheme };
    }
    return colorMap;
  } catch {
    return {};
  }
}
