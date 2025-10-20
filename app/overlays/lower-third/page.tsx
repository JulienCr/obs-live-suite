"use client";

import { LowerThirdRenderer } from "@/components/overlays/LowerThirdRenderer";
import { useEffect } from "react";

/**
 * Lower third overlay page for OBS Browser Source
 */
export default function LowerThirdOverlayPage() {
  // Trigger server initialization on load
  useEffect(() => {
    fetch("/api/init").catch(console.error);
  }, []);

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden">
      <LowerThirdRenderer />
    </div>
  );
}

