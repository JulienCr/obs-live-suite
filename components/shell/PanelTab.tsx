"use client";

import { IDockviewPanelHeaderProps } from "dockview-react";
import { useTranslations } from "next-intl";
import { usePanelColors } from "./PanelColorsContext";
import { useDockview } from "./DockviewContext";
import type { PanelId } from "@/lib/models/PanelColor";

/**
 * Type-safe mapping of panel i18n keys to their translation function calls.
 * Keys must match the "panels.*" keys in messages/{locale}.json under "dashboard".
 */
const PANEL_TITLE_KEYS = [
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
] as const;

type PanelTitleKey = (typeof PANEL_TITLE_KEYS)[number];

/**
 * Resolves panel title from i18n key or returns raw title
 * Panel titles from workspaces are stored as i18n keys (e.g., "panels.lowerThird")
 * This function resolves them to localized strings
 */
function usePanelTitle(rawTitle: string | undefined): string {
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
        `[PanelTab] Unknown panel translation key: "${rawTitle}". ` +
          `Add "${panelKey}" to PANEL_TITLE_KEYS if this is a new panel.`
      );
    }

    // Fallback: extract the last part of the key for display
    // e.g., "panels.lowerThird" -> "lowerThird"
    return panelKey;
  }

  // Return raw title for non-i18n titles (e.g., user-created panels or legacy layouts)
  return rawTitle;
}

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
  const { colors } = usePanelColors();
  const { savePositionBeforeClose } = useDockview();
  const panelId = props.api.id as PanelId;
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
