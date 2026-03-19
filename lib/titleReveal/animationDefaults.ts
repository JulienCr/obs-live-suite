import type { AnimationDefaults } from "./types";

// ---------------------------------------------------------------------------
// All animation constants extracted from the original animation.ts
// ---------------------------------------------------------------------------

export const TITLE_REVEAL_DEFAULTS: AnimationDefaults = {
  // Logo
  logoInitialScale: 20,
  logoInitialBlur: 30,
  logoInitialRotation: -55,
  logoFinalScale: 0.02,
  logoFinalRotation: 10,
  logoScaleDuration: 2.0,
  logoScaleEase: "power4.out",
  logoRotationEase: "power1.out",
  logoOpacityHold: 0.95,
  logoOpacityHoldDuration: 0.9,
  logoFadeDuration: 0.5,
  logoFadeEase: "power3.in",

  // Text reveal
  textStart: 1.0,
  charStagger: 0.055,

  // Onion-skin: ghost blue (light)
  ghostBlueFrom: { opacity: 0, scale: 1.8, x: -15, y: -10 },
  ghostBlueTo: { opacity: 0.6, scale: 1.2, x: -5, y: -3 },
  ghostBlueInDuration: 0.08,
  ghostBlueOutDelay: 0.06,
  ghostBlueOutDuration: 0.1,

  // Onion-skin: ghost navy (dark)
  ghostNavyFrom: { opacity: 0, scale: 1.4, x: -8, y: -5 },
  ghostNavyTo: { opacity: 0.85, scale: 1.1, x: -2, y: -1 },
  ghostNavyDelay: 0.03,
  ghostNavyInDuration: 0.08,
  ghostNavyOutDelay: 0.1,
  ghostNavyOutDuration: 0.1,

  // Onion-skin: main letter (orange)
  mainFrom: { opacity: 0, scale: 1.3, x: -5, y: -3 },
  mainTo: { opacity: 1, scale: 1, x: 0, y: 0 },
  mainDelay: 0.06,
  mainDuration: 0.14,

  // Letter wobble
  wobbleRotationRange: 4,
  wobbleYRange: 3,
  wobbleDurationMin: 0.8,
  wobbleDurationMax: 2.0,

  // Disappear
  disappearAfter: 3.0,
  disappearCharStagger: 0.04,
  disappearDuration: 0.6,
  disappearFinalScale: 0.4,
  disappearOpacityHold: 0.6,
  disappearEase: "power4.out",

  // Hold
  holdMinEnd: 8.5,
};
