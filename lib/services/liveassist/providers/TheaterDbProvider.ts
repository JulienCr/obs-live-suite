import type { ActionProvider, ApplyResult, BuiltSuggestion } from "./ActionProvider";
import type { PosterShower } from "./LocalPosterProvider";
import type { TheatreCandidate } from "@/lib/services/TheaterDataResolverService";

/**
 * Creates a poster from a theater-data candidate (downloads its image locally) and returns
 * the created row so the caller can then show it. Wired in liveAssistBoot to `POST /api/assets/posters`
 * with `downloadToLocal:true` + `tags:["theatre"]` (parity with the manual add-poster path).
 */
export type PosterCreator = (input: {
  title: string;
  fileUrl: string;
  description?: string;
  metadata?: Record<string, unknown>;
}) => Promise<{ ok: boolean; message?: string; poster?: { id: string; fileUrl: string } }>;

/**
 * The REMOTE sibling of {@link LocalPosterProvider}: surfaces a poster from the theater-data
 * (BilletReduc) base :4173 when the host names a show NOT yet in the library. Its suggestions
 * come from the NON-LLM {@link TheaterDbMatcher} fast-path (in the orchestrator's ingestSegment),
 * not the extractor, so `build()` is unused.
 *
 * `apply()` (Valider) does two steps: it CREATES the poster locally (downloading the affiche),
 * then SHOWS it on the program overlay on the chosen side — the "live" one-gesture flow.
 */
export class TheaterDbProvider implements ActionProvider {
  readonly id = "theater-db";
  readonly description = "Afficher l'affiche d'un spectacle cité, depuis la base BilletReduc (theater-data)";
  readonly defaultKeywords: string[] = [];

  constructor(
    private readonly createPoster: PosterCreator,
    private readonly showPoster: PosterShower,
  ) {}

  /** Unused: theater-db suggestions are produced by the fast-path matcher, not the LLM. */
  async build(): Promise<BuiltSuggestion | null> {
    return null;
  }

  /** Build a suggestion directly from a theater-data candidate. */
  static toSuggestion(candidate: TheatreCandidate, triggerText: string, score: number): BuiltSuggestion {
    return {
      intent: "theater-db",
      entity: String(candidate.id), // stable dedup key = the theater-data show id
      title: candidate.title,
      preview: { kind: "image", imageUrl: candidate.posterUrl },
      triggerExcerpt: triggerText,
      applyPayload: {
        theatreId: candidate.id,
        title: candidate.title,
        fileUrl: candidate.posterUrl,
        tagline: candidate.tagline,
      },
      confidence: Math.max(0, Math.min(1, score)),
    };
  }

  async apply(payload: Record<string, unknown>): Promise<ApplyResult> {
    const title = typeof payload.title === "string" ? payload.title : "";
    const fileUrl = typeof payload.fileUrl === "string" ? payload.fileUrl : ""; // remote posterUrl
    if (!title || !fileUrl) return { ok: false, message: "Affiche théâtre incomplète." };
    const tagline = typeof payload.tagline === "string" && payload.tagline ? payload.tagline : undefined;

    // 1) Create it in the library (downloads the image locally, tags it "theatre").
    const created = await this.createPoster({
      title,
      fileUrl,
      description: tagline,
      metadata: { theatreId: payload.theatreId, source: "theater-data" },
    });
    if (!created.ok || !created.poster) {
      return { ok: false, message: created.message ?? "Création de l'affiche échouée." };
    }

    // 2) Show it on-air on the chosen side (`target` is the only client-trusted field).
    const side = payload.target === "right" ? "right" : "left";
    return this.showPoster({
      posterId: created.poster.id,
      fileUrl: created.poster.fileUrl, // local URL after downloadToLocal
      type: "image",
      side,
      transition: "fade",
    });
  }
}
