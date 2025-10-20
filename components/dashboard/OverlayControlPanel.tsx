"use client";

import { LowerThirdCard } from "./cards/LowerThirdCard";
import { CountdownCard } from "./cards/CountdownCard";
import { PosterCard } from "./cards/PosterCard";

/**
 * OverlayControlPanel contains all overlay control cards
 */
export function OverlayControlPanel() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <LowerThirdCard />
      <CountdownCard />
      <PosterCard />
    </div>
  );
}

