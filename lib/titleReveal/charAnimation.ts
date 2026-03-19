import gsap from "gsap";
import type { AnimationDefaults } from "./types";

// ---------------------------------------------------------------------------
// Character reveal animation: ghost layers + main letter stagger
// ---------------------------------------------------------------------------

export function animateCharReveal(
  tl: gsap.core.Timeline,
  titleEl: HTMLElement,
  charWraps: HTMLElement[],
  defaults: AnimationDefaults
): void {
  // Set all char layers to invisible initially
  charWraps.forEach((wrap) => {
    const ghostBlue = wrap.querySelector(".ghost-blue") as HTMLElement;
    const ghostNavy = wrap.querySelector(".ghost-navy") as HTMLElement;
    const main = wrap.querySelector(".char") as HTMLElement;
    gsap.set([ghostBlue, ghostNavy, main], { opacity: 0 });
  });

  // Show title container at TEXT_START
  tl.set(titleEl, { opacity: 1 }, defaults.textStart);

  // Stagger each character's three-layer reveal
  charWraps.forEach((wrap, i) => {
    const ghostBlue = wrap.querySelector(".ghost-blue") as HTMLElement;
    const ghostNavy = wrap.querySelector(".ghost-navy") as HTMLElement;
    const main = wrap.querySelector(".char") as HTMLElement;

    const t = defaults.textStart + i * defaults.charStagger;

    // Ghost blue: fly in then fade out
    tl.fromTo(
      ghostBlue,
      defaults.ghostBlueFrom,
      {
        ...defaults.ghostBlueTo,
        duration: defaults.ghostBlueInDuration,
        ease: "power2.out",
      },
      t
    ).to(
      ghostBlue,
      {
        opacity: 0,
        scale: 1,
        x: 0,
        y: 0,
        duration: defaults.ghostBlueOutDuration,
        ease: "power1.in",
      },
      t + defaults.ghostBlueOutDelay
    );

    // Ghost navy: fly in then fade out
    tl.fromTo(
      ghostNavy,
      defaults.ghostNavyFrom,
      {
        ...defaults.ghostNavyTo,
        duration: defaults.ghostNavyInDuration,
        ease: "power2.out",
      },
      t + defaults.ghostNavyDelay
    ).to(
      ghostNavy,
      {
        opacity: 0,
        scale: 1,
        x: 0,
        y: 0,
        duration: defaults.ghostNavyOutDuration,
        ease: "power1.in",
      },
      t + defaults.ghostNavyOutDelay
    );

    // Main letter: fly in to final position
    tl.fromTo(
      main,
      defaults.mainFrom,
      {
        ...defaults.mainTo,
        duration: defaults.mainDuration,
        ease: "power2.out",
      },
      t + defaults.mainDelay
    );
  });
}
