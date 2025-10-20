"use client";

import { CountdownRenderer } from "@/components/overlays/CountdownRenderer";

/**
 * Countdown overlay page for OBS Browser Source
 */
export default function CountdownOverlayPage() {
  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden">
      <CountdownRenderer />
    </div>
  );
}

