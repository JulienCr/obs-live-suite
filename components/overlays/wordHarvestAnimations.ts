import type { Variants } from "framer-motion";

// =============================================================================
// Word item shared style constants
// =============================================================================

export const WORD_ITEM_COLOR = "#F5A623";

export const WORD_ITEM_SHADOW =
  "0 2px 8px rgba(0, 0, 0, 0.6), 0 0 20px rgba(245, 166, 35, 0.15)";

// =============================================================================
// Word Entry — bouncy spring from right with overshoot
// =============================================================================

export const wordEntryVariants: Variants = {
  initial: { x: 200, opacity: 0, scale: 0.8 },
  animate: {
    x: 0,
    opacity: 1,
    scale: [0.8, 1.1, 1],
    transition: {
      x: { type: "spring", stiffness: 300, damping: 20 },
      scale: { duration: 0.5, times: [0, 0.6, 1] },
      opacity: { duration: 0.2 },
    },
  },
  exit: {
    x: 200,
    opacity: 0,
    transition: { duration: 0.3, ease: "easeIn" },
  },
};

// =============================================================================
// Word Background Flash — gold flash on entry, settling to normal
// =============================================================================

export const wordBackgroundFlash = {
  flash: {
    background: [
      "rgba(255, 200, 0, 0.7)",
      "rgba(255, 200, 0, 0.4)",
      "rgba(0, 0, 0, 0.6)",
    ],
    transition: { duration: 0.8, times: [0, 0.3, 1] },
  },
};

// =============================================================================
// Word Used — shake + dim for "checked off" feel
// =============================================================================

export const WORD_USED_COLOR = "#001979";

export const wordUsedVariants: Variants = {
  unused: {
    x: 0,
    scale: 1,
    opacity: 1,
    color: WORD_ITEM_COLOR,
  },
  used: {
    x: [0, -6, 6, -3, 0],
    scale: 0.95,
    opacity: 0.5,
    color: WORD_USED_COLOR,
    transition: {
      x: { duration: 0.3, ease: "easeOut" },
      scale: { duration: 0.4, ease: "easeOut" },
      opacity: { duration: 0.6, delay: 0.2 },
      color: { duration: 0.15 },
    },
  },
};

// =============================================================================
// Title Entry — spring drop from above (intro + celebration)
// =============================================================================

export const titleEntryVariants: Variants = {
  initial: { y: -200, scale: 0.5, opacity: 0 },
  animate: {
    y: 0,
    scale: [0.5, 1.15, 1],
    opacity: 1,
    transition: {
      y: { type: "spring", stiffness: 200, damping: 12 },
      scale: { duration: 0.6, times: [0, 0.7, 1] },
      opacity: { duration: 0.3 },
    },
  },
  exit: {
    y: -400,
    scale: 0.5,
    opacity: 0,
    transition: { duration: 0.5, ease: "easeIn" },
  },
};

// =============================================================================
// Go Text — explosive entrance for "10 mots ! Go !"
// =============================================================================

export const goTextVariants: Variants = {
  initial: { scale: 0, opacity: 0, rotate: -5 },
  animate: {
    scale: [0, 1.5, 1],
    opacity: 1,
    rotate: [-5, 5, 0],
    transition: {
      scale: { duration: 0.5, times: [0, 0.6, 1], ease: "easeOut" },
      rotate: { duration: 0.5 },
      opacity: { duration: 0.2 },
    },
  },
  exit: {
    y: -300,
    opacity: 0,
    scale: 0.5,
    transition: { duration: 0.4, ease: "easeIn" },
  },
};

// =============================================================================
// List Shake — energetic horizontal shake
// =============================================================================

export const listShakeVariants: Variants = {
  idle: { x: 0 },
  shake: {
    x: [0, -10, 10, -8, 8, -5, 5, 0],
    transition: { duration: 0.6, repeat: 2 },
  },
};

// =============================================================================
// Breathing — subtle pulsing for waiting state
// =============================================================================

export const breathingVariants: Variants = {
  idle: { scale: 1, opacity: 1 },
  breathing: {
    scale: [1, 1.02, 1],
    opacity: [0.92, 1, 0.92],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// =============================================================================
// Letter Explosion — per-letter scatter for finale
// =============================================================================

export function letterExplodeVariant(index: number, totalLetters: number): Variants {
  const angle = (index / totalLetters) * 360 + (index * 137.5); // golden angle spread
  const distance = 150 + (index % 5) * 60;
  const rad = (angle * Math.PI) / 180;

  return {
    initial: { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 },
    explode: {
      x: Math.cos(rad) * distance,
      y: Math.sin(rad) * distance,
      rotate: (index % 2 === 0 ? 1 : -1) * (90 + index * 30),
      scale: 0,
      opacity: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };
}

// =============================================================================
// Sparkle — radiating particles from center
// =============================================================================

export function sparkleVariant(index: number, total: number): Variants {
  const angle = (index / total) * 360;
  const distance = 120 + (index % 3) * 40;
  const rad = (angle * Math.PI) / 180;

  return {
    initial: { x: 0, y: 0, opacity: 1, scale: 1 },
    animate: {
      x: Math.cos(rad) * distance,
      y: Math.sin(rad) * distance,
      opacity: 0,
      scale: 0,
      transition: { duration: 0.8, ease: "easeOut", delay: index * 0.03 },
    },
  };
}

// =============================================================================
// Overlay Fade Out — final fade for game end
// =============================================================================

export const overlayFadeOutVariants: Variants = {
  visible: { opacity: 1 },
  fadeOut: {
    opacity: 0,
    transition: { duration: 1, delay: 4 },
  },
};

// =============================================================================
// Celebration text glow — pulsing gold textShadow
// =============================================================================

export const CELEBRATION_GLOW_STYLE = {
  textShadow: "0 0 40px rgba(255, 200, 0, 0.8), 0 0 80px rgba(255, 200, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.5)",
};

export const GO_TEXT_STYLE = {
  background: "linear-gradient(135deg, #FF6347, #FF8C00, #FFD700)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  filter: "drop-shadow(0 4px 12px rgba(255, 99, 71, 0.5))",
};

// =============================================================================
// Letter Wobble — subtle floating effect per letter (infinite)
// =============================================================================

export function letterWobbleVariant(index: number): Variants {
  // Each letter gets a unique subtle float pattern
  const yOffset = 0.8 + (index % 3) * 0.3;
  const rotateOffset = 0.5 + (index % 2) * 0.3;
  const duration = 2.5 + (index % 4) * 0.4;

  return {
    initial: { y: 0, rotate: 0 },
    wobble: {
      y: [0, -yOffset, 0, yOffset * 0.5, 0],
      rotate: [0, rotateOffset, 0, -rotateOffset, 0],
      transition: {
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay: index * 0.08,
      },
    },
  };
}


// =============================================================================
// Sparkle colors
// =============================================================================

export const SPARKLE_COLORS = [
  "#FFD700", "#FF6347", "#00CED1", "#FF69B4", "#7B68EE",
  "#FFA500", "#00FF7F", "#FF4500", "#DA70D6", "#1E90FF",
  "#FFD700", "#FF6347",
];

// =============================================================================
// Confetti colors
// =============================================================================

export const CONFETTI_COLORS = ["#FFD700", "#FF6347", "#00CED1", "#FF69B4", "#7B68EE"];
