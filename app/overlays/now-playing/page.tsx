"use client";

import { NowPlayingRenderer } from "@/components/overlays/NowPlayingRenderer";

/**
 * Now-playing overlay page for OBS Browser Source.
 * Shows artwork + track info when a media player driver is playing.
 */
export default function NowPlayingOverlayPage() {
  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden">
      <NowPlayingRenderer />
    </div>
  );
}
