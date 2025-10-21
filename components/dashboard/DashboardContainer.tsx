"use client";

import { OverlayControlPanel } from "./OverlayControlPanel";
import { MacrosBar } from "./MacrosBar";
import { EventLog } from "./EventLog";

/**
 * DashboardContainer - Main dashboard layout
 */
export function DashboardContainer() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-4 space-y-4">
        <OverlayControlPanel />
        <MacrosBar />
        <EventLog />
      </main>
    </div>
  );
}

