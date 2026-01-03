"use client";

import { createContext, useContext, useRef, useCallback } from "react";
import type { DockviewApi } from "dockview-react";

interface PanelPosition {
  // If panel had siblings in its group, use one as reference
  siblingPanelId?: string;
  tabIndex: number;
  // If panel was alone, save a neighbor panel and direction
  neighborPanelId?: string;
  direction?: "left" | "right" | "above" | "below";
}

interface DockviewContextValue {
  api: DockviewApi | null;
  savePositionBeforeClose: (panelId: string) => void;
  getSavedPosition: (panelId: string) => PanelPosition | undefined;
}

export const DockviewContext = createContext<DockviewContextValue>({
  api: null,
  savePositionBeforeClose: () => {},
  getSavedPosition: () => undefined,
});

export function useDockview() {
  const context = useContext(DockviewContext);
  if (!context) {
    throw new Error("useDockview must be used within DockviewProvider");
  }
  return context;
}

/**
 * Hook to save/restore panel positions using relative references
 */
export function usePanelPositions(api: DockviewApi | null) {
  const positionsRef = useRef<Record<string, PanelPosition>>({});

  const savePositionBeforeClose = useCallback((panelId: string) => {
    if (!api) return;

    const panel = api.getPanel(panelId);
    if (!panel) return;

    const group = panel.api.group;
    if (!group) return;

    const siblings = group.panels.filter(p => p.id !== panelId);
    const tabIndex = group.panels.findIndex(p => p.id === panelId);

    if (siblings.length > 0) {
      // Has siblings - save one as reference
      positionsRef.current[panelId] = {
        siblingPanelId: siblings[0].id,
        tabIndex: tabIndex >= 0 ? tabIndex : 0,
      };
    } else {
      // Alone in group - find a neighbor panel from another group
      const allPanels = api.panels.filter(p => p.id !== panelId);
      if (allPanels.length > 0) {
        // Just use the first available panel as neighbor with "right" direction
        // This is a fallback - not perfect but workable
        positionsRef.current[panelId] = {
          tabIndex: 0,
          neighborPanelId: allPanels[0].id,
          direction: "right",
        };
      }
    }
  }, [api]);

  const getSavedPosition = useCallback((panelId: string): PanelPosition | undefined => {
    return positionsRef.current[panelId];
  }, []);

  return { savePositionBeforeClose, getSavedPosition };
}
