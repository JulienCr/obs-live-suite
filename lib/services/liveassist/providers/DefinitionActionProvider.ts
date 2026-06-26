import { LIVE_ASSIST } from "@/lib/config/Constants";
import { Logger } from "@/lib/utils/Logger";
import type { ActionProvider, ApplyResult, BuiltSuggestion, TranscriptWindow } from "./ActionProvider";
import { resolveOrNull, type Resolver } from "./PosterActionProvider";

const logger = new Logger("DefinitionActionProvider");
export type OnAir = (text: string) => Promise<ApplyResult>;

/** Keep the first `n` sentences of an extract (cheap, no extra LLM call). */
function firstSentences(text: string, n: number): string {
  const parts = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  return parts.slice(0, n).join("").trim();
}

export class DefinitionActionProvider implements ActionProvider {
  readonly id = "definition";
  readonly description = "Donner une définition / du contexte sur un sujet évoqué";
  readonly defaultKeywords = LIVE_ASSIST.DEFAULT_KEYWORDS.definition;

  constructor(
    private readonly resolver: Resolver,
    private readonly onAir: OnAir,
    private readonly maxSentences = 3,
  ) {}

  async build(entity: string, window: TranscriptWindow): Promise<BuiltSuggestion | null> {
    const result = await resolveOrNull(this.resolver, entity, logger);
    if (!result) return null;
    const text = firstSentences(result.extract, this.maxSentences);
    return {
      intent: this.id,
      entity,
      title: result.title,
      preview: { kind: "text", text },
      triggerExcerpt: window.text,
      applyPayload: { target: "pin", text },
      confidence: 0,
    };
  }

  async apply(payload: Record<string, unknown>): Promise<ApplyResult> {
    const target = payload.target === "on-air" ? "on-air" : "pin";
    const text = typeof payload.text === "string" ? payload.text : "";
    if (target === "pin") return { ok: true };
    if (!text) return { ok: false, message: "Texte vide." };
    return this.onAir(text);
  }
}
