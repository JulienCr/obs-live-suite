"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  DockviewReact,
  DockviewReadyEvent,
  IDockviewPanelProps,
} from "dockview-react";
// Note: Dockview CSS is imported globally in app/globals.css

// Import widget panels
import { LowerThirdPanel } from "./panels/LowerThirdPanel";
import { CountdownPanel } from "./panels/CountdownPanel";
import { GuestsPanel } from "./panels/GuestsPanel";
import { PosterPanel } from "./panels/PosterPanel";
import { MacrosPanel } from "./panels/MacrosPanel";
import { EventLogPanel } from "./panels/EventLogPanel";
import { DockviewContext } from "./DockviewContext";

const LAYOUT_KEY = "obs-live-suite-dockview-layout";

const components = {
  lowerThird: LowerThirdPanel,
  countdown: CountdownPanel,
  guests: GuestsPanel,
  poster: PosterPanel,
  macros: MacrosPanel,
  eventLog: EventLogPanel,
};

export function DashboardShell() {
  const apiRef = useRef<DockviewReadyEvent["api"] | null>(null);
  const [api, setApi] = useState<DockviewReadyEvent["api"] | null>(null);

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
      title: "Lower Third",
    });

    const countdown = event.api.addPanel({
      id: "countdown",
      component: "countdown",
      title: "Countdown",
      position: { referencePanel: lowerThird, direction: "within" },
    });

    const guests = event.api.addPanel({
      id: "guests",
      component: "guests",
      title: "Guests",
      position: { referencePanel: lowerThird, direction: "within" },
    });

    const poster = event.api.addPanel({
      id: "poster",
      component: "poster",
      title: "Poster",
      position: { referencePanel: lowerThird, direction: "within" },
    });

    // Bottom panel for Macros
    const macros = event.api.addPanel({
      id: "macros",
      component: "macros",
      title: "Macros",
      position: { referencePanel: lowerThird, direction: "below" },
    });

    // Event Log next to Macros in bottom area
    const eventLog = event.api.addPanel({
      id: "eventLog",
      component: "eventLog",
      title: "Event Log",
      position: { referencePanel: macros, direction: "within" },
    });

    // Set initial sizes for bottom panel (height in pixels)
    try {
      macros.api.setSize({ height: 250 });
    } catch (err) {
      // Ignore if setSize API has changed
      console.warn("Failed to set panel size:", err);
    }

    // Save layout on any change
    const disposable = event.api.onDidLayoutChange(() => {
      try {
        const json = event.api.toJSON();
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(json));
      } catch (err) {
        console.error("Failed to save layout", err);
      }
    });

    return () => disposable.dispose();
  }, []);

  return (
    <DockviewContext.Provider value={{ api }}>
      <div style={{ height: "100vh", width: "100vw" }}>
        <DockviewReact
          components={components}
          onReady={onReady}
          className="dockview-theme-dark"
        />
      </div>
    </DockviewContext.Provider>
  );
}
