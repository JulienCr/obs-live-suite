"use client";

import { LowerThirdRenderer } from "@/components/overlays/LowerThirdRenderer";

/**
 * Lower third overlay page for OBS Browser Source
 * Connects directly to backend WebSocket on port 3001
 */
export default function LowerThirdOverlayPage() {
  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden">
      <LowerThirdRenderer />
    </div>
  );
}

