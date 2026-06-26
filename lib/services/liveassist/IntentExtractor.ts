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
};

export type GenerateObjectFn = (args: {
  schema: z.ZodTypeAny;
  prompt: string;
}) => Promise<{ object: unknown }>;

const NOT_ACTIONNABLE: IntentExtraction = { actionnable: false, intent: "none", entite: "", confiance: 0 };

const defaultGenerate: GenerateObjectFn = ({ schema, prompt }) =>
  generateObject({ model: createAiModel(), schema, prompt });

export class IntentExtractor {
  private readonly schema: z.ZodTypeAny;

  constructor(
    providerIds: string[],
    private readonly descriptions: Record<string, string>,
    private readonly generate: GenerateObjectFn = defaultGenerate,
  ) {
    this.schema = z.object({
      actionnable: z.boolean(),
      // "none" first so TS infers [string, ...string[]] (a leading spread infers [...string[], string], which won't cast).
      intent: z.enum(["none", ...providerIds] as [string, ...string[]]),
      entite: z.string(),
      // No optional fields and no numeric min/max: OpenAI structured-outputs (strict
      // mode) requires every property in `required` and rejects unsupported keywords.
      // The confidence range is enforced by the orchestrator's threshold check instead.
      confiance: z.number(),
    });
  }

  async extract(windowText: string, candidateProviderIds: string[]): Promise<IntentExtraction> {
    const catalogue = candidateProviderIds
      .map((id) => `- ${id} : ${this.descriptions[id] ?? id}`)
      .join("\n");

    const prompt = [
      "Tu assistes la régie d'une émission en direct. Tu analyses un extrait de transcription (parole, donc bruitée — ignore les artefacts type « Sous-titrage ST'501 »).",
      "Objectif : dès qu'une entité correspondant à un des INTENTS CANDIDATS est CITÉE — même sans demande explicite, même au détour d'une phrase — on la signale pour enrichir l'antenne.",
      "",
      `INTENTS CANDIDATS :\n${catalogue}`,
      "",
      "Règles :",
      "- Si une entité claire correspondant à un intent candidat est citée (p. ex. un titre de film / spectacle / pièce / concert pour « poster » ; un sujet à définir pour « definition ») → actionnable=true, intent = l'id exact de l'intent candidat, entite = le titre/sujet exact sans article. Pour « poster », ajoute le type entre parenthèses pour viser le bon article Wikipédia : « Titanic (film) », « Roméo et Juliette (pièce de théâtre) », « Les Bronzés font du ski (film) ».",
      '- Sinon (rien de clair, trop vague, ou hors-sujet) → actionnable=false, intent="none", entite="".',
      '- N\'utilise JAMAIS intent="none" lorsque actionnable=true.',
      "- confiance ∈ [0,1] = ta certitude.",
      "",
      `Transcription :\n"""${windowText}"""`,
    ].join("\n");

    try {
      const { object } = await this.generate({ schema: this.schema, prompt });
      const parsed = this.schema.safeParse(object);
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
