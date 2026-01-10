"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import type { PanelId, ColorScheme } from "@/lib/models/PanelColor";
import { apiGet, apiPost, apiDelete } from "@/lib/utils/ClientFetch";

interface PanelColorEntry {
  scheme: ColorScheme;
}

interface PanelColorsContextValue {
  colors: Record<string, PanelColorEntry>;
  setScheme: (panelId: PanelId, scheme: ColorScheme) => Promise<void>;
  resetScheme: (panelId: PanelId) => Promise<void>;
  isLoading: boolean;
}

const PanelColorsContext = createContext<PanelColorsContextValue | null>(null);

export function usePanelColors(): PanelColorsContextValue {
  const context = useContext(PanelColorsContext);
  if (!context) {
    throw new Error("usePanelColors must be used within a PanelColorsProvider");
  }
  return context;
}

/**
 * Safe version of usePanelColors that returns null if not within a provider.
 * Use this in components that may be rendered outside the PanelColorsProvider.
 */
export function usePanelColorsSafe(): PanelColorsContextValue | null {
  return useContext(PanelColorsContext);
}

interface PanelColorsProviderProps {
  children: ReactNode;
}

export function PanelColorsProvider({ children }: PanelColorsProviderProps) {
  const [colors, setColors] = useState<Record<string, PanelColorEntry>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all panel colors on mount
  useEffect(() => {
    async function fetchColors() {
      try {
        const data = await apiGet<{ colors: Array<{ panelId: string; scheme: ColorScheme }> }>("/api/panel-colors");
        const colorMap: Record<string, PanelColorEntry> = {};
        for (const color of data.colors) {
          colorMap[color.panelId] = { scheme: color.scheme };
        }
        setColors(colorMap);
      } catch (error) {
        console.error("Failed to fetch panel colors:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchColors();
  }, []);

  const setScheme = useCallback(async (panelId: PanelId, scheme: ColorScheme) => {
    try {
      const data = await apiPost<{ panelColor: { scheme: ColorScheme } }>("/api/panel-colors", { panelId, scheme });
      setColors((prev) => ({
        ...prev,
        [panelId]: { scheme: data.panelColor.scheme },
      }));
    } catch (error) {
      console.error("Failed to update panel scheme:", error);
    }
  }, []);

  const resetScheme = useCallback(async (panelId: PanelId) => {
    try {
      await apiDelete(`/api/panel-colors/${panelId}`);
      setColors((prev) => {
        const next = { ...prev };
        delete next[panelId];
        return next;
      });
    } catch (error) {
      console.error("Failed to reset panel scheme:", error);
    }
  }, []);

  return (
    <PanelColorsContext.Provider value={{ colors, setScheme, resetScheme, isLoading }}>
      {children}
    </PanelColorsContext.Provider>
  );
}
