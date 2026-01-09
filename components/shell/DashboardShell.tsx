"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import {
  DockviewReact,
  DockviewReadyEvent,
  IDockviewPanelProps,
  themeAbyss as themeDark,
  themeLight,
} from "dockview-react";
import { useTheme } from "next-themes";
// Note: Dockview CSS is imported globally in app/globals.css

// Import widget panels
import { LowerThirdPanel } from "./panels/LowerThirdPanel";
import { CountdownPanel } from "./panels/CountdownPanel";
import { GuestsPanel } from "./panels/GuestsPanel";
import { PosterPanel } from "./panels/PosterPanel";
import { MacrosPanel } from "./panels/MacrosPanel";
import { EventLogPanel } from "./panels/EventLogPanel";
import { CueComposerPanel } from "./panels/CueComposerPanel";
import { PresenceStatusPanel } from "./panels/PresenceStatusPanel";
import { RegieInternalChatPanel } from "./panels/RegieInternalChatPanel";
import { RegieInternalChatViewPanel } from "./panels/RegieInternalChatViewPanel";
import { RegiePublicChatPanel } from "./panels/RegiePublicChatPanel";
import { TwitchStatsPanel } from "./panels/TwitchStatsPanel";
import { TwitchControlPanel } from "./panels/TwitchControlPanel";
import { DockviewContext, usePanelPositions } from "./DockviewContext";
import { LayoutPresetsProvider, LayoutPreset } from "./LayoutPresetsContext";
import { PanelTab } from "./PanelTab";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { LiveModeRail } from "./LiveModeRail";
import { useAppMode } from "./AppModeContext";
import { PanelColorsProvider } from "./PanelColorsContext";
import { PanelColorStyles } from "./PanelColorStyles";

const LAYOUT_KEY = "obs-live-suite-dockview-layout";
const PRESET_KEY = "obs-live-suite-layout-preset";

const components = {
  lowerThird: LowerThirdPanel,
  countdown: CountdownPanel,
  guests: GuestsPanel,
  poster: PosterPanel,
  macros: MacrosPanel,
  eventLog: EventLogPanel,
  cueComposer: CueComposerPanel,
  presenceStatus: PresenceStatusPanel,
  regieInternalChat: RegieInternalChatPanel,
  regieInternalChatView: RegieInternalChatViewPanel,
  regiePublicChat: RegiePublicChatPanel,
  twitchStats: TwitchStatsPanel,
  twitchControl: TwitchControlPanel,
};

const tabComponents = {
  default: PanelTab,
};

export function DashboardShell() {
  const t = useTranslations("dashboard");
  const { theme } = useTheme();
  const { mode, isFullscreenMode } = useAppMode();
  const [mounted, setMounted] = useState(false);
  const apiRef = useRef<DockviewReadyEvent["api"] | null>(null);
  const [api, setApi] = useState<DockviewReadyEvent["api"] | null>(null);
  const { savePositionBeforeClose, getSavedPosition } = usePanelPositions(api);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  const applyLivePreset = useCallback(() => {
    if (!apiRef.current) return;

    // Clear existing panels
    apiRef.current.clear();

    // Main area with widget panels in tabs (default layout)
    const lowerThird = apiRef.current.addPanel({
      id: "lowerThird",
      component: "lowerThird",
      title: t("panels.lowerThird"),
    });

    apiRef.current.addPanel({
      id: "countdown",
      component: "countdown",
      title: t("panels.countdown"),
      position: { referencePanel: lowerThird, direction: "within" },
    });

    apiRef.current.addPanel({
      id: "guests",
      component: "guests",
      title: t("panels.guests"),
      position: { referencePanel: lowerThird, direction: "within" },
    });

    apiRef.current.addPanel({
      id: "poster",
      component: "poster",
      title: t("panels.poster"),
      position: { referencePanel: lowerThird, direction: "within" },
    });

    // Bottom panel for Macros and Event Log
    const macros = apiRef.current.addPanel({
      id: "macros",
      component: "macros",
      title: t("panels.macros"),
      position: { referencePanel: lowerThird, direction: "below" },
    });

    apiRef.current.addPanel({
      id: "eventLog",
      component: "eventLog",
      title: t("panels.eventLog"),
      position: { referencePanel: macros, direction: "within" },
    });

    try {
      macros.api.setSize({ height: 250 });
    } catch (err) {
      console.warn("Failed to set panel size:", err);
    }

    localStorage.setItem(PRESET_KEY, "live");
  }, [t]);

  const applyPrepPreset = useCallback(() => {
    if (!apiRef.current) return;

    // Clear existing panels
    apiRef.current.clear();

    // Grid layout - all panels visible
    const lowerThird = apiRef.current.addPanel({
      id: "lowerThird",
      component: "lowerThird",
      title: t("panels.lowerThird"),
    });

    const countdown = apiRef.current.addPanel({
      id: "countdown",
      component: "countdown",
      title: t("panels.countdown"),
      position: { referencePanel: lowerThird, direction: "right" },
    });

    const guests = apiRef.current.addPanel({
      id: "guests",
      component: "guests",
      title: t("panels.guests"),
      position: { referencePanel: countdown, direction: "right" },
    });

    const poster = apiRef.current.addPanel({
      id: "poster",
      component: "poster",
      title: t("panels.poster"),
      position: { referencePanel: lowerThird, direction: "below" },
    });

    const macros = apiRef.current.addPanel({
      id: "macros",
      component: "macros",
      title: t("panels.macros"),
      position: { referencePanel: poster, direction: "right" },
    });

    apiRef.current.addPanel({
      id: "eventLog",
      component: "eventLog",
      title: t("panels.eventLog"),
      position: { referencePanel: macros, direction: "right" },
    });

    localStorage.setItem(PRESET_KEY, "prep");
  }, [t]);

  const applyMinimalPreset = useCallback(() => {
    if (!apiRef.current) return;

    // Clear existing panels
    apiRef.current.clear();

    // Minimal layout - only Lower Third and Macros
    const lowerThird = apiRef.current.addPanel({
      id: "lowerThird",
      component: "lowerThird",
      title: t("panels.lowerThird"),
    });

    const macros = apiRef.current.addPanel({
      id: "macros",
      component: "macros",
      title: t("panels.macros"),
      position: { referencePanel: lowerThird, direction: "below" },
    });

    try {
      macros.api.setSize({ height: 200 });
    } catch (err) {
      console.warn("Failed to set panel size:", err);
    }

    localStorage.setItem(PRESET_KEY, "minimal");
  }, [t]);

  const applyPreset = useCallback((preset: LayoutPreset) => {
    switch (preset) {
      case "live":
        applyLivePreset();
        break;
      case "prep":
        applyPrepPreset();
        break;
      case "minimal":
        applyMinimalPreset();
        break;
    }
  }, [applyLivePreset, applyPrepPreset, applyMinimalPreset]);

  // Enable keyboard shortcuts for layout presets
  useKeyboardShortcuts(applyPreset, api);

  const onReady = useCallback((event: DockviewReadyEvent) => {
    apiRef.current = event.api;
    setApi(event.api);

    // Try to restore saved layout
    const saved = localStorage.getItem(LAYOUT_KEY);
    if (saved) {
      try {
        event.api.fromJSON(JSON.parse(saved));
        return; // Successfully restored
      } catch (err) {
        console.warn("Failed to restore layout, using default", err);
      }
    }

    // Default layout: Main widgets area + Bottom panels
    // Main area with widget panels in tabs
    const lowerThird = event.api.addPanel({
      id: "lowerThird",
      component: "lowerThird",
      title: t("panels.lowerThird"),
    });

    const countdown = event.api.addPanel({
      id: "countdown",
      component: "countdown",
      title: t("panels.countdown"),
      position: { referencePanel: lowerThird, direction: "within" },
    });

    const guests = event.api.addPanel({
      id: "guests",
      component: "guests",
      title: t("panels.guests"),
      position: { referencePanel: lowerThird, direction: "within" },
    });

    const poster = event.api.addPanel({
      id: "poster",
      component: "poster",
      title: t("panels.poster"),
      position: { referencePanel: lowerThird, direction: "within" },
    });

    // Bottom panel for Macros
    const macros = event.api.addPanel({
      id: "macros",
      component: "macros",
      title: t("panels.macros"),
      position: { referencePanel: lowerThird, direction: "below" },
    });

    // Event Log next to Macros in bottom area
    const eventLog = event.api.addPanel({
      id: "eventLog",
      component: "eventLog",
      title: t("panels.eventLog"),
      position: { referencePanel: macros, direction: "within" },
    });

    // Set initial sizes for bottom panel (height in pixels)
    try {
      macros.api.setSize({ height: 250 });
    } catch (err) {
      // Ignore if setSize API has changed
      console.warn("Failed to set panel size:", err);
    }
  }, [t]);

  // Set up layout change listener to persist layout
  useEffect(() => {
    if (!apiRef.current) return;

    const disposable = apiRef.current.onDidLayoutChange(() => {
      try {
        const json = apiRef.current!.toJSON();
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(json));
      } catch (err) {
        console.error("Failed to save layout", err);
      }
    });

    return () => disposable.dispose();
  }, []);

  return (
    <PanelColorsProvider>
      <LayoutPresetsProvider applyPreset={applyPreset}>
        <DockviewContext.Provider value={{ api, savePositionBeforeClose, getSavedPosition }}>
          <PanelColorStyles />
          <div style={{ height: isFullscreenMode ? "100vh" : "calc(100vh - var(--header-height))", width: "100%", display: "flex" }}>
            {mode === "LIVE" && !isFullscreenMode && <LiveModeRail />}
            <div style={{ flex: 1 }}>
              <DockviewReact
                components={components}
                tabComponents={tabComponents}
                defaultTabComponent={PanelTab}
                onReady={onReady}
                theme={!mounted || theme === "dark" ? themeDark : themeLight}
              />
            </div>
          </div>
        </DockviewContext.Provider>
      </LayoutPresetsProvider>
    </PanelColorsProvider>
  );
}
