// ---------------------------------------------------------------------------
// Barrel export for the title-reveal animation engine
// ---------------------------------------------------------------------------

export { buildTimeline, destroyTimeline } from "./timeline";
export type { BuildTimelineResult } from "./timeline";

export { buildOnionSkinDOM } from "./domBuilder";
export { animateDisappearStandalone } from "./disappearAnimation";
export { loadGoogleFont } from "./fontLoader";
export { TITLE_REVEAL_DEFAULTS } from "./animationDefaults";

export type {
  TitleRevealAnimConfig,
  AnimationDefaults,
} from "./types";
