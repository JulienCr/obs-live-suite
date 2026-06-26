import { LIVE_ASSIST } from "@/lib/config/Constants";
import { Logger } from "@/lib/utils/Logger";
import type { ActionProvider, ApplyResult, BuiltSuggestion, TranscriptWindow } from "./ActionProvider";

const logger = new Logger("PosterActionProvider");

export type Resolver = {
  resolveAndFetch(q: string): Promise<{ title: string; extract: string; thumbnail?: string }>;
};
export type PosterCreator = (input: { title: string; fileUrl: string }) => Promise<ApplyResult>;

export class PosterActionProvider implements ActionProvider {
  readonly id = "poster";
  readonly description = "Trouver l'affiche d'un spectacle/film/concert cité et l'ajouter aux posters";
  readonly defaultKeywords = LIVE_ASSIST.DEFAULT_KEYWORDS.poster;

  constructor(private readonly resolver: Resolver, private readonly createPoster: PosterCreator) {}

  async build(entity: string, window: TranscriptWindow): Promise<BuiltSuggestion | null> {
    let result;
    try {
      result = await this.resolver.resolveAndFetch(entity);
    } catch (error) {
      logger.info(`no Wikipedia result for "${entity}": ${error instanceof Error ? error.message : error}`);
      return null;
    }

    // Wikipedia titles carry disambiguators like "Titanic (film, 1997)" — strip the
    // trailing parenthetical for a clean poster title while keeping the matched image.
    const title = result.title.replace(/\s*\([^)]*\)\s*$/, "").trim() || result.title;

    const base = {
      intent: this.id,
      entity,
      title,
      triggerExcerpt: window.text,
      confidence: 0,
    };

    if (result.thumbnail) {
      return {
        ...base,
        preview: { kind: "image", imageUrl: result.thumbnail },
        applyPayload: { title, fileUrl: result.thumbnail },
      };
    }
    // No image → propose manual search rather than nothing.
    return {
      ...base,
      preview: {
        kind: "text",
        text: `Affiche introuvable automatiquement. Recherche : https://www.google.com/search?tbm=isch&q=${encodeURIComponent(title + " affiche")}`,
      },
      applyPayload: { title },
    };
  }

  async apply(payload: Record<string, unknown>): Promise<ApplyResult> {
    const title = typeof payload.title === "string" ? payload.title : "";
    const fileUrl = typeof payload.fileUrl === "string" ? payload.fileUrl : "";
    if (!title || !fileUrl) return { ok: false, message: "Pas d'image à enregistrer (recherche manuelle)." };
    return this.createPoster({ title, fileUrl });
  }
}
