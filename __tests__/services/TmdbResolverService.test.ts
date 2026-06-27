import { TmdbResolverService } from "@/lib/services/TmdbResolverService";
import { SettingsRepository } from "@/lib/repositories/SettingsRepository";

jest.mock("@/lib/repositories/SettingsRepository", () => ({
  SettingsRepository: { getInstance: jest.fn() },
}));

const mockGetSetting = (value: string | null) => {
  (SettingsRepository.getInstance as jest.Mock).mockReturnValue({ getSetting: () => value });
};

const okJson = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

describe("TmdbResolverService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the most popular movie/tv hit with a w780 poster URL", async () => {
    mockGetSetting("KEY");
    const fetchImpl = jest.fn(async () =>
      okJson({
        results: [
          { media_type: "person", name: "James Cameron", popularity: 99 },
          { media_type: "movie", title: "Titanic", overview: "Jack et Rose.", poster_path: "/abc.jpg", popularity: 80 },
          { media_type: "movie", title: "Titanic II", overview: "", poster_path: "/z.jpg", popularity: 5 },
        ],
      }),
    ) as unknown as typeof fetch;

    const svc = TmdbResolverService.createForTest({ fetchImpl });
    const r = await svc.resolveAndFetch("Titanic");

    expect(r.title).toBe("Titanic");
    expect(r.extract).toBe("Jack et Rose.");
    expect(r.thumbnail).toBe("https://image.tmdb.org/t/p/w780/abc.jpg");
    expect(r.source).toBe("tmdb");
    // request carried the key + fr-FR
    const calledUrl = (fetchImpl as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain("api_key=KEY");
    expect(calledUrl).toContain("language=fr-FR");
  });

  it("uses the tv `name` field and omits thumbnail when no poster_path", async () => {
    mockGetSetting("KEY");
    const fetchImpl = jest.fn(async () =>
      okJson({ results: [{ media_type: "tv", name: "Le Bureau des légendes", overview: "Espions.", poster_path: null, popularity: 50 }] }),
    ) as unknown as typeof fetch;

    const svc = TmdbResolverService.createForTest({ fetchImpl });
    const r = await svc.resolveAndFetch("le bureau des légendes");
    expect(r.title).toBe("Le Bureau des légendes");
    expect(r.thumbnail).toBeUndefined();
  });

  it("throws when no API key is configured", async () => {
    mockGetSetting(null);
    const svc = TmdbResolverService.createForTest({ fetchImpl: jest.fn() as unknown as typeof fetch });
    await expect(svc.resolveAndFetch("Titanic")).rejects.toThrow(/api key/i);
  });

  it("throws when there is no movie/tv match (person-only results)", async () => {
    mockGetSetting("KEY");
    const fetchImpl = jest.fn(async () => okJson({ results: [{ media_type: "person", name: "X", popularity: 9 }] })) as unknown as typeof fetch;
    const svc = TmdbResolverService.createForTest({ fetchImpl });
    await expect(svc.resolveAndFetch("X")).rejects.toThrow(/no TMDB/i);
  });

  describe("testConnection", () => {
    it("returns ok when /configuration responds 200, using the passed-in (unsaved) key", async () => {
      mockGetSetting(null); // nothing stored — proves the override key is used
      const fetchImpl = jest.fn(async () => ({ ok: true, status: 200 }) as unknown as Response) as unknown as typeof fetch;
      const svc = TmdbResolverService.createForTest({ fetchImpl });
      const r = await svc.testConnection("TYPED_KEY");
      expect(r.ok).toBe(true);
      expect((fetchImpl as jest.Mock).mock.calls[0][0]).toContain("api_key=TYPED_KEY");
      expect((fetchImpl as jest.Mock).mock.calls[0][0]).toContain("/configuration");
    });

    it("reports an invalid key on 401", async () => {
      mockGetSetting("STORED");
      const fetchImpl = jest.fn(async () => ({ ok: false, status: 401 }) as unknown as Response) as unknown as typeof fetch;
      const svc = TmdbResolverService.createForTest({ fetchImpl });
      const r = await svc.testConnection("BAD");
      expect(r.ok).toBe(false);
      expect(r.message).toMatch(/invalide|401/i);
    });

    it("falls back to the stored key when no override is given", async () => {
      mockGetSetting("STORED_KEY");
      const fetchImpl = jest.fn(async () => ({ ok: true, status: 200 }) as unknown as Response) as unknown as typeof fetch;
      const svc = TmdbResolverService.createForTest({ fetchImpl });
      const r = await svc.testConnection();
      expect(r.ok).toBe(true);
      expect((fetchImpl as jest.Mock).mock.calls[0][0]).toContain("api_key=STORED_KEY");
    });

    it("returns a friendly failure (no throw) when no key is available", async () => {
      mockGetSetting(null);
      const fetchImpl = jest.fn() as unknown as typeof fetch;
      const svc = TmdbResolverService.createForTest({ fetchImpl });
      const r = await svc.testConnection("");
      expect(r.ok).toBe(false);
      expect(fetchImpl as jest.Mock).not.toHaveBeenCalled();
    });

    it("returns a friendly failure (no throw) on a network error", async () => {
      mockGetSetting("STORED");
      const fetchImpl = jest.fn(async () => {
        throw new Error("boom");
      }) as unknown as typeof fetch;
      const svc = TmdbResolverService.createForTest({ fetchImpl });
      const r = await svc.testConnection("K");
      expect(r).toEqual({ ok: false, message: "boom" });
    });
  });

  it("serves a cached result within TTL without re-fetching", async () => {
    mockGetSetting("KEY");
    const fetchImpl = jest.fn(async () =>
      okJson({ results: [{ media_type: "movie", title: "Dune", overview: "Sable.", poster_path: "/d.jpg", popularity: 70 }] }),
    ) as unknown as typeof fetch;
    let t = 1000;
    const svc = TmdbResolverService.createForTest({ fetchImpl, now: () => t });

    await svc.resolveAndFetch("Dune");
    t += 1000; // still within TTL
    await svc.resolveAndFetch("DUNE"); // case-insensitive cache key
    expect((fetchImpl as jest.Mock).mock.calls).toHaveLength(1);
  });
});
