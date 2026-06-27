import { z } from "zod";
import { generateObject } from "ai";
import { createAiModel } from "@/lib/services/ai/AiProviderFactory";
import { Logger } from "@/lib/utils/Logger";

const logger = new Logger("IntentExtractor");

export type IntentExtraction = {
  actionnable: boolean;
  intent: string;
  entite: string;
  confiance: number;
  /** True when the entity was DEDUCED from clues (not explicitly named); gated stricter. */
  infere: boolean;
};

export type GenerateObjectFn = (args: {
  schema: z.ZodTypeAny;
  prompt: string;
}) => Promise<{ object: unknown }>;

const NOT_ACTIONNABLE: IntentExtraction = { actionnable: false, intent: "none", entite: "", confiance: 0, infere: false };

const defaultGenerate: GenerateObjectFn = ({ schema, prompt }) =>
  generateObject({ model: createAiModel(), schema, prompt });

export class IntentExtractor {
  private readonly schema: z.ZodTypeAny;

  private contextPrompts: Record<string, string>;

  constructor(
    providerIds: string[],
    private readonly descriptions: Record<string, string>,
    private readonly generate: GenerateObjectFn = defaultGenerate,
    contextPrompts: Record<string, string> = {},
  ) {
    this.contextPrompts = contextPrompts;
    this.schema = z.object({
      actionnable: z.boolean(),
      // "none" first so TS infers [string, ...string[]] (a leading spread infers [...string[], string], which won't cast).
      intent: z.enum(["none", ...providerIds] as [string, ...string[]]),
      entite: z.string(),
      // No optional fields and no numeric min/max: OpenAI structured-outputs (strict
      // mode) requires every property in `required` and rejects unsupported keywords.
      // The confidence range is enforced by the orchestrator's threshold check instead.
      confiance: z.number(),
      // True when entite was DEDUCED from clues rather than explicitly named.
      infere: z.boolean(),
    });
  }

  /** Replace the per-provider context prompts (called when Settings change, live). */
  setContextPrompts(contextPrompts: Record<string, string>): void {
    this.contextPrompts = contextPrompts;
  }

  async extract(windowText: string, candidateProviderIds: string[]): Promise<IntentExtraction> {
    // Each candidate contributes its description plus, when present, an adapted
    // "Règle" telling the model how to form the entity for THAT source (Wikipedia
    // théâtre vs TMDB cinéma vs definition). This replaces the old hard-coded
    // poster rule so a new provider is fully described by its own config.
    const catalogue = candidateProviderIds
      .map((id) => {
        const rule = this.contextPrompts[id];
        return `- ${id} : ${this.descriptions[id] ?? id}${rule ? `\n    Règle : ${rule}` : ""}`;
      })
      .join("\n");

    const prompt = [
      "Tu assistes la régie d'une émission en direct. Tu analyses un extrait de transcription (parole, donc bruitée — ignore les artefacts type « Sous-titrage ST'501 »).",
      "Objectif : dès qu'une entité correspondant à un des INTENTS CANDIDATS est CITÉE — même sans demande explicite, même au détour d'une phrase — on la signale pour enrichir l'antenne.",
      "",
      `INTENTS CANDIDATS :\n${catalogue}`,
      "",
      "Règles :",
      "- Si une entité correspondant à un intent candidat est citée — OU, lorsque sa « Règle » l'autorise, déductible des indices — → actionnable=true, intent = l'id exact de l'intent candidat, entite = l'entité formée selon la « Règle » de cet intent.",
      '- Sinon (rien de clair, trop vague, ou hors-sujet) → actionnable=false, intent="none", entite="".',
      '- N\'utilise JAMAIS intent="none" lorsque actionnable=true.',
      "- confiance ∈ [0,1] = ta certitude.",
      "- infere = true UNIQUEMENT si tu as DÉDUIT l'entité (non nommée explicitement, devinée d'après les indices) ; false si elle était citée telle quelle.",
      "",
      `Transcription :\n"""${windowText}"""`,
    ].join("\n");

    try {
      const { object } = await this.generate({ schema: this.schema, prompt });
      // Default `infere` to false when the model omitted it: non-strict providers
      // (e.g. a local Ollama model) may not honor the required field, and its
      // absence alone shouldn't collapse an otherwise-valid extraction back to
      // NOT_ACTIONNABLE (the pre-`infere` behavior). Other required fields stay enforced.
      const candidate =
        object && typeof object === "object" ? { infere: false, ...(object as object) } : object;
      const parsed = this.schema.safeParse(candidate);
      if (!parsed.success) return NOT_ACTIONNABLE;
      const result = parsed.data as IntentExtraction;
      // Only act on an intent that was a candidate for THIS window.
      if (result.actionnable && !candidateProviderIds.includes(result.intent)) {
        return NOT_ACTIONNABLE;
      }
      // The output schema carries no numeric bounds (OpenAI strict mode), so the
      // model can return confiance outside [0,1] (e.g. a 0–100 scale). Clamp it:
      // an unbounded value would defeat the orchestrator's threshold gate and
      // violate SuggestionSchema's confidence.max(1) once stored.
      const confiance = Number.isFinite(result.confiance) ? Math.max(0, Math.min(1, result.confiance)) : 0;
      return { ...result, confiance };
    } catch (error) {
      logger.warn(`extraction failed, treating as non-actionnable: ${error instanceof Error ? error.message : error}`);
      return NOT_ACTIONNABLE;
    }
  }
}
