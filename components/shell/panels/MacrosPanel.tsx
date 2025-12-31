import { type IDockviewPanelProps } from "dockview-react";
import { MacrosBar } from "@/components/dashboard/MacrosBar";
import { PanelColorMenu } from "../PanelColorMenu";

/**
 * Macros panel for Dockview
 * Wraps the existing MacrosBar component
 */
export function MacrosPanel(props: IDockviewPanelProps) {
  return (
    <PanelColorMenu panelId="macros">
      <div data-panel-id="macros" style={{ padding: "1rem", height: "100%", overflow: "auto" }}>
        <MacrosBar />
      </div>
    </PanelColorMenu>
  );
}
