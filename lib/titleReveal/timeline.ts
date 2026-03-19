import gsap from "gsap";
import type { TitleRevealAnimConfig } from "./types";
import { TITLE_REVEAL_DEFAULTS } from "./animationDefaults";
import { buildOnionSkinDOM } from "./domBuilder";
import { animateLogo } from "./logoAnimation";
import { animateCharReveal } from "./charAnimation";
import { animateWobble } from "./wobbleAnimation";
import { animateDisappear } from "./disappearAnimation";
import { TITLE_REVEAL } from "@/lib/config/Constants";

// ---------------------------------------------------------------------------
// Orchestrator: builds the full title-reveal timeline
// ---------------------------------------------------------------------------

export interface BuildTimelineResult {
  timeline: gsap.core.Timeline;
  charWraps: HTMLElement[];
}

/**
 * Build the complete title-reveal animation inside `container`.
 *
 * Creates all necessary DOM (stage > logo + title), builds the onion-skin
 * character structure, then sequences: logo -> char reveal -> wobble -> disappear.
 *
 * The wobble phase duration adjusts based on config.duration while the
 * reveal and disappear phases use fixed timing from defaults.
 */
export function buildTimeline(
  container: HTMLElement,
  config: TitleRevealAnimConfig
): BuildTimelineResult {
  const defaults = TITLE_REVEAL_DEFAULTS;

  // ── Create DOM structure ──
  const stage = document.createElement("div");
  stage.className = "title-reveal-stage";

  const logoSrc = config.logoUrl ?? TITLE_REVEAL.DEFAULT_LOGO_URL;
  const logoImg = document.createElement("img");
  logoImg.className = "title-reveal-logo";
  logoImg.src = logoSrc;
  stage.appendChild(logoImg);

  const titleDiv = document.createElement("div");
  titleDiv.className = "title-reveal-title";
  titleDiv.style.fontFamily = `"${config.fontFamily}", cursive`;
  titleDiv.style.fontSize = `${config.fontSize}px`;
  titleDiv.style.color = config.colorText;
  titleDiv.style.transform = `rotate(${config.rotation}deg)`;
  stage.appendChild(titleDiv);

  container.appendChild(stage);

  // ── Build onion-skin character DOM ──
  const charWraps = buildOnionSkinDOM(titleDiv, config);

  // ── Create master timeline ──
  const tl = gsap.timeline();

  // Initial title state
  gsap.set(titleDiv, { opacity: 0 });

  // Logo animation
  animateLogo(tl, logoImg, defaults);

  // Character reveal
  animateCharReveal(tl, titleDiv, charWraps, defaults);

  // Wobble (idle motion)
  animateWobble(tl, charWraps, defaults);

  // Disappear
  const textEnd =
    defaults.textStart + charWraps.length * defaults.charStagger + 0.3;

  // Adjust disappear timing based on config.duration:
  // The wobble phase stretches/shrinks to fill the gap between text reveal
  // end and the disappear start. We compute the disappearAfter override so
  // that the total animation duration matches config.duration.
  const disappearPhaseDuration =
    charWraps.length * defaults.disappearCharStagger +
    defaults.disappearDuration +
    0.5;
  const desiredDisappearAfter = Math.max(
    0,
    config.duration - textEnd - disappearPhaseDuration
  );

  const adjustedDefaults = {
    ...defaults,
    disappearAfter: desiredDisappearAfter,
  };

  animateDisappear(tl, charWraps, textEnd, adjustedDefaults);

  // Hold until everything is gone
  const holdEnd =
    textEnd +
    desiredDisappearAfter +
    charWraps.length * defaults.disappearCharStagger +
    defaults.disappearDuration +
    0.5;
  tl.set({}, {}, Math.max(holdEnd, config.duration));

  return { timeline: tl, charWraps };
}

/**
 * Kill a timeline and all its child tweens.
 */
export function destroyTimeline(tl: gsap.core.Timeline): void {
  tl.kill();
}
