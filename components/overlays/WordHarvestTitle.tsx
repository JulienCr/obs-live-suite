"use client";

import { m, AnimatePresence } from "framer-motion";
import {
  titleEntryVariants,
  goTextVariants,
  CELEBRATION_GLOW_STYLE,
  GO_TEXT_STYLE,
} from "./wordHarvestAnimations";

interface WordHarvestTitleProps {
  variant: "intro" | "celebration" | "go" | null;
  targetCount: number;
  onExitComplete?: () => void;
}

export function WordHarvestTitle({ variant, targetCount, onExitComplete }: WordHarvestTitleProps) {
  const text = variant === "go"
    ? `${targetCount} mots ! Go !`
    : `Les ${targetCount} mots !`;

  const variants = variant === "go" ? goTextVariants : titleEntryVariants;
  const style = variant === "go" ? GO_TEXT_STYLE : CELEBRATION_GLOW_STYLE;

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {variant && (
        <m.div
          key={variant}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontSize: variant === "go" ? 140 : 120,
              fontWeight: 800,
              color: "white",
              ...style,
            }}
          >
            {text}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
