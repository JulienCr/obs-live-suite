import { PosterActionProvider } from "@/lib/services/liveassist/providers/PosterActionProvider";

describe("PosterActionProvider", () => {
  const window = { text: "…le spectacle Le Cid…", t0: 0, t1: 1 };

  it("builds an image suggestion when Wikipedia has a thumbnail", async () => {
    const resolver = { resolveAndFetch: async () => ({ title: "Le Cid", extract: "…", thumbnail: "http://x/p.jpg" }) };
    const p = new PosterActionProvider(resolver, async () => ({ ok: true }));
    const s = await p.build("Le Cid", window);
    expect(s?.preview).toEqual({ kind: "image", imageUrl: "http://x/p.jpg" });
    expect(s?.applyPayload).toEqual({ title: "Le Cid", fileUrl: "http://x/p.jpg" });
    expect(s?.intent).toBe("poster");
  });

  it("falls back to a manual-search text suggestion when no image", async () => {
    const resolver = { resolveAndFetch: async () => ({ title: "Le Cid", extract: "…", thumbnail: undefined }) };
    const p = new PosterActionProvider(resolver, async () => ({ ok: true }));
    const s = await p.build("Le Cid", window);
    expect(s?.preview.kind).toBe("text");
    expect(s?.applyPayload.fileUrl).toBeUndefined();
  });

  it("returns null when the resolver throws (not found)", async () => {
    const resolver = { resolveAndFetch: async () => { throw new Error("not found"); } };
    const p = new PosterActionProvider(resolver, async () => ({ ok: true }));
    expect(await p.build("Inexistant", window)).toBeNull();
  });

  it("apply calls the poster creator with payload", async () => {
    let called: unknown = null;
    const p = new PosterActionProvider(
      { resolveAndFetch: async () => ({ title: "x", extract: "", thumbnail: "u" }) },
      async (input) => { called = input; return { ok: true }; },
    );
    const r = await p.apply({ title: "Le Cid", fileUrl: "http://x/p.jpg" });
    expect(r.ok).toBe(true);
    expect(called).toEqual({ title: "Le Cid", fileUrl: "http://x/p.jpg" });
  });
});
