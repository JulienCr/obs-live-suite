"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";

export type LayoutPreset = "live" | "prep" | "minimal";

interface LayoutPresetsContextValue {
  applyPreset: (preset: LayoutPreset) => void;
}

const LayoutPresetsContext = createContext<LayoutPresetsContextValue | null>(null);

export function LayoutPresetsProvider({ children, applyPreset }: { children: ReactNode; applyPreset: (preset: LayoutPreset) => void }) {
  const value = useMemo(() => ({ applyPreset }), [applyPreset]);

  return (
    <LayoutPresetsContext.Provider value={value}>
      {children}
    </LayoutPresetsContext.Provider>
  );
}

export function useLayoutPresets() {
  const context = useContext(LayoutPresetsContext);
  if (!context) {
    throw new Error("useLayoutPresets must be used within LayoutPresetsProvider");
  }
  return context;
}
