import { type IDockviewPanelProps } from "dockview-react";
import { CountdownCard } from "@/components/dashboard/cards/CountdownCard";

/**
 * Countdown panel for Dockview
 * Wraps the existing CountdownCard component
 */
export function CountdownPanel(props: IDockviewPanelProps) {
  return (
    <div style={{ padding: "1rem", height: "100%", overflow: "auto" }}>
      <CountdownCard />
    </div>
  );
}
