import gsap from "gsap";
import type { AnimationDefaults } from "./types";

// ---------------------------------------------------------------------------
// Per-character idle wobble animation
// ---------------------------------------------------------------------------

export function animateWobble(
  tl: gsap.core.Timeline,
  charWraps: HTMLElement[],
  defaults: AnimationDefaults
): void {
  charWraps.forEach((wrap, i) => {
    const wobbleStart =
      defaults.textStart +
      i * defaults.charStagger +
      defaults.mainDelay +
      defaults.mainDuration;

    tl.call(
      () => {
        const dur =
          defaults.wobbleDurationMin +
          Math.random() *
            (defaults.wobbleDurationMax - defaults.wobbleDurationMin);
        const rot =
          (Math.random() - 0.5) * 2 * defaults.wobbleRotationRange;
        const yDrift =
          (Math.random() - 0.5) * 2 * defaults.wobbleYRange;

        gsap.to(wrap, {
          rotation: rot,
          y: yDrift,
          duration: dur,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      },
      [],
      wobbleStart
    );
  });
}
