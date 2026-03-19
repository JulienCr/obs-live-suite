"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { m, useAnimationControls } from "framer-motion";
import type { HarvestWord } from "@/lib/models/WordHarvest";
import {
  wordEntryVariants,
  wordUsedVariants,
  strikethroughVariants,
  letterExplodeVariant,
  letterWobbleVariant,
  WORD_ITEM_COLOR,
  WORD_ITEM_SHADOW,
} from "./wordHarvestAnimations";

const FONT_FAMILY = "'Permanent Marker', cursive";
const FONT_SIZE = 32;
const SHOW_STRIKETHROUGH = false;

interface WordHarvestWordItemProps {
  word: HarvestWord;
  index: number;
  exploding: boolean;
}

/** Generate a wobbly SVG path that looks like a quick marker stroke */
function markerStrikePath(width: number): string {
  const segments = 5;
  const step = width / segments;
  let d = `M2 6`;
  for (let i = 1; i <= segments; i++) {
    const x = Math.round(i * step);
    // Alternate y between 4 and 8 for a subtle wave
    const y = i % 2 === 0 ? 4 : 8;
    const cpX = Math.round(x - step * 0.5);
    const cpY = i % 2 === 0 ? 9 : 3;
    d += ` Q${cpX} ${cpY}, ${x} ${y}`;
  }
  return d;
}

/** Simple seeded pseudo-random (deterministic per word index) */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

export function WordHarvestWordItem({ word, index, exploding }: WordHarvestWordItemProps) {
  const usedControls = useAnimationControls();
  const entryFlashed = useRef(false);
  const wordRef = useRef<HTMLDivElement>(null);
  const [wordWidth, setWordWidth] = useState(0);

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

  // Measure actual word width
  useEffect(() => {
    if (wordRef.current) {
      setWordWidth(wordRef.current.scrollWidth);
    }
  });

  // Subtle per-word randomness for strike position/rotation (deterministic)
  const strikeRotate = useMemo(() => (seededRandom(index) - 0.5) * 2.5, [index]); // -1.25 to +1.25 deg
  const strikeYShift = useMemo(() => (seededRandom(index + 100) - 0.5) * 4, [index]); // -2 to +2 px

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
        ref={wordRef}
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

        {/* Hand-drawn marker strikethrough — sized to actual word width */}
        {SHOW_STRIKETHROUGH && wordWidth > 0 && (
          <m.svg
            variants={strikethroughVariants}
            initial="hidden"
            animate={word.used ? "visible" : "hidden"}
            viewBox={`0 0 ${wordWidth + 8} 12`}
            style={{
              position: "absolute",
              left: -4,
              top: "48%",
              height: 14,
              width: wordWidth + 8,
              transformOrigin: "left",
              overflow: "visible",
              transform: `translateY(${strikeYShift}px) rotate(${strikeRotate}deg)`,
            }}
          >
            <path
              d={markerStrikePath(wordWidth + 8)}
              fill="none"
              stroke="rgba(255, 80, 60, 0.85)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </m.svg>
        )}
      </m.div>
    </m.div>
  );
}
