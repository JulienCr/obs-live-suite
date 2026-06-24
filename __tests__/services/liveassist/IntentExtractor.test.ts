import { IntentExtractor } from "@/lib/services/liveassist/IntentExtractor";

describe("IntentExtractor", () => {
  const descriptions = { poster: "Trouver l'affiche d'un spectacle/film", definition: "Définir un sujet" };

  it("returns the model's structured object", async () => {
    const fake = async () => ({ object: { actionnable: true, intent: "poster", entite: "Le Cid", confiance: 0.9 } });
    const x = new IntentExtractor(["poster", "definition"], descriptions, fake);
    const out = await x.extract("…le spectacle Le Cid…", ["poster"]);
    expect(out).toEqual({ actionnable: true, intent: "poster", entite: "Le Cid", confiance: 0.9 });
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

  it("coerces an invalid model object to non-actionnable", async () => {
    const fake = async () => ({ object: { garbage: true } });
    const x = new IntentExtractor(["poster"], descriptions, fake);
    const out = await x.extract("x", ["poster"]);
    expect(out.actionnable).toBe(false);
    expect(out.intent).toBe("none");
  });
});
