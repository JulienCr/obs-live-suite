import type { Suggestion } from "@/lib/models/LiveAssist";

export type TranscriptWindow = { text: string; t0: number; t1: number };
export type ApplyResult = { ok: boolean; message?: string };
export type BuiltSuggestion = Omit<Suggestion, "id" | "status" | "createdAt">;

export interface ActionProvider {
  id: string;
  description: string;
  defaultKeywords: string[];
  /** Per-provider extraction guidance injected into the IntentExtractor prompt (the "Règle"). */
  defaultContextPrompt?: string;
  build(entity: string, window: TranscriptWindow): Promise<BuiltSuggestion | null>;
  apply(payload: Record<string, unknown>): Promise<ApplyResult>;
}

export class ProviderRegistry {
  private readonly map = new Map<string, ActionProvider>();

  register(p: ActionProvider): void {
    this.map.set(p.id, p);
  }
  get(id: string): ActionProvider | undefined {
    return this.map.get(id);
  }
  all(): ActionProvider[] {
    return [...this.map.values()];
  }
  ids(): string[] {
    return [...this.map.keys()];
  }
  descriptions(): Record<string, string> {
    return Object.fromEntries(this.all().map((p) => [p.id, p.description]));
  }
  /** Per-provider default context prompts (only providers that declare one). */
  contextPrompts(): Record<string, string> {
    return Object.fromEntries(
      this.all()
        .filter((p) => p.defaultContextPrompt)
        .map((p) => [p.id, p.defaultContextPrompt as string]),
    );
  }
}
