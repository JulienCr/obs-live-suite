"use client";

import { ReactNode, useMemo } from "react";
import { PanelColorMenu } from "@/components/shell/PanelColorMenu";
import { usePanelColorsSafe } from "@/components/shell/PanelColorsContext";
import type { BasePanelWrapperProps } from "@/lib/panels/types";
import type { PanelId } from "@/lib/models/PanelColor";
import { cn } from "@/lib/utils";

/**
 * Unified wrapper for all panel types.
 *
 * Features:
 * - Conditional PanelColorMenu wrapping (dashboard context only)
 * - Consistent data-panel-id attribute for styling
 * - Configurable padding and scrolling
 * - Works in both Dockview and standalone contexts
 *
 * @example Dashboard panel
 * ```tsx
 * const config: PanelConfig = { id: "poster", context: "dashboard" };
 *
 * export function PosterPanel(props: IDockviewPanelProps) {
 *   return (
 *     <BasePanelWrapper config={config}>
 *       <PosterContent />
 *     </BasePanelWrapper>
 *   );
 * }
 * ```
 *
 * @example Presenter panel (no color menu)
 * ```tsx
 * const config: PanelConfig = { id: "cueFeed", context: "presenter" };
 *
 * export function CueFeedPanel(props: CueFeedPanelProps) {
 *   return (
 *     <BasePanelWrapper config={config}>
 *       <CueFeedContent {...props} />
 *     </BasePanelWrapper>
 *   );
 * }
 * ```
 */
export function BasePanelWrapper({
  config,
  children,
  padding,
  className,
  style,
}: BasePanelWrapperProps) {
  const panelColors = usePanelColorsSafe();

  // Determine if color menu should be enabled
  const showColorMenu = useMemo(() => {
    return (
      config.context === "dashboard" &&
      config.colorMenuEnabled !== false &&
      panelColors !== null
    );
  }, [config.context, config.colorMenuEnabled, panelColors]);

  // Calculate padding
  const computedPadding = useMemo(() => {
    if (padding !== undefined) return padding;
    if (config.padding !== undefined) return config.padding;
    // Default padding based on context
    return config.context === "dashboard" ? "1rem" : "0";
  }, [padding, config.padding, config.context]);

  // Container style
  const containerStyle = useMemo(
    () => ({
      padding:
        typeof computedPadding === "number"
          ? `${computedPadding}px`
          : computedPadding,
      height: "100%",
      overflow: config.scrollable !== false ? "auto" : "hidden",
      ...style,
    }),
    [computedPadding, config.scrollable, style]
  );

  // Inner content with data attribute
  const content = (
    <div data-panel-id={config.id} style={containerStyle} className={cn(className)}>
      {children}
    </div>
  );

  // Wrap with color menu if enabled
  if (showColorMenu) {
    return (
      <PanelColorMenu panelId={config.id as PanelId}>{content}</PanelColorMenu>
    );
  }

  return content;
}
