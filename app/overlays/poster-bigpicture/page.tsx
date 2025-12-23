"use client";

import { BigPicturePosterRenderer } from "@/components/overlays/BigPicturePosterRenderer";

/**
 * Big-Picture Poster Overlay Page
 * OBS Browser Source URL: http://localhost:3000/overlays/poster-bigpicture
 *
 * Displays posters in full-screen centered mode
 */
export default function BigPicturePosterOverlayPage() {
  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden">
      <BigPicturePosterRenderer />
    </div>
  );
}
