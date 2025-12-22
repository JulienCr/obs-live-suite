import { type IDockviewPanelProps } from "dockview-react";
import { EventLog } from "@/components/dashboard/EventLog";

/**
 * Event Log panel for Dockview
 * Wraps the existing EventLog component
 */
export function EventLogPanel(props: IDockviewPanelProps) {
  return (
    <div style={{ padding: "1rem", height: "100%", overflow: "auto" }}>
      <EventLog />
    </div>
  );
}
