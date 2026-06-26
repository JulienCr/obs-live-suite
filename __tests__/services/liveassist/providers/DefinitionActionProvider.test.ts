import { DefinitionActionProvider } from "@/lib/services/liveassist/providers/DefinitionActionProvider";

describe("DefinitionActionProvider", () => {
  const window = { text: "c'est quoi la commedia dell'arte", t0: 0, t1: 1 };
  const resolver = {
    resolveAndFetch: async () => ({
      title: "Commedia dell'arte",
      extract: "Phrase un. Phrase deux. Phrase trois. Phrase quatre. Phrase cinq.",
      thumbnail: undefined,
    }),
  };

  it("builds a text suggestion truncated to N sentences", async () => {
    const p = new DefinitionActionProvider(resolver, async () => ({ ok: true }), 3);
    const s = await p.build("Commedia dell'arte", window);
    expect(s?.preview.kind).toBe("text");
    expect(s?.preview.text).toBe("Phrase un. Phrase deux. Phrase trois.");
    expect(s?.applyPayload).toEqual({ target: "pin", text: "Phrase un. Phrase deux. Phrase trois." });
  });

  it("pin apply is a no-op success", async () => {
    const p = new DefinitionActionProvider(resolver, async () => ({ ok: false, message: "should not call" }), 3);
    const r = await p.apply({ target: "pin", text: "x" });
    expect(r.ok).toBe(true);
  });

  it("on-air apply pushes the text to the lower third", async () => {
    let aired = "";
    const p = new DefinitionActionProvider(resolver, async (t) => { aired = t; return { ok: true }; }, 3);
    const r = await p.apply({ target: "on-air", text: "Définition courte" });
    expect(r.ok).toBe(true);
    expect(aired).toBe("Définition courte");
  });
});
