import {
  TranscriptSegmentSchema,
  SuggestionSchema,
  LiveAssistSettingsSchema,
} from "@/lib/models/LiveAssist";

describe("LiveAssist models", () => {
  it("parses a valid transcript segment", () => {
    const seg = TranscriptSegmentSchema.parse({ text: "le spectacle Le Cid", t0: 1000, t1: 2500, final: true });
    expect(seg.final).toBe(true);
    expect(seg.confidence).toBeUndefined();
  });

  it("rejects a segment with t1 < t0", () => {
    expect(() => TranscriptSegmentSchema.parse({ text: "x", t0: 5000, t1: 1000, final: true })).toThrow();
  });

  it("defaults suggestion status to pending", () => {
    const s = SuggestionSchema.parse({
      id: "a", intent: "poster", entity: "Le Cid", title: "Le Cid",
      preview: { kind: "image", imageUrl: "http://x/p.jpg" },
      triggerExcerpt: "…le spectacle Le Cid…", applyPayload: {}, confidence: 0.8, createdAt: 1,
    });
    expect(s.status).toBe("pending");
  });

  it("applies settings defaults", () => {
    const cfg = LiveAssistSettingsSchema.parse({});
    expect(cfg.windowBeforeSec).toBe(15);
    expect(cfg.windowAfterSec).toBe(15);
    expect(cfg.confidenceThreshold).toBeCloseTo(0.6);
    expect(cfg.enabled).toBe(false);
    expect(cfg.keywordsByProvider.poster).toContain("spectacle");
  });
});
