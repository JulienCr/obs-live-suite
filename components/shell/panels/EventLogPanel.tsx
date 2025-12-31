import { type IDockviewPanelProps } from "dockview-react";
import { EventLog } from "@/components/dashboard/EventLog";
import { PanelColorMenu } from "../PanelColorMenu";

/**
 * Event Log panel for Dockview
 * Wraps the existing EventLog component
 */
export function EventLogPanel(props: IDockviewPanelProps) {
  return (
    <PanelColorMenu panelId="eventLog">
      <div data-panel-id="eventLog" style={{ padding: "1rem", height: "100%", overflow: "auto" }}>
        <EventLog />
      </div>
    </PanelColorMenu>
  );
}
