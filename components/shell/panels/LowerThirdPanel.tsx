import { type IDockviewPanelProps } from "dockview-react";
import { LowerThirdCard } from "@/components/dashboard/cards/LowerThirdCard";

/**
 * Lower Third panel for Dockview
 * Wraps the existing LowerThirdCard component
 */
export function LowerThirdPanel(props: IDockviewPanelProps) {
  return (
    <div style={{ padding: "1rem", height: "100%", overflow: "auto" }}>
      <LowerThirdCard />
    </div>
  );
}
