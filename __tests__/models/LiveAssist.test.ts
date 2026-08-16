import {
  TranscriptSegmentSchema,
  SuggestionSchema,
  LiveAssistSettingsSchema,
  migrateLiveAssistSettings,
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
    expect(cfg.transcriptDebug).toBe(false);
    // `poster` (Wikipedia) is dormant by default; théâtre → the non-LLM fast-paths.
    expect(cfg.keywordsByProvider.poster).toEqual([]);
    expect(cfg.keywordsByProvider["poster-tmdb"]).toContain("film");
    // theater-db fast-path defaults
    expect(cfg.theaterDbEnabled).toBe(true);
    expect(cfg.theaterDbShadow).toBe(false);
    expect(cfg.theaterDbMinSimilarity).toBeCloseTo(0.85);
  });

  describe("migrateLiveAssistSettings", () => {
    it("clears the pre-tmdb-split legacy poster default (poster goes dormant, adds poster-tmdb)", () => {
      const stored = LiveAssistSettingsSchema.parse({
        keywordsByProvider: {
          poster: ["spectacle", "affiche", "pièce", "film", "concert"], // pre-tmdb-split legacy default
          definition: ["définition"],
        },
      });
      const out = migrateLiveAssistSettings(stored);
      // Wikipedia poster goes dormant…
      expect(out.keywordsByProvider.poster).toEqual([]);
      // …and a TMDB provider is seeded with its defaults
      expect(out.keywordsByProvider["poster-tmdb"]).toContain("film");
      expect(out.keywordsByProvider["poster-tmdb"]).toContain("série");
    });

    it("clears the tmdb-split-era poster default (théâtre moved to the fast-paths)", () => {
      const stored = LiveAssistSettingsSchema.parse({
        keywordsByProvider: { poster: ["spectacle", "pièce", "affiche", "concert"], definition: ["définition"] },
      });
      const out = migrateLiveAssistSettings(stored);
      expect(out.keywordsByProvider.poster).toEqual([]);
    });

    it("prunes the orphan poster-theatre key and prompt (now the theater-db fast-path)", () => {
      const stored = LiveAssistSettingsSchema.parse({
        keywordsByProvider: { poster: [], "poster-theatre": ["impro"], definition: ["x"] },
        contextPromptsByProvider: { "poster-theatre": "old rule" },
      });
      const out = migrateLiveAssistSettings(stored);
      expect(out.keywordsByProvider["poster-theatre"]).toBeUndefined();
      expect(out.contextPromptsByProvider["poster-theatre"]).toBeUndefined();
    });

    it("leaves a customised poster list untouched but still adds the missing poster-tmdb", () => {
      const stored = LiveAssistSettingsSchema.parse({
        keywordsByProvider: { poster: ["mon", "custom", "film"], definition: ["définition"] },
      });
      const out = migrateLiveAssistSettings(stored);
      expect(out.keywordsByProvider.poster).toEqual(["mon", "custom", "film"]); // untouched
      expect(out.keywordsByProvider["poster-tmdb"]).toBeDefined(); // additively surfaced
    });

    it("is a no-op for keywordsByProvider when already up to date", () => {
      const stored = LiveAssistSettingsSchema.parse({
        keywordsByProvider: { poster: [], "poster-tmdb": ["film"], definition: ["x"] },
      });
      const out = migrateLiveAssistSettings(stored);
      expect(out.keywordsByProvider).toEqual(stored.keywordsByProvider);
    });
  });
});
