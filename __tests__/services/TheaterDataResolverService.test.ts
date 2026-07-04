import { TheaterDataResolverService } from "@/lib/services/TheaterDataResolverService";
import { SettingsRepository } from "@/lib/repositories/SettingsRepository";
import { THEATER_DATA } from "@/lib/config/Constants";

jest.mock("@/lib/repositories/SettingsRepository", () => ({
  SettingsRepository: { getInstance: jest.fn() },
}));

const mockGetSetting = (value: string | null) => {
  (SettingsRepository.getInstance as jest.Mock).mockReturnValue({ getSetting: () => value });
};

const okJson = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

describe("TheaterDataResolverService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("maps a search hit to a normalized candidate with an absolute posterUrl", async () => {
    mockGetSetting("http://wsl:4173/"); // trailing slash → must be stripped
    const fetchImpl = jest.fn(async () =>
      okJson([{ id: 262075, titre: "Le Cid", accroche: "Chef-d'œuvre.", univers: "Théâtre" }]),
    ) as unknown as typeof fetch;

    const svc = TheaterDataResolverService.createForTest({ fetchImpl });
    const [c] = await svc.search("cid");

    expect(c).toEqual({
      id: 262075,
      title: "Le Cid",
      tagline: "Chef-d'œuvre.",
      univers: "Théâtre",
      posterUrl: "http://wsl:4173/poster/262075",
    });

    const calledUrl = (fetchImpl as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain("http://wsl:4173/api/search?");
    expect(calledUrl).toContain("q=cid");
    expect(calledUrl).toContain("limit=");
  });

  it("falls back to the default URL and empty strings for missing accroche/univers", async () => {
    mockGetSetting(null);
    const fetchImpl = jest.fn(async () => okJson([{ id: 1, titre: "X" }])) as unknown as typeof fetch;

    const svc = TheaterDataResolverService.createForTest({ fetchImpl });
    const [c] = await svc.search("x");

    expect(c.posterUrl).toBe(`${THEATER_DATA.URL_DEFAULT}/poster/1`);
    expect(c.tagline).toBe("");
    expect(c.univers).toBe("");
  });

  it("drops malformed rows (missing id or titre)", async () => {
    mockGetSetting("http://h:4173");
    const fetchImpl = jest.fn(async () =>
      okJson([{ titre: "no id" }, { id: 2 }, { id: 3, titre: "Faust" }]),
    ) as unknown as typeof fetch;

    const svc = TheaterDataResolverService.createForTest({ fetchImpl });
    const results = await svc.search("faust");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(3);
  });

  it("resolveAndFetch returns the top-1 hit as { title, extract, thumbnail, source }", async () => {
    mockGetSetting("http://h:4173");
    const fetchImpl = jest.fn(async () =>
      okJson([
        { id: 5, titre: "Faust", accroche: "Pacte." },
        { id: 6, titre: "Faust 2" },
      ]),
    ) as unknown as typeof fetch;

    const svc = TheaterDataResolverService.createForTest({ fetchImpl });
    const r = await svc.resolveAndFetch("faust");

    expect(r).toEqual({
      title: "Faust",
      extract: "Pacte.",
      thumbnail: "http://h:4173/poster/5",
      source: "theater-data",
    });
  });

  it("search returns [] on an empty query without fetching", async () => {
    mockGetSetting("http://h:4173");
    const fetchImpl = jest.fn() as unknown as typeof fetch;
    const svc = TheaterDataResolverService.createForTest({ fetchImpl });

    expect(await svc.search("   ")).toEqual([]);
    expect(fetchImpl as jest.Mock).not.toHaveBeenCalled();
  });

  it("treats a blank URL setting as disabled: returns [] without fetching", async () => {
    mockGetSetting(""); // explicitly cleared in Settings → integration disabled
    const fetchImpl = jest.fn() as unknown as typeof fetch;
    const svc = TheaterDataResolverService.createForTest({ fetchImpl });

    expect(await svc.search("impro")).toEqual([]);
    await expect(svc.resolveAndFetch("impro")).rejects.toThrow(/no theater-data/i);
    expect(fetchImpl as jest.Mock).not.toHaveBeenCalled();
  });

  it("does not serve cross-base stale cache when the URL changes at runtime", async () => {
    const getSetting = jest.fn();
    (SettingsRepository.getInstance as jest.Mock).mockReturnValue({ getSetting });
    const fetchImpl = jest.fn(async () => okJson([{ id: 1, titre: "Dune" }])) as unknown as typeof fetch;
    let t = 1000;
    const svc = TheaterDataResolverService.createForTest({ fetchImpl, now: () => t });

    getSetting.mockReturnValue("http://a:4173");
    const [a] = await svc.search("dune");
    getSetting.mockReturnValue("http://b:4173"); // URL changed in Settings
    const [b] = await svc.search("dune");

    expect(a.posterUrl).toBe("http://a:4173/poster/1");
    expect(b.posterUrl).toBe("http://b:4173/poster/1");
    expect((fetchImpl as jest.Mock).mock.calls).toHaveLength(2); // no stale cache hit
  });

  it("search degrades to [] on a non-200 response", async () => {
    mockGetSetting("http://h:4173");
    const fetchImpl = jest.fn(async () => ({ ok: false, status: 500 }) as unknown as Response) as unknown as typeof fetch;
    const svc = TheaterDataResolverService.createForTest({ fetchImpl });
    expect(await svc.search("x")).toEqual([]);
  });

  it("search degrades to [] on a network error / timeout", async () => {
    mockGetSetting("http://h:4173");
    const fetchImpl = jest.fn(async () => {
      throw new Error("ETIMEDOUT");
    }) as unknown as typeof fetch;
    const svc = TheaterDataResolverService.createForTest({ fetchImpl });
    expect(await svc.search("x")).toEqual([]);
  });

  it("resolveAndFetch throws on an empty query", async () => {
    mockGetSetting("http://h:4173");
    const svc = TheaterDataResolverService.createForTest({ fetchImpl: jest.fn() as unknown as typeof fetch });
    await expect(svc.resolveAndFetch("  ")).rejects.toThrow(/empty query/i);
  });

  it("resolveAndFetch throws when the server is down (search yields [])", async () => {
    mockGetSetting("http://h:4173");
    const fetchImpl = jest.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    const svc = TheaterDataResolverService.createForTest({ fetchImpl });
    await expect(svc.resolveAndFetch("x")).rejects.toThrow(/no theater-data/i);
  });

  it("serves a cached result within TTL without re-fetching (case-insensitive key)", async () => {
    mockGetSetting("http://h:4173");
    const fetchImpl = jest.fn(async () => okJson([{ id: 1, titre: "Dune" }])) as unknown as typeof fetch;
    let t = 1000;
    const svc = TheaterDataResolverService.createForTest({ fetchImpl, now: () => t });

    await svc.search("dune");
    t += 1000; // still within TTL
    await svc.search("DUNE");
    expect((fetchImpl as jest.Mock).mock.calls).toHaveLength(1);
  });

  describe("testConnection", () => {
    it("returns ok when /api/status responds 200, using the passed-in (unsaved) URL", async () => {
      mockGetSetting(null); // nothing stored — proves the override URL is used
      const fetchImpl = jest.fn(async () => ({ ok: true, status: 200 }) as unknown as Response) as unknown as typeof fetch;
      const svc = TheaterDataResolverService.createForTest({ fetchImpl });
      const r = await svc.testConnection("http://typed:4173/");
      expect(r.ok).toBe(true);
      expect((fetchImpl as jest.Mock).mock.calls[0][0]).toBe("http://typed:4173/api/status");
    });

    it("reports a failure on a non-200 status", async () => {
      mockGetSetting("http://h:4173");
      const fetchImpl = jest.fn(async () => ({ ok: false, status: 503 }) as unknown as Response) as unknown as typeof fetch;
      const svc = TheaterDataResolverService.createForTest({ fetchImpl });
      const r = await svc.testConnection("http://h:4173");
      expect(r.ok).toBe(false);
      expect(r.message).toMatch(/503/);
    });

    it("falls back to the stored URL when no override is given", async () => {
      mockGetSetting("http://stored:4173");
      const fetchImpl = jest.fn(async () => ({ ok: true, status: 200 }) as unknown as Response) as unknown as typeof fetch;
      const svc = TheaterDataResolverService.createForTest({ fetchImpl });
      const r = await svc.testConnection();
      expect(r.ok).toBe(true);
      expect((fetchImpl as jest.Mock).mock.calls[0][0]).toBe("http://stored:4173/api/status");
    });

    it("returns a friendly failure (no throw) on a network error", async () => {
      mockGetSetting("http://h:4173");
      const fetchImpl = jest.fn(async () => {
        throw new Error("boom");
      }) as unknown as typeof fetch;
      const svc = TheaterDataResolverService.createForTest({ fetchImpl });
      const r = await svc.testConnection("http://h:4173");
      expect(r).toEqual({ ok: false, message: "boom" });
    });
  });
});
