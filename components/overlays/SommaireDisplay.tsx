"use client";

import { motion } from "framer-motion";
import type { SommaireShowPayload } from "@/lib/models/OverlayEvents";

interface SommaireDisplayProps {
  categories: SommaireShowPayload["categories"];
  activeIndex: number;
  activeSubIndex: number;
}

const COLORS = {
  active: "#F5A623",
  dimmed: "#7B8DB5",
};

const TEXT_SHADOW = "0 0 12px rgba(0,0,0,0.9), 0 0 24px rgba(0,0,0,0.7), 0 2px 6px rgba(0,0,0,0.8)";
const HEADER_SHADOW = "0 0 16px rgba(0,0,0,0.9), 0 0 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.9)";

const containerVariants = {
  hidden: { x: -60, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut" as const,
      staggerChildren: 0.08,
    },
  },
  exit: {
    x: -60,
    opacity: 0,
    transition: {
      duration: 0.35,
      ease: "easeIn" as const,
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

const itemVariants = {
  hidden: { x: -30, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.25, ease: "easeOut" as const },
  },
  exit: {
    x: -30,
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" as const },
  },
};

/**
 * SommaireDisplay renders the table of contents overlay with staggered animations.
 * No background box — uses text shadows for readability over video.
 * Font: Permanent Marker. Supports category + sub-item highlighting.
 */
export function SommaireDisplay({ categories, activeIndex, activeSubIndex }: SommaireDisplayProps) {
  const hasHighlight = activeIndex !== -1;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{
        position: "absolute",
        left: 50,
        top: "50%",
        transform: "translateY(-50%)",
        fontFamily: "'Permanent Marker', cursive",
      }}
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        style={{
          marginBottom: 20,
          paddingBottom: 8,
        }}
      >
        <span
          style={{
            color: COLORS.active,
            fontSize: 22,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            textShadow: HEADER_SHADOW,
          }}
        >
          Sommaire
        </span>
        <div
          style={{
            marginTop: 6,
            height: 2,
            width: 180,
            background: `linear-gradient(to right, ${COLORS.active}, transparent)`,
          }}
        />
      </motion.div>

      {/* Categories */}
      {categories.map((category) => {
        const isCatActive = category.index === activeIndex;
        // When highlighting a sub-item, the category title stays active
        const catColor = !hasHighlight ? COLORS.active : isCatActive ? COLORS.active : COLORS.dimmed;
        const catOpacity = !hasHighlight ? 1 : isCatActive ? 1 : 0.3;

        return (
          <motion.div
            key={category.index}
            variants={itemVariants}
            animate={{
              opacity: catOpacity,
              scale: isCatActive && activeSubIndex === -1 ? 1.03 : 1,
              x: isCatActive && activeSubIndex === -1 ? 6 : 0,
            }}
            transition={{ duration: 0.3, ease: "easeInOut" as const }}
            style={{ marginBottom: 10 }}
          >
            {/* Category title */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                marginBottom: category.items.length > 0 ? 2 : 0,
              }}
            >
              <span
                style={{
                  color: catColor,
                  fontSize: 16,
                  opacity: 0.5,
                  minWidth: 16,
                  textShadow: TEXT_SHADOW,
                }}
              >
                {category.index + 1}
              </span>
              <span
                style={{
                  color: catColor,
                  fontSize: 13,
                  textShadow: TEXT_SHADOW,
                }}
              >
                &#9658;
              </span>
              <span
                style={{
                  color: catColor,
                  fontSize: 22,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  textShadow: TEXT_SHADOW,
                }}
              >
                {category.title}
              </span>
            </div>

            {/* Sub-items */}
            {category.items.map((item, itemIdx) => {
              const isSubActive = isCatActive && activeSubIndex === itemIdx;
              // Sub-item dimming: if a sub is selected, other subs in same cat dim
              const subHasSubHighlight = isCatActive && activeSubIndex !== -1;
              const subColor = !hasHighlight
                ? COLORS.active
                : isSubActive
                  ? COLORS.active
                  : isCatActive && !subHasSubHighlight
                    ? COLORS.active
                    : COLORS.dimmed;
              const subOpacity = !hasHighlight
                ? 0.85
                : isSubActive
                  ? 1
                  : isCatActive && !subHasSubHighlight
                    ? 0.85
                    : subHasSubHighlight && !isSubActive
                      ? 0.35
                      : 0.3;

              return (
                <motion.div
                  key={itemIdx}
                  animate={{
                    opacity: subOpacity,
                    x: isSubActive ? 8 : 0,
                    scale: isSubActive ? 1.03 : 1,
                  }}
                  transition={{ duration: 0.3, ease: "easeInOut" as const }}
                  style={{
                    paddingLeft: 38,
                    color: subColor,
                    fontSize: 16,
                    lineHeight: 1.7,
                    textShadow: TEXT_SHADOW,
                  }}
                >
                  <span style={{ marginRight: 8, opacity: 0.4 }}>•</span>
                  {item}
                </motion.div>
              );
            })}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
