import type { ActionProvider, ApplyResult, BuiltSuggestion } from "./ActionProvider";
import type { MatchablePoster } from "../LocalPosterMatcher";

/** Shows an existing poster on the program overlay on the given side. */
export type PosterShower = (payload: {
  posterId: string;
  fileUrl: string;
  type: string;
  side: "left" | "right";
  transition: "fade";
  // Sub-video clip fields (only set for a matched video clip) — accepted by
  // posterShowPayloadSchema and honored by the overlay.
  startTime?: number;
  endTime?: number;
  endBehavior?: "stop" | "loop";
  chapters?: unknown[];
}) => Promise<ApplyResult>;

/** Ensures a poster is enabled (so it appears in the Affiches panel). */
export type PosterEnabler = (posterId: string) => Promise<ApplyResult>;

/**
 * Surfaces a poster ALREADY in the library when the host names it, and shows it
 * on the poster overlay on validate. Unlike the Wikipedia/TMDB providers it does
 * NOT create a poster — and its suggestions come from the fuzzy fast-path
 * (LocalPosterMatcher in the orchestrator's ingestSegment), not the LLM, so
 * `build()` is unused.
 */
export class LocalPosterProvider implements ActionProvider {
  readonly id = "local-poster";
  readonly description = "Afficher une affiche déjà présente dans la bibliothèque, citée en direct";
  readonly defaultKeywords: string[] = [];

  constructor(
    private readonly showPoster: PosterShower,
    private readonly enablePoster: PosterEnabler,
  ) {}

  /** Unused: LocalPoster suggestions are produced by the fast-path matcher, not the LLM. */
  async build(): Promise<BuiltSuggestion | null> {
    return null;
  }

  /** Build a suggestion directly from a fuzzy-matched poster. */
  static toSuggestion(poster: MatchablePoster, triggerText: string, score: number): BuiltSuggestion {
    const imageUrl = poster.thumbnailUrl ?? (poster.type === "image" ? poster.fileUrl : undefined);
    const applyPayload: Record<string, unknown> = {
      posterId: poster.id,
      fileUrl: poster.fileUrl,
      type: poster.type,
    };
    // Carry the saved sub-video clip range/chapters so applying a matched clip honors
    // its bounds instead of playing the raw file from the start (parity with PosterCard).
    if (poster.type === "video") {
      if (poster.startTime != null) applyPayload.startTime = poster.startTime;
      if (poster.endTime != null) applyPayload.endTime = poster.endTime;
      if (poster.endBehavior) applyPayload.endBehavior = poster.endBehavior;
      const chapters = (poster.metadata as { chapters?: unknown } | null | undefined)?.chapters;
      if (Array.isArray(chapters) && chapters.length) applyPayload.chapters = chapters;
    }
    return {
      intent: "local-poster",
      entity: poster.id, // stable dedup key
      title: poster.title,
      preview: imageUrl ? { kind: "image", imageUrl } : { kind: "text", text: `🖼️ ${poster.title}` },
      triggerExcerpt: triggerText,
      applyPayload,
      confidence: Math.max(0, Math.min(1, score)),
    };
  }

  async apply(payload: Record<string, unknown>): Promise<ApplyResult> {
    const posterId = typeof payload.posterId === "string" ? payload.posterId : "";
    const fileUrl = typeof payload.fileUrl === "string" ? payload.fileUrl : "";
    const type = typeof payload.type === "string" ? payload.type : "image";
    if (!fileUrl) return { ok: false, message: "Affiche introuvable." };
    // `target` carries the chosen side (the only client-trusted field).
    const side = payload.target === "right" ? "right" : "left";
    // Add it to the Affiches panel: ensure the poster is enabled (idempotent) before
    // showing it — a matched poster may be disabled in the library.
    if (posterId) await this.enablePoster(posterId);
    // Forward the sub-video clip fields the suggestion carried (absent for images).
    const clip: { startTime?: number; endTime?: number; endBehavior?: "stop" | "loop"; chapters?: unknown[] } = {};
    if (typeof payload.startTime === "number") clip.startTime = payload.startTime;
    if (typeof payload.endTime === "number") clip.endTime = payload.endTime;
    if (payload.endBehavior === "stop" || payload.endBehavior === "loop") clip.endBehavior = payload.endBehavior;
    if (Array.isArray(payload.chapters)) clip.chapters = payload.chapters;
    return this.showPoster({ posterId, fileUrl, type, side, transition: "fade", ...clip });
  }
}
