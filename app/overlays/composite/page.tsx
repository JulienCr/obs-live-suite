"use client";

import { CountdownRenderer } from "@/components/overlays/CountdownRenderer";
import { LowerThirdRenderer } from "@/components/overlays/LowerThirdRenderer";
import { PosterRenderer } from "@/components/overlays/PosterRenderer";

/**
 * Composite overlay page that combines all overlays into a single OBS Browser Source
 * 
 * This page includes:
 * - Lower Third overlay
 * - Countdown timer
 * - Poster display
 * 
 * Each overlay manages its own WebSocket connection and visibility state independently.
 * Use this for a single OBS browser source, or use individual overlay pages for more control.
 */
export default function CompositeOverlayPage() {
  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden">
      {/* Poster is rendered first (bottom layer) */}
      <PosterRenderer />
      
      {/* Lower Third is rendered second (middle layer) */}
      <LowerThirdRenderer />
      
      {/* Countdown is rendered last (top layer) */}
      <CountdownRenderer />
    </div>
  );
}

