"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import type { PanelId, ColorScheme } from "@/lib/models/PanelColor";

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

export function usePanelColors() {
  const context = useContext(PanelColorsContext);
  if (!context) {
    throw new Error("usePanelColors must be used within a PanelColorsProvider");
  }
  return context;
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
        const response = await fetch("/api/panel-colors");
        if (response.ok) {
          const data = await response.json();
          const colorMap: Record<string, PanelColorEntry> = {};
          for (const color of data.colors) {
            colorMap[color.panelId] = { scheme: color.scheme };
          }
          setColors(colorMap);
        }
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
      const response = await fetch("/api/panel-colors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panelId, scheme }),
      });

      if (response.ok) {
        const data = await response.json();
        setColors((prev) => ({
          ...prev,
          [panelId]: { scheme: data.panelColor.scheme },
        }));
      }
    } catch (error) {
      console.error("Failed to update panel scheme:", error);
    }
  }, []);

  const resetScheme = useCallback(async (panelId: PanelId) => {
    try {
      const response = await fetch(`/api/panel-colors/${panelId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setColors((prev) => {
          const next = { ...prev };
          delete next[panelId];
          return next;
        });
      }
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
