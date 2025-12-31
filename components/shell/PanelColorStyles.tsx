"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { usePanelColors } from "./PanelColorsContext";
import type { DbPanelColor } from "@/lib/models/Database";

/**
 * Generate CSS rules for a single panel's colors
 */
function generatePanelCSS(panelId: string, colors: DbPanelColor, isDark: boolean): string {
  const bg = isDark ? colors.darkBackground : colors.lightBackground;
  const header = isDark ? colors.darkHeader : colors.lightHeader;

  let css = "";

  // Panel content background
  if (bg) {
    css += `[data-panel-id="${panelId}"] { background-color: ${bg} !important; }\n`;
  }

  // Panel tab/header background
  // Dockview uses data-dv-panel-id attribute on tabs
  if (header) {
    css += `.dv-tab[data-panel-id="${panelId}"] { background-color: ${header} !important; }\n`;
    css += `.dv-tab[data-panel-id="${panelId}"].dv-tab-active { background-color: ${header} !important; }\n`;
  }

  return css;
}

/**
 * Component that injects dynamic CSS for panel colors
 * Renders a <style> element with rules targeting panel IDs
 */
export function PanelColorStyles() {
  const { colors } = usePanelColors();
  const { theme, systemTheme } = useTheme();

  // Determine if we're in dark mode
  const isDark = theme === "dark" || (theme === "system" && systemTheme === "dark");

  // Generate all CSS rules
  const cssContent = useMemo(() => {
    const rules: string[] = [];

    for (const [panelId, panelColors] of Object.entries(colors)) {
      const panelCSS = generatePanelCSS(panelId, panelColors, isDark);
      if (panelCSS) {
        rules.push(panelCSS);
      }
    }

    return rules.join("\n");
  }, [colors, isDark]);

  // Only render if there are custom colors
  if (!cssContent) {
    return null;
  }

  return (
    <style
      id="panel-color-styles"
      dangerouslySetInnerHTML={{ __html: cssContent }}
    />
  );
}
