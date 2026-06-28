// __tests__/services/liveassist/LiveAssistOrchestrator.test.ts
import { LiveAssistOrchestrator } from "@/lib/services/liveassist/LiveAssistOrchestrator";
import { TranscriptBuffer } from "@/lib/services/liveassist/TranscriptBuffer";
import { KeywordDetector } from "@/lib/services/liveassist/KeywordDetector";
import { WindowScheduler } from "@/lib/services/liveassist/WindowScheduler";
import { ProviderRegistry } from "@/lib/services/liveassist/providers/ActionProvider";
import { SuggestionStore } from "@/lib/services/liveassist/SuggestionStore";

const seg = (text: string, t0: number, t1: number) => ({ text, t0, t1, final: true });

function makeOrchestrator(extractObj: any, extraDeps?: Record<string, unknown>) {
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
    getSettings: () => ({ windowBeforeSec: 15, windowAfterSec: 15, confidenceThreshold: 0.6 }),
    now: () => 0,
    ...extraDeps,
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

  it("fires a local-poster suggestion via the fast-path on ingest (no window/LLM)", async () => {
    const built = {
      intent: "local-poster", entity: "p3", title: "Eclypsia",
      preview: { kind: "image", imageUrl: "u" }, triggerExcerpt: "x",
      applyPayload: { posterId: "p3" }, confidence: 0.9,
    };
    const { orch, events } = makeOrchestrator(
      { actionnable: false, intent: "none", entite: "", confiance: 0 }, // extractor would say no
      { matchLocalPosters: (text: string) => (text.includes("eclypsia") ? [built] : []) },
    );
    // No registered keyword in this text → only the fast-path can produce a suggestion.
    await orch.ingestSegment(seg("on recoit eclypsia", 0, 1000));
    expect(events.some((e) => e.type === "suggestion:new")).toBe(true);
  });

  it("drains a pending window on tick when no further segment arrives (silence)", async () => {
    let fakeNow = 0;
    const { orch, events } = makeOrchestrator(
      { actionnable: true, intent: "poster", entite: "Le Cid", confiance: 0.9 },
      { now: () => fakeNow },
    );
    // Keyword fires at t=10s, registeredWall=0. No +15s context segment follows.
    await orch.ingestSegment(seg("le spectacle Le Cid", 10000, 11000));
    expect(events.some((e) => e.type === "suggestion:new")).toBe(false);

    // Advance wall clock past WINDOW_MAX_WAIT_MS (20s); the ticker drains it.
    fakeNow = 21000;
    await orch.tick(fakeNow);
    expect(events.some((e) => e.type === "suggestion:new")).toBe(true);
  });

  it("does not drain pending windows on tick while disabled", async () => {
    let fakeNow = 0;
    let enabled = true;
    const { orch, events } = makeOrchestrator(
      { actionnable: true, intent: "poster", entite: "Le Cid", confiance: 0.9 },
      { now: () => fakeNow, isEnabled: () => enabled },
    );
    // Register a pending window while enabled (no +15s context yet → not fired).
    await orch.ingestSegment(seg("le spectacle Le Cid", 10000, 11000));
    expect(events.some((e) => e.type === "suggestion:new")).toBe(false);

    // Operator disables the feature, then the max-wait elapses.
    enabled = false;
    fakeNow = 21000;
    await orch.tick(fakeNow);
    expect(events.some((e) => e.type === "suggestion:new")).toBe(false);
  });

  it("gates a DEDUCED (infere) suggestion behind the stricter inferred bar (0.7)", async () => {
    // 0.65 clears the normal 0.6 seuil but not the inferred 0.7 bar → dropped.
    // ("spectacle" is the fixture's registered keyword that fires the window.)
    const dropped = makeOrchestrator({ actionnable: true, intent: "poster", entite: "Basic Instinct", confiance: 0.65, infere: true });
    await dropped.orch.ingestSegment(seg("le spectacle avec Sharon Stone", 10000, 11000));
    await dropped.orch.ingestSegment(seg("contexte", 26000, 27000));
    expect(dropped.events.some((e) => e.type === "suggestion:new")).toBe(false);

    // 0.75 clears the inferred bar → created.
    const kept = makeOrchestrator({ actionnable: true, intent: "poster", entite: "Basic Instinct", confiance: 0.75, infere: true });
    await kept.orch.ingestSegment(seg("le spectacle avec Sharon Stone", 10000, 11000));
    await kept.orch.ingestSegment(seg("contexte", 26000, 27000));
    expect(kept.events.some((e) => e.type === "suggestion:new")).toBe(true);
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

  it("ignores segments when disabled", async () => {
    const { orch, events } = makeOrchestrator(
      { actionnable: true, intent: "poster", entite: "Le Cid", confiance: 0.9 },
      { isEnabled: () => false },
    );
    await orch.ingestSegment(seg("le spectacle Le Cid", 10000, 11000));
    await orch.ingestSegment(seg("contexte qui suit", 26000, 27000));
    expect(events.some((e) => e.type === "suggestion:new")).toBe(false);
  });

  it("drops a hallucination segment (not recorded, not broadcast, no scan) but stays connected", async () => {
    const transcripts: string[] = [];
    const recorded: string[] = [];
    const statusCalls: Array<[boolean, string | null]> = [];
    const { orch, events } = makeOrchestrator(
      { actionnable: true, intent: "poster", entite: "Le Cid", confiance: 0.9 },
      {
        isHallucination: (text: string) => text.startsWith("Sous-titrage"),
        recordTranscript: (text: string) => recorded.push(text),
        publishTranscript: (text: string) => transcripts.push(text),
        publishStatus: (c: boolean, d: string | null) => statusCalls.push([c, d]),
      },
    );
    // Contains the fixture keyword "spectacle" — a non-hallucination segment would
    // register a window. Being a hallucination, it's dropped before record/scan/publish.
    await orch.ingestSegment(seg("Sous-titrage spectacle Société Radio-Canada", 10000, 11000));
    expect(recorded).toEqual([]); // not persisted to the transcript file
    expect(transcripts).toEqual([]); // not re-broadcast
    expect(events.some((e) => e.type === "suggestion:new")).toBe(false); // no window/suggestion
    expect(statusCalls[0]?.[0]).toBe(true); // STT still marked connected (alive)
  });

  it("publishes the live transcript for the debug view by default", async () => {
    const transcripts: string[] = [];
    const { orch } = makeOrchestrator(
      { actionnable: false, intent: "none", entite: "", confiance: 0 },
      { publishTranscript: (text: string) => transcripts.push(text) },
    );
    await orch.ingestSegment(seg("bonjour le monde", 0, 1000));
    expect(transcripts).toEqual(["bonjour le monde"]);
  });

  it("does not publish the transcript when debug is disabled (no websocket fan-out)", async () => {
    const transcripts: string[] = [];
    const { orch } = makeOrchestrator(
      { actionnable: false, intent: "none", entite: "", confiance: 0 },
      {
        publishTranscript: (text: string) => transcripts.push(text),
        isTranscriptDebugEnabled: () => false,
      },
    );
    await orch.ingestSegment(seg("bonjour le monde", 0, 1000));
    expect(transcripts).toEqual([]);
  });

  it("records the transcript to file even when the debug re-broadcast is off", async () => {
    const recorded: string[] = [];
    const transcripts: string[] = [];
    const { orch } = makeOrchestrator(
      { actionnable: false, intent: "none", entite: "", confiance: 0 },
      {
        recordTranscript: (text: string) => recorded.push(text),
        publishTranscript: (text: string) => transcripts.push(text),
        isTranscriptDebugEnabled: () => false,
      },
    );
    await orch.ingestSegment(seg("bonjour le monde", 0, 1000));
    expect(recorded).toEqual(["bonjour le monde"]); // persisted
    expect(transcripts).toEqual([]); // but not re-broadcast
  });

  it("does not record non-final segments or segments while disabled", async () => {
    const recorded: string[] = [];
    const disabled = makeOrchestrator(
      { actionnable: false, intent: "none", entite: "", confiance: 0 },
      { recordTranscript: (text: string) => recorded.push(text), isEnabled: () => false },
    );
    await disabled.orch.ingestSegment(seg("ignoré (disabled)", 0, 1000));
    expect(recorded).toEqual([]);

    const enabled = makeOrchestrator(
      { actionnable: false, intent: "none", entite: "", confiance: 0 },
      { recordTranscript: (text: string) => recorded.push(text) },
    );
    await enabled.orch.ingestSegment({ text: "ignoré (non final)", t0: 0, t1: 1000, final: false });
    expect(recorded).toEqual([]);
  });

  it("publishes stt:status connected on first segment", async () => {
    const statusCalls: Array<[boolean, string | null]> = [];
    const publishStatus = (connected: boolean, device: string | null) => {
      statusCalls.push([connected, device]);
    };
    const { orch } = makeOrchestrator(
      { actionnable: false, intent: "none", entite: "", confiance: 0 },
      { publishStatus },
    );
    await orch.ingestSegment(seg("bonjour", 0, 1000));
    expect(statusCalls.length).toBeGreaterThanOrEqual(1);
    expect(statusCalls[0][0]).toBe(true);
  });

  it("resolves a device id to its label in status (setSttStatus + markSttAlive)", async () => {
    const { orch } = makeOrchestrator(
      { actionnable: false, intent: "none", entite: "", confiance: 0 },
      { resolveDeviceLabel: (id: string) => (id === "1" ? "USB Mic" : id) },
    );
    orch.setSttStatus(false, "1");
    expect(orch.getStatus().device).toBe("USB Mic");
    orch.markSttAlive("1");
    expect(orch.getStatus().device).toBe("USB Mic");
    // null device stays null (no lookup)
    orch.setSttStatus(false, null);
    expect(orch.getStatus().device).toBeNull();
  });

  it("publishes stt:status disconnected when stale", async () => {
    const statusCalls: Array<[boolean, string | null]> = [];
    const publishStatus = (connected: boolean, device: string | null) => {
      statusCalls.push([connected, device]);
    };
    let fakeNow = 0;
    const staleMs = 10_000;
    const { orch } = makeOrchestrator(
      { actionnable: false, intent: "none", entite: "", confiance: 0 },
      { publishStatus, now: () => fakeNow, staleMs },
    );
    // Ingest a segment — this marks connected=true and sets lastSegmentAt=0.
    await orch.ingestSegment(seg("bonjour", 0, 1000));
    expect(statusCalls[0][0]).toBe(true);

    // Advance time past the stale threshold and check staleness.
    fakeNow = staleMs + 1;
    orch.checkStaleness(fakeNow);
    const disconnectCall = statusCalls.find(([c]) => c === false);
    expect(disconnectCall).toBeDefined();
    expect(disconnectCall![0]).toBe(false);
  });
});
