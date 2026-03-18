import type { Variants } from "framer-motion";

/** Slide in from right, fade in */
export const wordEntryVariants: Variants = {
  initial: { x: 100, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
  exit: {
    x: 100,
    opacity: 0,
    transition: { duration: 0.3, ease: "easeIn" },
  },
};

/** Strike-through style for used words (handled via CSS, but exit animation available) */
export const wordStrikeVariants: Variants = {
  initial: { x: 100, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
  exit: {
    x: 100,
    opacity: 0,
    transition: { duration: 0.3, ease: "easeIn" },
  },
};

/** Scale pulse for celebration text */
export const celebrationVariants: Variants = {
  initial: { scale: 1, opacity: 0 },
  animate: {
    scale: [1, 1.3, 1],
    opacity: [0, 1, 1],
    transition: {
      duration: 0.8,
      type: "spring",
      stiffness: 200,
      damping: 15,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.3, ease: "easeIn" },
  },
};
