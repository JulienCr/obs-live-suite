"use client";

import { WordHarvestRenderer } from "@/components/overlays/WordHarvestRenderer";

export default function WordHarvestOverlayPage() {
  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden">
      <WordHarvestRenderer />
    </div>
  );
}
