import { type IDockviewPanelProps } from "dockview-react";
import { PosterContent } from "@/components/dashboard/cards/PosterCard";
import { BasePanelWrapper, type PanelConfig } from "@/components/panels";

const config: PanelConfig = { id: "poster", context: "dashboard" };

/**
 * Poster panel for Dockview
 * Uses PosterContent directly without Card wrapper (title is in the tab)
 */
export function PosterPanel(props: IDockviewPanelProps) {
  return (
    <BasePanelWrapper config={config}>
      <PosterContent />
    </BasePanelWrapper>
  );
}
