import { type IDockviewPanelProps } from "dockview-react";
import { PosterContent } from "@/components/dashboard/cards/PosterCard";
import { PanelColorMenu } from "../PanelColorMenu";

/**
 * Poster panel for Dockview
 * Uses PosterContent directly without Card wrapper (title is in the tab)
 */
export function PosterPanel(props: IDockviewPanelProps) {
  return (
    <PanelColorMenu panelId="poster">
      <div data-panel-id="poster" style={{ padding: "1rem", height: "100%", overflow: "auto" }}>
        <PosterContent />
      </div>
    </PanelColorMenu>
  );
}
