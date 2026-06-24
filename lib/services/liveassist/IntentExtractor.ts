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
  raison?: string;
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
    private readonly providerIds: string[],
    private readonly descriptions: Record<string, string>,
    private readonly generate: GenerateObjectFn = defaultGenerate,
  ) {
    this.schema = z.object({
      actionnable: z.boolean(),
      // "none" first so TS infers [string, ...string[]] (a leading spread infers [...string[], string], which won't cast).
      intent: z.enum(["none", ...providerIds] as [string, ...string[]]),
      entite: z.string(),
      confiance: z.number().min(0).max(1),
      raison: z.string().optional(),
    });
  }

  async extract(windowText: string, candidateProviderIds: string[]): Promise<IntentExtraction> {
    const catalogue = candidateProviderIds
      .map((id) => `- ${id} : ${this.descriptions[id] ?? id}`)
      .join("\n");

    const prompt = [
      "Tu analyses une transcription de plateau TV en français (parole, donc bruitée).",
      "Détermine s'il y a UNE action concrète à proposer parmi les intents candidats ci-dessous.",
      "Extrais l'entité concernée (titre de spectacle/film, sujet à définir). Si rien de clair, renvoie actionnable=false et intent='none'.",
      "",
      `Intents candidats :\n${catalogue}`,
      "",
      `Transcription (fenêtre) :\n"""${windowText}"""`,
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
      return result;
    } catch (error) {
      logger.warn(`extraction failed, treating as non-actionnable: ${error instanceof Error ? error.message : error}`);
      return NOT_ACTIONNABLE;
    }
  }
}
