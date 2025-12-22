import { type IDockviewPanelProps } from "dockview-react";
import { MacrosBar } from "@/components/dashboard/MacrosBar";

/**
 * Macros panel for Dockview
 * Wraps the existing MacrosBar component
 */
export function MacrosPanel(props: IDockviewPanelProps) {
  return (
    <div style={{ padding: "1rem", height: "100%", overflow: "auto" }}>
      <MacrosBar />
    </div>
  );
}
