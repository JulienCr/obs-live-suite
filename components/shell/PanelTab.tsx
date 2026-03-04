"use client";

import { IDockviewPanelHeaderProps } from "dockview-react";
import { usePanelColorsStore } from "@/lib/stores";
import { usePanelTitle } from "@/lib/panels/usePanelTitle";
import { useDockview } from "./DockviewContext";

/**
 * Custom tab component for Dockview panels that adds:
 * - data-panel-id attribute for CSS targeting
 * - panel-scheme-{scheme} class for color scheme styling
 * - i18n support for panel titles
 *
 * This replicates the default Dockview tab styling while enabling
 * our color scheme system to work on tabs.
 */
export function PanelTab(props: IDockviewPanelHeaderProps) {
  const colors = usePanelColorsStore((s) => s.colors);
  const { savePositionBeforeClose } = useDockview();
  const panelId = props.api.id;
  const scheme = colors[panelId]?.scheme ?? "neutral";
  const title = usePanelTitle(props.api.title);

  return (
    <div
      data-panel-id={panelId}
      className={`dv-default-tab ${scheme !== "neutral" ? `panel-scheme-${scheme}` : ""}`}
    >
      <span className="dv-default-tab-content">{title}</span>
      <div
        className="dv-default-tab-action"
        onClick={(e) => {
          e.stopPropagation();
          savePositionBeforeClose(panelId);
          props.api.close();
        }}
      >
        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
    </div>
  );
}
