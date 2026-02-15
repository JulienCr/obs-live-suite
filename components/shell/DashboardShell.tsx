"use client";

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import {
  DockviewReact,
  DockviewReadyEvent,
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
import { TwitchPanel } from "./panels/TwitchPanel";
import { ChatMessagesPanel } from "./panels/ChatMessagesPanel";
import { TextPresetsPanel } from "./panels/TextPresetsPanel";
import { DockviewContext, usePanelPositions } from "./DockviewContext";
import { LayoutPresetsProvider, LayoutPreset } from "./LayoutPresetsContext";
import { usePanelColorsStore, useWorkspacesStore } from "@/lib/stores";
import { PanelTab } from "./PanelTab";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { LiveModeRail } from "./LiveModeRail";
import { useAppMode } from "./AppModeContext";
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
  twitch: TwitchPanel,
  chatMessages: ChatMessagesPanel,
  textPresets: TextPresetsPanel,
};

const tabComponents = {
  default: PanelTab,
};

export function DashboardShell() {
  const { theme } = useTheme();
  const { mode, isFullscreenMode } = useAppMode();
  const [mounted, setMounted] = useState(false);
  const apiRef = useRef<DockviewReadyEvent["api"] | null>(null);
  const [api, setApi] = useState<DockviewReadyEvent["api"] | null>(null);
  const { savePositionBeforeClose, getSavedPosition } = usePanelPositions(api);
  const [workspaceCallbacks, setWorkspaceCallbacks] = useState<{
    resetToDefault: () => void;
    openSaveDialog: () => void;
  } | undefined>(undefined);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

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
      title: "panels.lowerThird",
    });

    apiRef.current.addPanel({
      id: "countdown",
      component: "countdown",
      title: "panels.countdown",
      position: { referencePanel: lowerThird, direction: "within" },
    });

    apiRef.current.addPanel({
      id: "guests",
      component: "guests",
      title: "panels.guests",
      position: { referencePanel: lowerThird, direction: "within" },
    });

    apiRef.current.addPanel({
      id: "textPresets",
      component: "textPresets",
      title: "panels.textPresets",
      position: { referencePanel: lowerThird, direction: "within" },
    });

    apiRef.current.addPanel({
      id: "poster",
      component: "poster",
      title: "panels.poster",
      position: { referencePanel: lowerThird, direction: "within" },
    });

    // Bottom panel for Macros and Event Log
    const macros = apiRef.current.addPanel({
      id: "macros",
      component: "macros",
      title: "panels.macros",
      position: { referencePanel: lowerThird, direction: "below" },
    });

    apiRef.current.addPanel({
      id: "eventLog",
      component: "eventLog",
      title: "panels.eventLog",
      position: { referencePanel: macros, direction: "within" },
    });

    try {
      macros.api.setSize({ height: 250 });
    } catch (err) {
      console.warn("Failed to set panel size:", err);
    }

    localStorage.setItem(PRESET_KEY, "live");
  }, []);

  const applyPrepPreset = useCallback(() => {
    if (!apiRef.current) return;

    // Clear existing panels
    apiRef.current.clear();

    // Grid layout - all panels visible
    const lowerThird = apiRef.current.addPanel({
      id: "lowerThird",
      component: "lowerThird",
      title: "panels.lowerThird",
    });

    const countdown = apiRef.current.addPanel({
      id: "countdown",
      component: "countdown",
      title: "panels.countdown",
      position: { referencePanel: lowerThird, direction: "right" },
    });

    apiRef.current.addPanel({
      id: "guests",
      component: "guests",
      title: "panels.guests",
      position: { referencePanel: countdown, direction: "right" },
    });

    const poster = apiRef.current.addPanel({
      id: "poster",
      component: "poster",
      title: "panels.poster",
      position: { referencePanel: lowerThird, direction: "below" },
    });

    const macros = apiRef.current.addPanel({
      id: "macros",
      component: "macros",
      title: "panels.macros",
      position: { referencePanel: poster, direction: "right" },
    });

    apiRef.current.addPanel({
      id: "eventLog",
      component: "eventLog",
      title: "panels.eventLog",
      position: { referencePanel: macros, direction: "right" },
    });

    localStorage.setItem(PRESET_KEY, "prep");
  }, []);

  const applyMinimalPreset = useCallback(() => {
    if (!apiRef.current) return;

    // Clear existing panels
    apiRef.current.clear();

    // Minimal layout - only Lower Third and Macros
    const lowerThird = apiRef.current.addPanel({
      id: "lowerThird",
      component: "lowerThird",
      title: "panels.lowerThird",
    });

    const macros = apiRef.current.addPanel({
      id: "macros",
      component: "macros",
      title: "panels.macros",
      position: { referencePanel: lowerThird, direction: "below" },
    });

    try {
      macros.api.setSize({ height: 200 });
    } catch (err) {
      console.warn("Failed to set panel size:", err);
    }

    localStorage.setItem(PRESET_KEY, "minimal");
  }, []);

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

  // Enable keyboard shortcuts for layout presets and workspaces
  useKeyboardShortcuts(applyPreset, api, true, workspaceCallbacks);

  // Callback for workspace store to apply a layout (panelColors applied separately via store)
  const applyLayout = useCallback((layoutJson: string, _panelColors: Record<string, string>) => {
    if (!apiRef.current) return;
    try {
      apiRef.current.fromJSON(JSON.parse(layoutJson));
      localStorage.setItem(LAYOUT_KEY, layoutJson);
    } catch (err) {
      console.error("Failed to apply workspace layout:", err);
    }
  }, []);

  // Get current layout as JSON
  const getLayoutJson = useCallback(() => {
    if (!apiRef.current) return null;
    try {
      return JSON.stringify(apiRef.current.toJSON());
    } catch (err) {
      console.error("Failed to get layout JSON:", err);
      return null;
    }
  }, []);

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
      title: "panels.lowerThird",
    });

    event.api.addPanel({
      id: "countdown",
      component: "countdown",
      title: "panels.countdown",
      position: { referencePanel: lowerThird, direction: "within" },
    });

    event.api.addPanel({
      id: "guests",
      component: "guests",
      title: "panels.guests",
      position: { referencePanel: lowerThird, direction: "within" },
    });

    event.api.addPanel({
      id: "poster",
      component: "poster",
      title: "panels.poster",
      position: { referencePanel: lowerThird, direction: "within" },
    });

    // Bottom panel for Macros
    const macros = event.api.addPanel({
      id: "macros",
      component: "macros",
      title: "panels.macros",
      position: { referencePanel: lowerThird, direction: "below" },
    });

    event.api.addPanel({
      id: "eventLog",
      component: "eventLog",
      title: "panels.eventLog",
      position: { referencePanel: macros, direction: "within" },
    });

    // Set initial sizes for bottom panel (height in pixels)
    try {
      macros.api.setSize({ height: 250 });
    } catch (err) {
      // Ignore if setSize API has changed
      console.warn("Failed to set panel size:", err);
    }
  }, []);

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

  // Initialize stores on mount
  const fetchPanelColors = usePanelColorsStore((s) => s.fetchColors);
  const initWorkspaces = useWorkspacesStore((s) => s.init);
  const setLayoutJsonGetter = useWorkspacesStore((s) => s.setLayoutJsonGetter);
  const setLayoutApplier = useWorkspacesStore((s) => s.setLayoutApplier);
  const resetToDefault = useWorkspacesStore((s) => s.resetToDefault);

  useEffect(() => {
    fetchPanelColors();
    initWorkspaces();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Connect workspace store with layout getter/applier
  useEffect(() => {
    setLayoutJsonGetter(getLayoutJson);
    setLayoutApplier(applyLayout);
  }, [getLayoutJson, applyLayout, setLayoutJsonGetter, setLayoutApplier]);

  const dockviewContextValue = useMemo(
    () => ({ api, savePositionBeforeClose, getSavedPosition }),
    [api, savePositionBeforeClose, getSavedPosition]
  );

  // Expose callbacks for keyboard shortcuts
  useEffect(() => {
    setWorkspaceCallbacks({
      resetToDefault: () => {
        resetToDefault().catch(console.error);
      },
      openSaveDialog: () => {
        setSaveDialogOpen(true);
      },
    });
  }, [resetToDefault]);

  return (
    <>
      <StoreWorkspaceSaveDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen} />
      <LayoutPresetsProvider applyPreset={applyPreset}>
        <DockviewContext.Provider value={dockviewContextValue}>
          <PanelColorStyles />
          <div style={{ height: isFullscreenMode ? "100vh" : "calc(100vh - var(--header-height))", width: "100%", display: "flex" }}>
            {mode === "LIVE" && !isFullscreenMode && <LiveModeRail />}
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
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
    </>
  );
}

/** Lazy-loaded workspace save dialog triggered by keyboard shortcuts */
function StoreWorkspaceSaveDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!open) return null;
  const WorkspaceSaveDialogLazy = require("./WorkspaceSaveDialog").WorkspaceSaveDialog;
  return <WorkspaceSaveDialogLazy open={open} onOpenChange={onOpenChange} />;
}
