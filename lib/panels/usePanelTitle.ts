"use client";

import { useTranslations } from "next-intl";

/**
 * Type-safe mapping of panel i18n keys to their translation function calls.
 * Keys must match the "panels.*" keys in messages/{locale}.json under "dashboard".
 */
export const PANEL_TITLE_KEYS = [
  "lowerThird",
  "countdown",
  "guests",
  "poster",
  "macros",
  "eventLog",
  "cueComposer",
  "presenceStatus",
  "regieInternalChat",
  "regieInternalChatView",
  "regiePublicChat",
  "twitch",
  "chatMessages",
  "textPresets",
  "mediaPlayerArtlist",
  "mediaPlayerYoutube",
] as const;

export type PanelTitleKey = (typeof PANEL_TITLE_KEYS)[number];

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
          `Add "${panelKey}" to PANEL_TITLE_KEYS if this is a new panel.`
      );
    }

    // Fallback: extract the last part of the key for display
    return panelKey;
  }

  // Return raw title for non-i18n titles
  return rawTitle;
}
