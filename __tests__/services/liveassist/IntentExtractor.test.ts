import { IntentExtractor } from "@/lib/services/liveassist/IntentExtractor";

describe("IntentExtractor", () => {
  const descriptions = { poster: "Trouver l'affiche d'un spectacle/film", definition: "Définir un sujet" };

  it("returns the model's structured object", async () => {
    const fake = async () => ({ object: { actionnable: true, intent: "poster", entite: "Le Cid", confiance: 0.9, infere: false } });
    const x = new IntentExtractor(["poster", "definition"], descriptions, fake);
    const out = await x.extract("…le spectacle Le Cid…", ["poster"]);
    expect(out).toEqual({ actionnable: true, intent: "poster", entite: "Le Cid", confiance: 0.9, infere: false });
  });

  it("passes through infere=true when the model deduced the entity", async () => {
    const fake = async () => ({ object: { actionnable: true, intent: "poster-tmdb", entite: "Basic Instinct", confiance: 0.85, infere: true } });
    const x = new IntentExtractor(["poster-tmdb"], { "poster-tmdb": "TMDB" }, fake);
    const out = await x.extract("…ce film avec Sharon Stone…", ["poster-tmdb"]);
    expect(out.infere).toBe(true);
    expect(out.entite).toBe("Basic Instinct");
  });

  it("includes candidate providers and window text in the prompt", async () => {
    let seenPrompt = "";
    const fake = async ({ prompt }: { prompt: string }) => {
      seenPrompt = prompt;
      return { object: { actionnable: false, intent: "none", entite: "", confiance: 0 } };
    };
    const x = new IntentExtractor(["poster", "definition"], descriptions, fake);
    await x.extract("blabla contexte", ["definition"]);
    expect(seenPrompt).toContain("blabla contexte");
    expect(seenPrompt).toContain("definition");
  });

  it("injects each candidate's context prompt as its Règle", async () => {
    let seenPrompt = "";
    const fake = async ({ prompt }: { prompt: string }) => {
      seenPrompt = prompt;
      return { object: { actionnable: false, intent: "none", entite: "", confiance: 0 } };
    };
    const x = new IntentExtractor(["poster", "poster-tmdb"], { ...descriptions, "poster-tmdb": "Affiche TMDB" }, fake, {
      "poster-tmdb": "entité = titre exact du film",
    });
    await x.extract("…Titanic…", ["poster-tmdb"]);
    expect(seenPrompt).toContain("Règle : entité = titre exact du film");
  });

  it("setContextPrompts swaps the injected rules live", async () => {
    let seenPrompt = "";
    const fake = async ({ prompt }: { prompt: string }) => {
      seenPrompt = prompt;
      return { object: { actionnable: false, intent: "none", entite: "", confiance: 0 } };
    };
    const x = new IntentExtractor(["definition"], descriptions, fake, { definition: "ANCIEN" });
    x.setContextPrompts({ definition: "NOUVEAU contexte" });
    await x.extract("…", ["definition"]);
    expect(seenPrompt).toContain("Règle : NOUVEAU contexte");
    expect(seenPrompt).not.toContain("ANCIEN");
  });

  it("coerces an invalid model object to non-actionnable", async () => {
    const fake = async () => ({ object: { garbage: true } });
    const x = new IntentExtractor(["poster"], descriptions, fake);
    const out = await x.extract("x", ["poster"]);
    expect(out.actionnable).toBe(false);
    expect(out.intent).toBe("none");
  });

  it("falls back when the model picks an intent outside the candidates", async () => {
    const fake = async () => ({ object: { actionnable: true, intent: "definition", entite: "X", confiance: 0.9, infere: false } });
    const x = new IntentExtractor(["poster", "definition"], descriptions, fake);
    const out = await x.extract("…", ["poster"]); // definition not a candidate this call
    expect(out.actionnable).toBe(false);
    expect(out.intent).toBe("none");
  });

  it("falls back when generate throws", async () => {
    const fake = async () => { throw new Error("network"); };
    const x = new IntentExtractor(["poster"], descriptions, fake);
    const out = await x.extract("…", ["poster"]);
    expect(out).toEqual({ actionnable: false, intent: "none", entite: "", confiance: 0, infere: false });
  });

  it("clamps an out-of-range confiance into [0,1]", async () => {
    // A model that ignores the [0,1] instruction and answers on a 0–100 scale.
    const fake = async () => ({ object: { actionnable: true, intent: "poster", entite: "Le Cid", confiance: 85, infere: false } });
    const x = new IntentExtractor(["poster"], descriptions, fake);
    const out = await x.extract("…", ["poster"]);
    expect(out.confiance).toBe(1);
  });
});
