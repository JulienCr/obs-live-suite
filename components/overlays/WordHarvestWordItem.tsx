"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import { m, useAnimationControls } from "framer-motion";
import type { HarvestWord } from "@/lib/models/WordHarvest";
import {
  wordEntryVariants,
  wordUsedVariants,
  letterExplodeVariant,
  WORD_ITEM_COLOR,
  WORD_ITEM_SHADOW,
} from "./wordHarvestAnimations";

const FONT_FAMILY = "'Permanent Marker', cursive";
const FONT_SIZE = 32;

/** Subtle wobble applied to the whole word container (not per-letter) */
const wordWobbleVariants = {
  initial: { rotate: 0 },
  wobble: {
    rotate: [-1, 1, -1],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
};

interface WordHarvestWordItemProps {
  word: HarvestWord;
  index: number;
  exploding: boolean;
}

function WordHarvestWordItemInner({ word, index, exploding }: WordHarvestWordItemProps) {
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

  // --- Normal state: whole-word wobble, static letters ---
  return (
    <m.div
      variants={wordEntryVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout="position"
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
        <m.span
          variants={wordWobbleVariants}
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
          {displayText}
        </m.span>
      </m.div>
    </m.div>
  );
}

export const WordHarvestWordItem = memo(WordHarvestWordItemInner, (prev, next) =>
  prev.word.id === next.word.id &&
  prev.word.used === next.word.used &&
  prev.index === next.index &&
  prev.exploding === next.exploding
);
