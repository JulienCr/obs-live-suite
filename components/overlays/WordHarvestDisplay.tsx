"use client";

import { m, AnimatePresence } from "framer-motion";
import type { HarvestWord } from "@/lib/models/WordHarvest";
import {
  wordEntryVariants,
  celebrationVariants,
} from "./wordHarvestAnimations";

interface WordHarvestDisplayProps {
  words: HarvestWord[];
  celebrating: boolean;
  targetCount: number;
}

export function WordHarvestDisplay({
  words,
  celebrating,
  targetCount,
}: WordHarvestDisplayProps) {
  return (
    <>
      {/* Word list - right side, vertically centered */}
      <div
        style={{
          position: "fixed",
          right: 60,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 10,
        }}
      >
        <AnimatePresence mode="popLayout">
          {words.map((word, index) => (
            <m.div
              key={word.id}
              variants={wordEntryVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              layout
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                background: "rgba(0, 0, 0, 0.6)",
                color: "white",
                fontSize: 28,
                fontWeight: 600,
                whiteSpace: "nowrap",
                textDecoration: word.used ? "line-through" : "none",
                opacity: word.used ? 0.4 : 1,
                transition: "opacity 0.3s ease, text-decoration 0.3s ease",
              }}
            >
              {index + 1}. {word.word}
            </m.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Celebration overlay - centered on screen */}
      <AnimatePresence>
        {celebrating && (
          <m.div
            key="celebration"
            variants={celebrationVariants}
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
                fontSize: 96,
                fontWeight: 800,
                color: "white",
                textShadow:
                  "0 0 40px rgba(255, 200, 0, 0.8), 0 4px 12px rgba(0, 0, 0, 0.5)",
              }}
            >
              {targetCount} mots !
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
