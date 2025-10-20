"use client";

import { DashboardHeader } from "./DashboardHeader";
import { OverlayControlPanel } from "./OverlayControlPanel";
import { MacrosBar } from "./MacrosBar";
import { EventLog } from "./EventLog";

/**
 * DashboardContainer - Main dashboard layout
 */
export function DashboardContainer() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <OverlayControlPanel />
        <MacrosBar />
        <EventLog />
      </main>
    </div>
  );
}

