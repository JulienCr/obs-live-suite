"use client";

import { PanelColorMenu } from "@/components/shell/PanelColorMenu";
import { usePanelColorsStore } from "@/lib/stores";
import { getPanelSchemeClass } from "@/lib/models/PanelColor";
import { usePanelTitle } from "@/lib/panels/usePanelTitle";
import type { BasePanelWrapperProps } from "@/lib/panels/types";


/**
 * Unified wrapper for all panel types.
 *
 * Features:
 * - Conditional PanelColorMenu wrapping (dashboard context only)
 * - Consistent data-panel-id attribute for styling
 * - Configurable padding and scrolling
 * - Works in both Dockview and standalone contexts
 */
export function BasePanelWrapper({
  config,
  children,
  padding,
  className,
  style,
}: BasePanelWrapperProps): React.ReactElement {
  const panelColorsInitialized = usePanelColorsStore((s) => s._initialized);

  // Determine if color menu should be enabled
  const showColorMenu =
    config.context === "dashboard" &&
    config.colorMenuEnabled !== false &&
    panelColorsInitialized;

  // Calculate padding: prop > config > context default
  const computedPadding =
    padding ?? config.padding ?? (config.context === "dashboard" ? "1rem" : "0");

  const containerStyle: React.CSSProperties = {
    padding:
      typeof computedPadding === "number"
        ? `${computedPadding}px`
        : computedPadding,
    height: "100%",
    overflow: config.scrollable !== false ? "auto" : "hidden",
    ...style,
  };

  const scheme = usePanelColorsStore((s) => s.colors[config.id]?.scheme);
  const schemeClass = getPanelSchemeClass(scheme);
  const combinedClassName = [schemeClass, className].filter(Boolean).join(" ") || undefined;
  const panelDisplayName = usePanelTitle(`panels.${config.id}`);

  const content = (
    <div data-panel-id={config.id} style={containerStyle} className={combinedClassName}>
      {children}
    </div>
  );

  if (showColorMenu) {
    return (
      <PanelColorMenu panelId={config.id} displayName={panelDisplayName}>{content}</PanelColorMenu>
    );
  }

  return content;
}
