import { randomUUID } from "crypto";
import { LIVE_ASSIST } from "@/lib/config/Constants";
import type { Suggestion, LiveAssistEvent } from "@/lib/models/LiveAssist";
import type { BuiltSuggestion } from "./providers/ActionProvider";

export type Publisher = (event: LiveAssistEvent) => void;

export class SuggestionStore {
  private readonly items: Suggestion[] = [];
  private readonly dedupWindowMs: number;
  private readonly now: () => number;
  private readonly makeId: () => string;

  constructor(
    private readonly publish: Publisher,
    opts: { dedupWindowMs?: number; now?: () => number; makeId?: () => string } = {},
  ) {
    this.dedupWindowMs = opts.dedupWindowMs ?? LIVE_ASSIST.DEDUP_WINDOW_MS;
    this.now = opts.now ?? Date.now;
    this.makeId = opts.makeId ?? randomUUID;
  }

  add(built: BuiltSuggestion): Suggestion | null {
    const t = this.now();
    const dup = this.items.find(
      (s) => s.intent === built.intent && s.entity === built.entity && t - s.createdAt < this.dedupWindowMs,
    );
    if (dup) return null;

    const suggestion: Suggestion = { ...built, id: this.makeId(), status: "pending", createdAt: t };
    this.items.unshift(suggestion);
    this.publish({ type: "suggestion:new", payload: { suggestion } });
    return suggestion;
  }

  list(): Suggestion[] {
    return [...this.items];
  }

  setStatus(id: string, status: Suggestion["status"]): Suggestion | undefined {
    const s = this.items.find((x) => x.id === id);
    if (!s) return undefined;
    s.status = status;
    this.publish({ type: "suggestion:update", payload: { id, status } });
    return s;
  }
}
