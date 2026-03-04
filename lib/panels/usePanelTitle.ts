"use client";

import { useTranslations } from "next-intl";
import { PANEL_TITLE_KEYS, type PanelTitleKey } from "./registry";

// Re-export for backward compat
export { PANEL_TITLE_KEYS, type PanelTitleKey } from "./registry";

/**
 * Resolves panel title from i18n key or returns raw title.
 * Panel titles from workspaces are stored as i18n keys (e.g., "panels.lowerThird")
 * This function resolves them to localized strings.
 */
export function usePanelTitle(rawTitle: string | undefined): string {
  const t = useTranslations("dashboard");

  if (!rawTitle) return "";

  // Check if the title is an i18n key (format: "panels.xxx")
  if (rawTitle.startsWith("panels.")) {
    const panelKey = rawTitle.slice("panels.".length);

    // Type-safe check: only translate known panel keys
    if (PANEL_TITLE_KEYS.includes(panelKey as PanelTitleKey)) {
      return t(`panels.${panelKey as PanelTitleKey}`);
    }

    // Unknown panel key: warn in development and provide readable fallback
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[usePanelTitle] Unknown panel translation key: "${rawTitle}". ` +
          `Add "${panelKey}" to PANEL_IDS in registry.ts if this is a new panel.`
      );
    }

    // Fallback: extract the last part of the key for display
    return panelKey;
  }

  // Return raw title for non-i18n titles
  return rawTitle;
}
