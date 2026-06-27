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

  const noop = async () => ({ ok: true });

  it("builds a text suggestion truncated to N sentences, carrying the subject name", async () => {
    const p = new DefinitionActionProvider(resolver, noop, noop, 3);
    const s = await p.build("Commedia dell'arte", window);
    expect(s?.preview.kind).toBe("text");
    expect(s?.preview.text).toBe("Phrase un. Phrase deux. Phrase trois.");
    expect(s?.applyPayload).toEqual({
      target: "pin",
      text: "Phrase un. Phrase deux. Phrase trois.",
      name: "Commedia dell'arte",
    });
  });

  it("validate (pin) creates a text preset named after the subject", async () => {
    let created: { name: string; body: string } | null = null;
    const p = new DefinitionActionProvider(
      resolver,
      async () => ({ ok: false, message: "on-air should not be called" }),
      async (input) => { created = input; return { ok: true }; },
      3,
    );
    const r = await p.apply({ target: "pin", text: "Une définition.", name: "Commedia dell'arte" });
    expect(r.ok).toBe(true);
    expect(created).toEqual({ name: "Commedia dell'arte", body: "Une définition." });
  });

  it("on-air apply pushes the text to the lower third (not the preset)", async () => {
    let aired = "";
    const p = new DefinitionActionProvider(
      resolver,
      async (t) => { aired = t; return { ok: true }; },
      async () => ({ ok: false, message: "preset should not be called" }),
      3,
    );
    const r = await p.apply({ target: "on-air", text: "Définition courte", name: "Sujet" });
    expect(r.ok).toBe(true);
    expect(aired).toBe("Définition courte");
  });

  it("falls back to a truncated body as the preset name when none is provided", async () => {
    let created: { name: string; body: string } | null = null;
    const p = new DefinitionActionProvider(resolver, noop, async (input) => { created = input; return { ok: true }; }, 3);
    const r = await p.apply({ target: "pin", text: "Texte sans nom." });
    expect(r.ok).toBe(true);
    expect(created?.name).toBe("Texte sans nom.");
  });
});
