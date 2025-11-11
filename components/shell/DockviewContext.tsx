"use client";

import { createContext, useContext } from "react";
import type { DockviewApi } from "dockview-react";

interface DockviewContextValue {
  api: DockviewApi | null;
}

export const DockviewContext = createContext<DockviewContextValue>({
  api: null,
});

export function useDockview() {
  const context = useContext(DockviewContext);
  if (!context) {
    throw new Error("useDockview must be used within DockviewProvider");
  }
  return context;
}
