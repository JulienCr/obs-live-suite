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

  // Apply color schemes to all panel elements when colors change
  useEffect(() => {
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
