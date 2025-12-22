import { type IDockviewPanelProps } from "dockview-react";
import { PosterCard } from "@/components/dashboard/cards/PosterCard";

/**
 * Poster panel for Dockview
 * Wraps the existing PosterCard component
 */
export function PosterPanel(props: IDockviewPanelProps) {
  return (
    <div style={{ padding: "1rem", height: "100%", overflow: "auto" }}>
      <PosterCard />
    </div>
  );
}
