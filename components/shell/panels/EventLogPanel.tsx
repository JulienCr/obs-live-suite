import { type IDockviewPanelProps } from "dockview-react";
import { EventLog } from "@/components/dashboard/EventLog";
import { BasePanelWrapper, type PanelConfig } from "@/components/panels";

const config: PanelConfig = { id: "eventLog", context: "dashboard" };

/**
 * Event Log panel for Dockview
 * Wraps the existing EventLog component
 */
export function EventLogPanel(_props: IDockviewPanelProps) {
  return (
    <BasePanelWrapper config={config}>
      <EventLog />
    </BasePanelWrapper>
  );
}
