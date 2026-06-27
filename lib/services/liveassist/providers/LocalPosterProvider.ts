import type { ActionProvider, ApplyResult, BuiltSuggestion } from "./ActionProvider";
import type { MatchablePoster } from "../LocalPosterMatcher";

/** Shows an existing poster on the program overlay on the given side. */
export type PosterShower = (payload: {
  posterId: string;
  fileUrl: string;
  type: string;
  side: "left" | "right";
  transition: "fade";
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
    return {
      intent: "local-poster",
      entity: poster.id, // stable dedup key
      title: poster.title,
      preview: imageUrl ? { kind: "image", imageUrl } : { kind: "text", text: `🖼️ ${poster.title}` },
      triggerExcerpt: triggerText,
      applyPayload: { posterId: poster.id, fileUrl: poster.fileUrl, type: poster.type },
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
    return this.showPoster({ posterId, fileUrl, type, side, transition: "fade" });
  }
}
