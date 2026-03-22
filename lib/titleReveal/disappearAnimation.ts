import gsap from "gsap";
import type { AnimationDefaults } from "./types";

// ---------------------------------------------------------------------------
// Disappear animation: letters recede into distance
// ---------------------------------------------------------------------------

/**
 * Add disappear tweens to an existing timeline.
 */
export function animateDisappear(
  tl: gsap.core.Timeline,
  charWraps: HTMLElement[],
  textEnd: number,
  defaults: AnimationDefaults
): void {
  const disappearStart = textEnd + defaults.disappearAfter;

  charWraps.forEach((wrap, i) => {
    const main = wrap.querySelector(".char") as HTMLElement;
    const t = disappearStart + i * defaults.disappearCharStagger;

    tl.to(
      main,
      {
        scale: defaults.disappearFinalScale,
        opacity: 0,
        duration: defaults.disappearDuration,
        ease: defaults.disappearEase,
      },
      t
    );
  });
}

/**
 * Create a standalone disappear timeline (for manual hide).
 */
export function animateDisappearStandalone(
  charWraps: HTMLElement[],
  defaults: AnimationDefaults
): gsap.core.Timeline {
  const tl = gsap.timeline();

  charWraps.forEach((wrap, i) => {
    const main = wrap.querySelector(".char") as HTMLElement;
    const t = i * defaults.disappearCharStagger;

    tl.to(
      main,
      {
        scale: defaults.disappearFinalScale,
        opacity: 0,
        duration: defaults.disappearDuration,
        ease: defaults.disappearEase,
      },
      t
    );
  });

  return tl;
}
