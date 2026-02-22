import { create } from "zustand";
import type { DockviewApi } from "dockview-react";

interface PanelPosition {
  siblingPanelId?: string;
  tabIndex: number;
  neighborPanelId?: string;
  direction?: "left" | "right" | "above" | "below";
}

interface DockviewStoreState {
  api: DockviewApi | null;
  _positions: Record<string, PanelPosition>;
  layoutVersion: number;

  setApi: (api: DockviewApi) => void;
  clearApi: () => void;
  incrementLayoutVersion: () => void;
  savePositionBeforeClose: (panelId: string) => void;
  getSavedPosition: (panelId: string) => PanelPosition | undefined;
}

export const useDockviewStore = create<DockviewStoreState>((set, get) => ({
  api: null,
  _positions: {},
  layoutVersion: 0,

  setApi: (api) => set({ api }),

  clearApi: () => set({ api: null }),

  incrementLayoutVersion: () => set((s) => ({ layoutVersion: s.layoutVersion + 1 })),

  savePositionBeforeClose: (panelId: string) => {
    const { api } = get();
    if (!api) return;

    const panel = api.getPanel(panelId);
    if (!panel) return;

    const group = panel.api.group;
    if (!group) return;

    const siblings = group.panels.filter((p) => p.id !== panelId);
    const tabIndex = group.panels.findIndex((p) => p.id === panelId);

    let position: PanelPosition;

    if (siblings.length > 0) {
      position = {
        siblingPanelId: siblings[0].id,
        tabIndex: Math.max(tabIndex, 0),
      };
    } else {
      const neighbor = api.panels.find((p) => p.id !== panelId);
      if (!neighbor) return;
      position = {
        tabIndex: 0,
        neighborPanelId: neighbor.id,
        direction: "right",
      };
    }

    set((state) => ({
      _positions: { ...state._positions, [panelId]: position },
    }));
  },

  getSavedPosition: (panelId: string) => {
    return get()._positions[panelId];
  },
}));
