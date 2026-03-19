"use client";

import { CountdownRenderer } from "@/components/overlays/CountdownRenderer";
import { LowerThirdRenderer } from "@/components/overlays/LowerThirdRenderer";
import { PosterRenderer } from "@/components/overlays/PosterRenderer";
import { ChatHighlightRenderer } from "@/components/overlays/ChatHighlightRenderer";
import { TitleRevealRenderer } from "@/components/overlays/TitleRevealRenderer";
import { WordHarvestRenderer } from "@/components/overlays/WordHarvestRenderer";

/**
 * Composite overlay page that combines all overlays into a single OBS Browser Source
 *
 * This page includes:
 * - Lower Third overlay
 * - Countdown timer
 * - Poster display
 * - Chat Highlight overlay
 * - Title Reveal overlay
 * - Word Harvest overlay
 *
 * Each overlay manages its own WebSocket connection and visibility state independently.
 * Use this for a single OBS browser source, or use individual overlay pages for more control.
 */
export default function CompositeOverlayPage() {
  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden">
      {/* Poster is rendered first (bottom layer) */}
      <PosterRenderer />

      {/* Lower Third is rendered second */}
      <LowerThirdRenderer />

      {/* Chat Highlight for displaying Twitch/YouTube messages */}
      <ChatHighlightRenderer />

      {/* Title Reveal for full-screen animated titles */}
      <TitleRevealRenderer />

      {/* Word Harvest for improv word collection game */}
      <WordHarvestRenderer />

      {/* Countdown is rendered last (top layer) */}
      <CountdownRenderer />
    </div>
  );
}

