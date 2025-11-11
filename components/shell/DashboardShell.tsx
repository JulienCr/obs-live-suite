"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  DockviewReact,
  DockviewReadyEvent,
  IDockviewPanelProps,
} from "dockview-react";
import "dockview-react/dist/styles.css";

// Sample panels
function ExplorerPanel(props: IDockviewPanelProps) {
  return (
    <div className="panel-explorer" style={{ padding: "1rem" }}>
      <h3>Explorer</h3>
      <p>Asset navigation, scenes, overlays...</p>
    </div>
  );
}

function EditorPanel(props: IDockviewPanelProps) {
  return (
    <div className="panel-editor" style={{ padding: "1rem" }}>
      <h3>Main Editor</h3>
      <p>Widget controls, live editing...</p>
    </div>
  );
}

function ConsolePanel(props: IDockviewPanelProps) {
  return (
    <div className="panel-console" style={{ padding: "1rem" }}>
      <h3>Console / Event Log</h3>
      <p>System events, logs, status...</p>
    </div>
  );
}

const LAYOUT_KEY = "obs-live-suite-dockview-layout";

const components = {
  explorer: ExplorerPanel,
  editor: EditorPanel,
  console: ConsolePanel,
};

export function DashboardShell() {
  const apiRef = useRef<DockviewReadyEvent["api"] | null>(null);

  const onReady = useCallback((event: DockviewReadyEvent) => {
    apiRef.current = event.api;

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

    // Default layout: 3-panel IDE-style
    const explorer = event.api.addPanel({
      id: "explorer",
      component: "explorer",
      title: "Explorer",
      position: { direction: "left" },
    });

    const editor = event.api.addPanel({
      id: "editor",
      component: "editor",
      title: "Main Editor",
    });

    const consolePanel = event.api.addPanel({
      id: "console",
      component: "console",
      title: "Console",
      position: { referencePanel: editor, direction: "below" },
    });

    // Set initial sizes
    explorer.api.setSize({ size: 250 });
    consolePanel.api.setSize({ size: 200 });

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
    <div style={{ height: "100vh", width: "100vw" }}>
      <DockviewReact
        components={components}
        onReady={onReady}
        className="dockview-theme-dark"
      />
    </div>
  );
}
