"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import type { DbPanelColor } from "@/lib/models/Database";
import type { PanelId, PanelColorUpdate } from "@/lib/models/PanelColor";

interface PanelColorsContextValue {
  colors: Record<string, DbPanelColor>;
  updateColor: (panelId: PanelId, updates: PanelColorUpdate) => Promise<void>;
  resetColor: (panelId: PanelId) => Promise<void>;
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
  const [colors, setColors] = useState<Record<string, DbPanelColor>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all panel colors on mount
  useEffect(() => {
    async function fetchColors() {
      try {
        const response = await fetch("/api/panel-colors");
        if (response.ok) {
          const data = await response.json();
          const colorMap: Record<string, DbPanelColor> = {};
          for (const color of data.colors) {
            colorMap[color.panelId] = color;
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

  const updateColor = useCallback(async (panelId: PanelId, updates: PanelColorUpdate) => {
    try {
      const response = await fetch("/api/panel-colors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panelId, ...updates }),
      });

      if (response.ok) {
        const data = await response.json();
        setColors((prev) => ({
          ...prev,
          [panelId]: data.panelColor,
        }));
      }
    } catch (error) {
      console.error("Failed to update panel color:", error);
    }
  }, []);

  const resetColor = useCallback(async (panelId: PanelId) => {
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
      console.error("Failed to reset panel color:", error);
    }
  }, []);

  return (
    <PanelColorsContext.Provider value={{ colors, updateColor, resetColor, isLoading }}>
      {children}
    </PanelColorsContext.Provider>
  );
}
