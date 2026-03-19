"use client";

import { useState, useEffect } from "react";
import { m } from "framer-motion";
import { sparkleVariant, SPARKLE_COLORS } from "./wordHarvestAnimations";

const SPARKLE_COUNT = 12;

interface WordHarvestSparklesProps {
  active: boolean;
}

export function WordHarvestSparkles({ active }: WordHarvestSparklesProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (active) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 1000);
      return () => clearTimeout(timer);
    }
    setShow(false);
  }, [active]);

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 19,
        pointerEvents: "none",
      }}
    >
      {Array.from({ length: SPARKLE_COUNT }, (_, i) => (
        <m.div
          key={i}
          variants={sparkleVariant(i, SPARKLE_COUNT)}
          initial="initial"
          animate="animate"
          style={{
            position: "absolute",
            width: 10 + (i % 3) * 4,
            height: 10 + (i % 3) * 4,
            borderRadius: "50%",
            background: SPARKLE_COLORS[i % SPARKLE_COLORS.length],
          }}
        />
      ))}
    </div>
  );
}
