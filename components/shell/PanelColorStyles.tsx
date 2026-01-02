"use client";

import { useEffect } from "react";
import { usePanelColors } from "./PanelColorsContext";
import { COLOR_SCHEMES } from "@/lib/models/PanelColor";

/**
 * Component that applies color scheme classes to panel DOM elements.
 * Uses useEffect to add/remove `panel-scheme-{scheme}` classes on elements
 * matching `[data-panel-id]`, enabling CSS variable overrides for theming.
 */
export function PanelColorStyles() {
  const { colors } = usePanelColors();

  useEffect(() => {
    // For each panel with a custom scheme, add the class to its DOM element
    for (const [panelId, { scheme }] of Object.entries(colors)) {
      // Find all elements with this panel ID (both content and tabs)
      const elements = document.querySelectorAll(`[data-panel-id="${panelId}"]`);

      elements.forEach((element) => {
        // Remove any existing scheme classes
        COLOR_SCHEMES.forEach((s) => {
          element.classList.remove(`panel-scheme-${s}`);
        });

        // Add the new scheme class (skip neutral as it uses defaults)
        if (scheme !== "neutral") {
          element.classList.add(`panel-scheme-${scheme}`);
        }
      });
    }

    // Cleanup: when colors change, we handle it in the effect above
    // No need for cleanup since we're updating classes, not adding/removing elements
  }, [colors]);

  // Also handle initial render for panels that might not have colors set yet
  useEffect(() => {
    // Clean up classes from panels that were reset to neutral
    const allPanelElements = document.querySelectorAll("[data-panel-id]");

    allPanelElements.forEach((element) => {
      const panelId = element.getAttribute("data-panel-id");
      if (!panelId) return;

      const panelColor = colors[panelId];
      const scheme = panelColor?.scheme ?? "neutral";

      // Remove all scheme classes first
      COLOR_SCHEMES.forEach((s) => {
        element.classList.remove(`panel-scheme-${s}`);
      });

      // Add the correct scheme class
      if (scheme !== "neutral") {
        element.classList.add(`panel-scheme-${scheme}`);
      }
    });
  }, [colors]);

  // This component doesn't render anything - it just manages classes
  return null;
}
