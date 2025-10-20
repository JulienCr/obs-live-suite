"use client";

import { PosterRenderer } from "@/components/overlays/PosterRenderer";

/**
 * Poster overlay page for OBS Browser Source
 */
export default function PosterOverlayPage() {
  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden">
      <PosterRenderer />
    </div>
  );
}

