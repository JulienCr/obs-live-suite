import { create } from "zustand";
import type { PanelId, ColorScheme } from "@/lib/models/PanelColor";
import { apiGet, apiPost, apiDelete } from "@/lib/utils/ClientFetch";

interface PanelColorEntry {
  scheme: ColorScheme;
}

interface PanelColorsState {
  colors: Record<string, PanelColorEntry>;
  isLoading: boolean;
  _initialized: boolean;

  // Actions
  hydrate: (colors: Record<string, PanelColorEntry>) => void;
  fetchColors: () => Promise<void>;
  setScheme: (panelId: PanelId, scheme: ColorScheme) => Promise<void>;
  resetScheme: (panelId: PanelId) => Promise<void>;
}

export const usePanelColorsStore = create<PanelColorsState>((set, get) => ({
  colors: {},
  isLoading: true,
  _initialized: false,

  hydrate: (colors) => {
    set({ colors, _initialized: true, isLoading: false });
  },

  fetchColors: async () => {
    if (get()._initialized) return;
    set({ _initialized: true }); // Prevent duplicate fetches
    try {
      const data = await apiGet<{
        colors: Array<{ panelId: string; scheme: ColorScheme }>;
      }>("/api/panel-colors");
      const colorMap: Record<string, PanelColorEntry> = {};
      for (const color of data.colors) {
        colorMap[color.panelId] = { scheme: color.scheme };
      }
      set({ colors: colorMap });
    } catch (error) {
      console.error("Failed to fetch panel colors:", error);
      set({ _initialized: false }); // Allow retry on error
    } finally {
      set({ isLoading: false });
    }
  },

  setScheme: async (panelId: PanelId, scheme: ColorScheme) => {
    try {
      const data = await apiPost<{ panelColor: { scheme: ColorScheme } }>(
        "/api/panel-colors",
        { panelId, scheme }
      );
      set((state) => ({
        colors: {
          ...state.colors,
          [panelId]: { scheme: data.panelColor.scheme },
        },
      }));
    } catch (error) {
      console.error("Failed to update panel scheme:", error);
    }
  },

  resetScheme: async (panelId: PanelId) => {
    try {
      await apiDelete(`/api/panel-colors/${panelId}`);
      set((state) => {
        const next = { ...state.colors };
        delete next[panelId];
        return { colors: next };
      });
    } catch (error) {
      console.error("Failed to reset panel scheme:", error);
    }
  },
}));
