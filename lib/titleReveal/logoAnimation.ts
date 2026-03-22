import gsap from "gsap";
import type { AnimationDefaults } from "./types";

// ---------------------------------------------------------------------------
// Logo animation: scale-in from large, rotate, then fade out
// ---------------------------------------------------------------------------

export function animateLogo(
  tl: gsap.core.Timeline,
  logoEl: HTMLElement,
  defaults: AnimationDefaults
): void {
  // Initial state
  gsap.set(logoEl, {
    scale: defaults.logoInitialScale,
    filter: `blur(${defaults.logoInitialBlur}px)`,
    opacity: 1,
    rotation: defaults.logoInitialRotation,
  });

  // Scale down + deblur
  tl.to(logoEl, {
    scale: defaults.logoFinalScale,
    filter: "blur(0px)",
    duration: defaults.logoScaleDuration,
    ease: defaults.logoScaleEase,
  });

  // Rotation (separate ease, same start time)
  tl.to(
    logoEl,
    {
      rotation: defaults.logoFinalRotation,
      duration: defaults.logoScaleDuration,
      ease: defaults.logoRotationEase,
    },
    0
  );

  // Opacity: hold then fade
  tl.to(
    logoEl,
    {
      opacity: defaults.logoOpacityHold,
      duration: defaults.logoOpacityHoldDuration,
      ease: "none",
    },
    0
  );
  tl.to(
    logoEl,
    {
      opacity: 0,
      duration: defaults.logoFadeDuration,
      ease: defaults.logoFadeEase,
    },
    defaults.logoOpacityHoldDuration
  );
}
