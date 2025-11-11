import { type IDockviewPanelProps } from "dockview-react";
import { GuestsCard } from "@/components/dashboard/cards/GuestsCard";

/**
 * Guests panel for Dockview
 * Wraps the existing GuestsCard component
 */
export function GuestsPanel(props: IDockviewPanelProps) {
  return (
    <div style={{ padding: "1rem", height: "100%", overflow: "auto" }}>
      <GuestsCard />
    </div>
  );
}
