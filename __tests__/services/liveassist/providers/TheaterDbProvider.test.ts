import { TheaterDbProvider, type PosterCreator } from "@/lib/services/liveassist/providers/TheaterDbProvider";
import type { PosterShower } from "@/lib/services/liveassist/providers/LocalPosterProvider";
import type { TheatreCandidate } from "@/lib/services/TheaterDataResolverService";

const candidate: TheatreCandidate = {
  id: 42,
  title: "Cassandre",
  tagline: "Une tragédie moderne",
  univers: "théâtre",
  posterUrl: "http://localhost:4173/poster/42",
};

describe("TheaterDbProvider", () => {
  it("build() is a no-op (suggestions come from the fast-path matcher)", async () => {
    const p = new TheaterDbProvider(jest.fn(), jest.fn());
    expect(await p.build()).toBeNull();
  });

  it("toSuggestion carries the theatre id, remote poster URL and tagline", () => {
    const s = TheaterDbProvider.toSuggestion(candidate, "un spectacle Cassandre", 0.9);
    expect(s.intent).toBe("theater-db");
    expect(s.entity).toBe("42"); // dedup key = show id
    expect(s.title).toBe("Cassandre");
    expect(s.preview).toEqual({ kind: "image", imageUrl: candidate.posterUrl });
    expect(s.applyPayload).toMatchObject({
      theatreId: 42,
      title: "Cassandre",
      fileUrl: candidate.posterUrl,
      tagline: "Une tragédie moderne",
    });
    expect(s.confidence).toBe(0.9);
  });

  it("apply() creates the poster then shows it on the chosen side", async () => {
    const createPoster: jest.MockedFunction<PosterCreator> = jest
      .fn()
      .mockResolvedValue({ ok: true, poster: { id: "new-poster-1", fileUrl: "/uploads/local.jpg" } });
    const showPoster: jest.MockedFunction<PosterShower> = jest.fn().mockResolvedValue({ ok: true });
    const p = new TheaterDbProvider(createPoster, showPoster);

    const res = await p.apply({
      theatreId: 42,
      title: "Cassandre",
      fileUrl: candidate.posterUrl,
      tagline: "Une tragédie moderne",
      target: "right",
    });

    expect(res.ok).toBe(true);
    expect(createPoster).toHaveBeenCalledWith({
      title: "Cassandre",
      fileUrl: candidate.posterUrl,
      description: "Une tragédie moderne",
      metadata: { theatreId: 42, source: "theater-data" },
    });
    // Shows the LOCAL poster (id + downloaded fileUrl) on the requested side.
    expect(showPoster).toHaveBeenCalledWith({
      posterId: "new-poster-1",
      fileUrl: "/uploads/local.jpg",
      type: "image",
      side: "right",
      transition: "fade",
    });
  });

  it("apply() defaults to the left side when target is absent", async () => {
    const createPoster: jest.MockedFunction<PosterCreator> = jest
      .fn()
      .mockResolvedValue({ ok: true, poster: { id: "p", fileUrl: "/uploads/x.jpg" } });
    const showPoster: jest.MockedFunction<PosterShower> = jest.fn().mockResolvedValue({ ok: true });
    const p = new TheaterDbProvider(createPoster, showPoster);
    await p.apply({ theatreId: 1, title: "X", fileUrl: "u" });
    expect(showPoster).toHaveBeenCalledWith(expect.objectContaining({ side: "left" }));
  });

  it("apply() returns the failure and does NOT show when creation fails", async () => {
    const createPoster: jest.MockedFunction<PosterCreator> = jest
      .fn()
      .mockResolvedValue({ ok: false, message: "poster create failed (500)" });
    const showPoster: jest.MockedFunction<PosterShower> = jest.fn().mockResolvedValue({ ok: true });
    const p = new TheaterDbProvider(createPoster, showPoster);

    const res = await p.apply({ theatreId: 1, title: "X", fileUrl: "u", target: "left" });
    expect(res.ok).toBe(false);
    expect(showPoster).not.toHaveBeenCalled();
  });

  it("apply() rejects an incomplete payload", async () => {
    const p = new TheaterDbProvider(jest.fn(), jest.fn());
    const res = await p.apply({ theatreId: 1 });
    expect(res.ok).toBe(false);
  });
});
