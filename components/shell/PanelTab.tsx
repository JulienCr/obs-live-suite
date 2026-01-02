"use client";

import { IDockviewPanelHeaderProps } from "dockview-react";
import { usePanelColors } from "./PanelColorsContext";
import type { PanelId } from "@/lib/models/PanelColor";

/**
 * Custom tab component for Dockview panels that adds:
 * - data-panel-id attribute for CSS targeting
 * - panel-scheme-{scheme} class for color scheme styling
 *
 * This replicates the default Dockview tab styling while enabling
 * our color scheme system to work on tabs.
 */
export function PanelTab(props: IDockviewPanelHeaderProps) {
  const { colors } = usePanelColors();
  const panelId = props.api.id as PanelId;
  const scheme = colors[panelId]?.scheme ?? "neutral";

  return (
    <div
      data-panel-id={panelId}
      className={`dv-default-tab ${scheme !== "neutral" ? `panel-scheme-${scheme}` : ""}`}
    >
      <span className="dv-default-tab-content">{props.api.title}</span>
    </div>
  );
}
