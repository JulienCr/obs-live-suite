"use client";

import { StudioReturnRenderer } from "@/components/overlays/StudioReturnRenderer";

/**
 * Studio Return overlay page — loaded by Tauri webview or browser
 * Displays director cue messages over the studio return monitor
 */
export default function StudioReturnOverlayPage() {
  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden">
      <StudioReturnRenderer />
    </div>
  );
}
