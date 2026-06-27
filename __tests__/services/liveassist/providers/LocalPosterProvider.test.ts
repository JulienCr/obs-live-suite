import { LocalPosterProvider } from "@/lib/services/liveassist/providers/LocalPosterProvider";

describe("LocalPosterProvider", () => {
  describe("toSuggestion", () => {
    it("builds an image suggestion keyed on the poster id", () => {
      const s = LocalPosterProvider.toSuggestion(
        { id: "p3", title: "Rowanne - Eclypsia", fileUrl: "u3", type: "image" },
        "voici Eclypsia",
        0.92,
      );
      expect(s.intent).toBe("local-poster");
      expect(s.entity).toBe("p3");
      expect(s.title).toBe("Rowanne - Eclypsia");
      expect(s.preview).toEqual({ kind: "image", imageUrl: "u3" });
      expect(s.applyPayload).toEqual({ posterId: "p3", fileUrl: "u3", type: "image" });
      expect(s.confidence).toBeCloseTo(0.92);
    });

    it("prefers the thumbnail and falls back to text for a thumbnail-less video", () => {
      const withThumb = LocalPosterProvider.toSuggestion(
        { id: "v", title: "Clip", fileUrl: "v.mp4", type: "video", thumbnailUrl: "thumb.jpg" },
        "t",
        0.9,
      );
      expect(withThumb.preview).toEqual({ kind: "image", imageUrl: "thumb.jpg" });

      const noThumb = LocalPosterProvider.toSuggestion({ id: "v", title: "Casseroles", fileUrl: "v.mp4", type: "video" }, "t", 0.9);
      expect(noThumb.preview.kind).toBe("text");
    });

    it("carries a video clip's range/chapters into the apply payload (not just the raw file)", () => {
      const s = LocalPosterProvider.toSuggestion(
        {
          id: "clip", title: "Best of", fileUrl: "full.mp4", type: "video", thumbnailUrl: "t.jpg",
          startTime: 12, endTime: 34, endBehavior: "loop",
          metadata: { chapters: [{ timestamp: 5, title: "intro" }] },
        },
        "le best of",
        0.9,
      );
      expect(s.applyPayload).toEqual({
        posterId: "clip", fileUrl: "full.mp4", type: "video",
        startTime: 12, endTime: 34, endBehavior: "loop",
        chapters: [{ timestamp: 5, title: "intro" }],
      });
    });

    it("omits clip fields for an image poster", () => {
      const s = LocalPosterProvider.toSuggestion(
        { id: "p", title: "Affiche", fileUrl: "a.jpg", type: "image", startTime: 9, endTime: 99 },
        "x",
        0.9,
      );
      expect(s.applyPayload).toEqual({ posterId: "p", fileUrl: "a.jpg", type: "image" });
    });
  });

  describe("apply", () => {
    const okEnabler = jest.fn(async () => ({ ok: true as const }));
    beforeEach(() => okEnabler.mockClear());

    it("shows the poster overlay with side = right when target is 'right'", async () => {
      const shown: unknown[] = [];
      const p = new LocalPosterProvider(async (payload) => {
        shown.push(payload);
        return { ok: true };
      }, okEnabler);
      const r = await p.apply({ posterId: "p3", fileUrl: "u3", type: "image", target: "right" });
      expect(r.ok).toBe(true);
      expect(shown[0]).toEqual({ posterId: "p3", fileUrl: "u3", type: "image", side: "right", transition: "fade" });
    });

    it("enables the poster (adds it to the Affiches panel) before showing — either side", async () => {
      const p = new LocalPosterProvider(async () => ({ ok: true }), okEnabler);
      await p.apply({ posterId: "p3", fileUrl: "u3", type: "image", target: "left" });
      expect(okEnabler).toHaveBeenCalledWith("p3");
    });

    it("defaults to the left side for any non-'right' target", async () => {
      let side = "";
      const p = new LocalPosterProvider(async (payload) => {
        side = payload.side;
        return { ok: true };
      }, okEnabler);
      await p.apply({ posterId: "p", fileUrl: "u", type: "image", target: "left" });
      expect(side).toBe("left");
    });

    it("fails cleanly when the fileUrl is missing", async () => {
      const p = new LocalPosterProvider(async () => ({ ok: true }), okEnabler);
      expect((await p.apply({ posterId: "p" })).ok).toBe(false);
    });

    it("forwards a stored clip's range/chapters to the show payload", async () => {
      const shown: Array<Record<string, unknown>> = [];
      const p = new LocalPosterProvider(async (payload) => {
        shown.push(payload as Record<string, unknown>);
        return { ok: true };
      }, okEnabler);
      await p.apply({
        posterId: "clip", fileUrl: "full.mp4", type: "video", target: "left",
        startTime: 12, endTime: 34, endBehavior: "loop", chapters: [{ timestamp: 5, title: "intro" }],
      });
      expect(shown[0]).toEqual({
        posterId: "clip", fileUrl: "full.mp4", type: "video", side: "left", transition: "fade",
        startTime: 12, endTime: 34, endBehavior: "loop", chapters: [{ timestamp: 5, title: "intro" }],
      });
    });
  });
});
