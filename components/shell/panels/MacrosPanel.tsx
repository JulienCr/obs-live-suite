import { type IDockviewPanelProps } from "dockview-react";
import { MacrosBar } from "@/components/dashboard/MacrosBar";
import { BasePanelWrapper, type PanelConfig } from "@/components/panels";

const config: PanelConfig = { id: "macros", context: "dashboard" };

/**
 * Macros panel for Dockview
 * Wraps the existing MacrosBar component
 */
export function MacrosPanel(props: IDockviewPanelProps) {
  return (
    <BasePanelWrapper config={config}>
      <MacrosBar />
    </BasePanelWrapper>
  );
}
