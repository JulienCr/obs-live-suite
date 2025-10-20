"use client";

import { LowerThirdRenderer } from "@/components/overlays/LowerThirdRenderer";

/**
 * Lower third overlay page for OBS Browser Source
 */
export default function LowerThirdOverlayPage() {
  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden">
      <LowerThirdRenderer />
    </div>
  );
}

