"use client";

import { useEffect, useMemo, useRef } from "react";
import { m, useAnimationControls } from "framer-motion";
import type { HarvestWord } from "@/lib/models/WordHarvest";
import {
  wordEntryVariants,
  wordUsedVariants,
  letterExplodeVariant,
  letterWobbleVariant,
  WORD_ITEM_COLOR,
  WORD_ITEM_SHADOW,
} from "./wordHarvestAnimations";

const FONT_FAMILY = "'Permanent Marker', cursive";
const FONT_SIZE = 32;

interface WordHarvestWordItemProps {
  word: HarvestWord;
  index: number;
  exploding: boolean;
}

export function WordHarvestWordItem({ word, index, exploding }: WordHarvestWordItemProps) {
  const usedControls = useAnimationControls();
  const entryFlashed = useRef(false);

  // Flash bright on first mount then settle
  useEffect(() => {
    if (!entryFlashed.current) {
      entryFlashed.current = true;
      usedControls.start({
        color: ["#FFFFFF", "#FFD700", WORD_ITEM_COLOR],
        transition: { duration: 0.8, times: [0, 0.3, 1] },
      });
    }
  }, [usedControls]);

  // Used state transition
  useEffect(() => {
    usedControls.start(word.used ? "used" : "unused");
  }, [word.used, usedControls]);

  const displayText = `${index + 1}. ${word.word}`;
  const letters = useMemo(() => displayText.split(""), [displayText]);
  const explodeVariants = useMemo(
    () => letters.map((_, i) => letterExplodeVariant(i, letters.length)),
    [letters]
  );
  const wobbleVariants = useMemo(
    () => letters.map((_, i) => letterWobbleVariant(i)),
    [letters]
  );

  // --- Exploding state: letters scatter ---
  if (exploding) {
    return (
      <m.div style={{ display: "flex", position: "relative", overflow: "visible" }}>
        {letters.map((char, i) => (
          <m.span
            key={i}
            variants={explodeVariants[i]}
            initial="initial"
            animate="explode"
            transition={{ delay: index * 0.1 + i * 0.03 }}
            style={{
              display: "inline-block",
              fontFamily: FONT_FAMILY,
              color: WORD_ITEM_COLOR,
              fontSize: FONT_SIZE,
              textShadow: WORD_ITEM_SHADOW,
              whiteSpace: "pre",
            }}
          >
            {char}
          </m.span>
        ))}
      </m.div>
    );
  }

  // --- Normal state: floating letters ---
  return (
    <m.div
      variants={wordEntryVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
    >
      <m.div
        variants={wordUsedVariants}
        animate={usedControls}
        style={{
          position: "relative",
          display: "inline-flex",
          whiteSpace: "nowrap",
          width: "fit-content",
          color: WORD_ITEM_COLOR,
        }}
      >
        {letters.map((char, i) => (
          <m.span
            key={i}
            variants={wobbleVariants[i]}
            initial="initial"
            animate="wobble"
            style={{
              display: "inline-block",
              fontFamily: FONT_FAMILY,
              fontSize: FONT_SIZE,
              textShadow: WORD_ITEM_SHADOW,
              whiteSpace: "pre",
            }}
          >
            {char}
          </m.span>
        ))}
      </m.div>
    </m.div>
  );
}
