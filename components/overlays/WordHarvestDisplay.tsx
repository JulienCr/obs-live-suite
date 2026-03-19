"use client";

import { m, AnimatePresence, useAnimationControls } from "framer-motion";
import { useEffect } from "react";
import type { HarvestWord, WordHarvestPhase } from "@/lib/models/WordHarvest";
import { WordHarvestTitle } from "./WordHarvestTitle";
import { WordHarvestSparkles } from "./WordHarvestSparkles";
import { WordHarvestWordItem } from "./WordHarvestWordItem";
import { WordHarvestConfetti } from "./WordHarvestConfetti";
import {
  listShakeVariants,
  breathingVariants,
  overlayFadeOutVariants,
} from "./wordHarvestAnimations";
import { WORD_HARVEST } from "@/lib/config/Constants";

let fontInjected = false;

interface WordHarvestDisplayProps {
  words: HarvestWord[];
  phase: WordHarvestPhase;
  targetCount: number;
  celebrating: boolean;
  titleVariant: "intro" | "celebration" | "go" | null;
  allUsed: boolean;
}

export function WordHarvestDisplay({
  words,
  phase,
  targetCount,
  celebrating,
  titleVariant,
  allUsed,
}: WordHarvestDisplayProps) {
  const listControls = useAnimationControls();

  // Load Permanent Marker font once (module-level guard prevents duplicate <link> on remount)
  useEffect(() => {
    if (fontInjected) return;
    fontInjected = true;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = WORD_HARVEST.FONT_URL;
    document.head.appendChild(link);
  }, []);

  // Manage list animation state based on phase
  useEffect(() => {
    if (allUsed) return;

    if (celebrating) {
      listControls.start("shake").then(() => {
        if (phase === "complete") {
          listControls.start("breathing");
        }
      });
    } else if (phase === "performing" || phase === "collecting") {
      listControls.start("idle");
    }
  }, [celebrating, phase, allUsed, listControls]);

  return (
    <m.div
      variants={overlayFadeOutVariants}
      initial="visible"
      animate={allUsed ? "fadeOut" : "visible"}
    >
      {/* Title overlay (intro / celebration / go) */}
      <WordHarvestTitle variant={titleVariant} targetCount={targetCount} />

      {/* Sparkles during title moments */}
      <WordHarvestSparkles active={titleVariant !== null} />

      {/* Word list — right side, always vertically centered */}
      <div
        style={{
          position: "fixed",
          right: 60,
          top: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <m.div
          variants={{ ...listShakeVariants, ...breathingVariants }}
          animate={listControls}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <AnimatePresence mode="popLayout">
            {words.map((word, index) => (
              <WordHarvestWordItem
                key={word.id}
                word={word}
                index={index}
                exploding={allUsed}
              />
            ))}
          </AnimatePresence>
        </m.div>
      </div>

      {/* Confetti for finale */}
      <WordHarvestConfetti active={allUsed} />
    </m.div>
  );
}
