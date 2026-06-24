// __tests__/services/liveassist/LiveAssistOrchestrator.test.ts
import { LiveAssistOrchestrator } from "@/lib/services/liveassist/LiveAssistOrchestrator";
import { TranscriptBuffer } from "@/lib/services/liveassist/TranscriptBuffer";
import { KeywordDetector } from "@/lib/services/liveassist/KeywordDetector";
import { WindowScheduler } from "@/lib/services/liveassist/WindowScheduler";
import { ProviderRegistry } from "@/lib/services/liveassist/providers/ActionProvider";
import { SuggestionStore } from "@/lib/services/liveassist/SuggestionStore";

const seg = (text: string, t0: number, t1: number) => ({ text, t0, t1, final: true });

function makeOrchestrator(extractObj: any) {
  const buffer = new TranscriptBuffer();
  const detector = new KeywordDetector({ poster: ["spectacle"] });
  const scheduler = new WindowScheduler(15000, 20000);
  const registry = new ProviderRegistry();
  registry.register({
    id: "poster", description: "d", defaultKeywords: ["spectacle"],
    build: async (entity: string) => ({
      intent: "poster", entity, title: entity,
      preview: { kind: "image", imageUrl: "u" }, triggerExcerpt: "x", applyPayload: {}, confidence: 0,
    }),
    apply: async () => ({ ok: true }),
  });
  const events: any[] = [];
  const store = new SuggestionStore((e) => events.push(e), { now: () => 0, makeId: () => "id" });
  const extractor = { extract: async () => extractObj } as any;
  const orch = new LiveAssistOrchestrator({
    buffer, detector, scheduler, extractor, registry, store,
    settings: { windowBeforeSec: 15, windowAfterSec: 15, confidenceThreshold: 0.6 },
    now: () => 0,
  });
  return { orch, events };
}

describe("LiveAssistOrchestrator", () => {
  it("creates a suggestion when a keyword fires and the extractor is actionnable", async () => {
    const { orch, events } = makeOrchestrator({ actionnable: true, intent: "poster", entite: "Le Cid", confiance: 0.9 });
    await orch.ingestSegment(seg("le spectacle Le Cid", 10000, 11000));
    await orch.ingestSegment(seg("contexte qui suit", 26000, 27000)); // pushes latestT1 past 25000
    expect(events.some((e) => e.type === "suggestion:new")).toBe(true);
  });

  it("creates nothing when confidence is below threshold", async () => {
    const { orch, events } = makeOrchestrator({ actionnable: true, intent: "poster", entite: "Le Cid", confiance: 0.3 });
    await orch.ingestSegment(seg("le spectacle Le Cid", 10000, 11000));
    await orch.ingestSegment(seg("contexte", 26000, 27000));
    expect(events.some((e) => e.type === "suggestion:new")).toBe(false);
  });

  it("creates nothing when the extractor says non-actionnable", async () => {
    const { orch, events } = makeOrchestrator({ actionnable: false, intent: "none", entite: "", confiance: 0 });
    await orch.ingestSegment(seg("le spectacle Le Cid", 10000, 11000));
    await orch.ingestSegment(seg("contexte", 26000, 27000));
    expect(events.some((e) => e.type === "suggestion:new")).toBe(false);
  });
});
