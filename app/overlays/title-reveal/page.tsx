"use client";

import { TitleRevealRenderer } from "@/components/overlays/TitleRevealRenderer";

export default function TitleRevealOverlayPage() {
  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden">
      <TitleRevealRenderer />
    </div>
  );
}
