import type { Variants } from "framer-motion";

/**
 * Shared Framer Motion transition variants for poster overlays.
 *
 * `posterTransitionVariants` is used by PosterRenderer (side-positioned poster).
 * `bigPictureTransitionVariants` is used by BigPicturePosterRenderer (centered poster).
 *
 * The only difference is the slide initial offset:
 *   - Poster uses y: "-100%" (full off-screen slide)
 *   - BigPicture uses y: -50 (subtle slide)
 */

const sharedFade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const sharedCut: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.1, ease: "linear" } },
  exit: { opacity: 0, transition: { duration: 0.1, ease: "linear" } },
};

const sharedBlur: Variants = {
  initial: { opacity: 0, filter: "blur(20px)" },
  animate: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.8, ease: "easeOut" } },
  exit: { opacity: 0, filter: "blur(20px)", transition: { duration: 0.5, ease: "easeIn" } },
};

/** Framer Motion variants for the side-positioned poster overlay */
export const posterTransitionVariants: Record<string, Variants> = {
  fade: sharedFade,
  slide: {
    initial: { opacity: 0, y: "-100%" },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
    exit: { opacity: 0, transition: { duration: 0.5, ease: "easeOut" } },
  },
  cut: sharedCut,
  blur: sharedBlur,
};

/** Framer Motion variants for the big-picture (centered) poster overlay */
export const bigPictureTransitionVariants: Record<string, Variants> = {
  fade: sharedFade,
  slide: {
    initial: { opacity: 0, y: -50 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
    exit: { opacity: 0, transition: { duration: 0.5, ease: "easeOut" } },
  },
  cut: sharedCut,
  blur: sharedBlur,
};
