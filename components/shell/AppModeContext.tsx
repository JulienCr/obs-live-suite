"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type AppMode = "LIVE" | "ADMIN";

interface AppModeContextValue {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  isOnAir: boolean;
  setIsOnAir: (isOnAir: boolean) => void;
}

const AppModeContext = createContext<AppModeContextValue | null>(null);

const MODE_STORAGE_KEY = "obs-live-suite-app-mode";

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>("LIVE");
  const [isOnAir, setIsOnAir] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    if (stored === "LIVE" || stored === "ADMIN") {
      setModeState(stored);
    }
  }, []);

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    localStorage.setItem(MODE_STORAGE_KEY, newMode);
  };

  return (
    <AppModeContext.Provider value={{ mode, setMode, isOnAir, setIsOnAir }}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  const context = useContext(AppModeContext);
  if (!context) {
    throw new Error("useAppMode must be used within AppModeProvider");
  }
  return context;
}
