// ---------------------------------------------------------------------------
// Shared types for the title-reveal animation engine
// ---------------------------------------------------------------------------

import type { TitleLine } from "@/lib/models/TitleReveal";

export interface TitleRevealAnimConfig {
  lines: TitleLine[];
  logoUrl: string | null;
  fontFamily: string;
  fontSize: number;
  rotation: number;
  colorText: string;
  colorGhostBlue: string;
  colorGhostNavy: string;
  duration: number;
}

export interface AnimationDefaults {
  // Logo
  logoInitialScale: number;
  logoInitialBlur: number;
  logoInitialRotation: number;
  logoFinalScale: number;
  logoFinalRotation: number;
  logoScaleDuration: number;
  logoScaleEase: string;
  logoRotationEase: string;
  logoOpacityHold: number;
  logoOpacityHoldDuration: number;
  logoFadeDuration: number;
  logoFadeEase: string;

  // Text reveal
  textStart: number;
  charStagger: number;

  // Ghost blue
  ghostBlueFrom: { opacity: number; scale: number; x: number; y: number };
  ghostBlueTo: { opacity: number; scale: number; x: number; y: number };
  ghostBlueInDuration: number;
  ghostBlueOutDelay: number;
  ghostBlueOutDuration: number;

  // Ghost navy
  ghostNavyFrom: { opacity: number; scale: number; x: number; y: number };
  ghostNavyTo: { opacity: number; scale: number; x: number; y: number };
  ghostNavyDelay: number;
  ghostNavyInDuration: number;
  ghostNavyOutDelay: number;
  ghostNavyOutDuration: number;

  // Main letter
  mainFrom: { opacity: number; scale: number; x: number; y: number };
  mainTo: { opacity: number; scale: number; x: number; y: number };
  mainDelay: number;
  mainDuration: number;

  // Wobble
  wobbleRotationRange: number;
  wobbleYRange: number;
  wobbleDurationMin: number;
  wobbleDurationMax: number;

  // Disappear
  disappearAfter: number;
  disappearCharStagger: number;
  disappearDuration: number;
  disappearFinalScale: number;
  disappearOpacityHold: number;
  disappearEase: string;

  // Hold
  holdMinEnd: number;
}
