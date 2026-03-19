"use client";

import { useState, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { sparkleVariant, SPARKLE_COLORS } from "./wordHarvestAnimations";

const SPARKLE_COUNT = 12;
const SPARKLE_VARIANTS = Array.from({ length: SPARKLE_COUNT }, (_, i) =>
  sparkleVariant(i, SPARKLE_COUNT)
);

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

  return (
    <AnimatePresence>
      {show && (
        <div
          key="sparkles"
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
              variants={SPARKLE_VARIANTS[i]}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0, scale: 0 }}
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
      )}
    </AnimatePresence>
  );
}
