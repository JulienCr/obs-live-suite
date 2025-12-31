import { type IDockviewPanelProps } from "dockview-react";
import { PosterCard } from "@/components/dashboard/cards/PosterCard";
import { PanelColorMenu } from "../PanelColorMenu";

/**
 * Poster panel for Dockview
 * Uses PosterCard but the card wrapper is hidden by the parent padding
 */
export function PosterPanel(props: IDockviewPanelProps) {
  return (
    <PanelColorMenu panelId="poster">
      <div data-panel-id="poster" style={{ padding: "0", height: "100%", overflow: "auto" }}>
        <PosterCard className="border-0 shadow-none" />
      </div>
    </PanelColorMenu>
  );
}
