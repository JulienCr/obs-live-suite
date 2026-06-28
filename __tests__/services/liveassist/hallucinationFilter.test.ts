import { isHallucination } from "@/lib/services/liveassist/hallucinationFilter";

describe("isHallucination", () => {
  describe("drops Whisper silence-hallucinations", () => {
    it.each([
      "Sous-titrage ST' 501",
      "Sous-titrage Société Radio-Canada",
      "Sous-titrage FR 2021",
      "Sous-titres réalisés par la communauté d'Amara.org",
    ])("the subtitle-credit family: %s", (text) => {
      expect(isHallucination(text)).toBe(true);
    });

    it.each([
      "Merci d'avoir regardé cette vidéo",
      "Amara.org",
      "SousTitreur.com",
    ])("exact phrase: %s", (text) => {
      expect(isHallucination(text)).toBe(true);
    });

    it("ignores trailing punctuation", () => {
      expect(isHallucination("Sous-titrage FR 2021.")).toBe(true);
      expect(isHallucination("Merci d'avoir regardé cette vidéo !")).toBe(true);
    });

    it("ignores surrounding quotes / guillemets", () => {
      expect(isHallucination("« Sous-titrage Société Radio-Canada »")).toBe(true);
    });

    it("is case- and accent-insensitive", () => {
      expect(isHallucination("MERCI D'AVOIR REGARDÉ CETTE VIDÉO")).toBe(true);
      expect(isHallucination("merci d'avoir regarde cette video")).toBe(true);
    });

    it("folds the typographic apostrophe (U+2019) Whisper emits", () => {
      expect(isHallucination("Merci d’avoir regardé cette vidéo")).toBe(true);
    });

    it.each([
      "Sous-titres réalisés para la communauté d'Amara.org", // malformed "para" variant
      "❤️ par SousTitreur.com",
      "Copyright WDR 2021",
      "Merci d'avoir regardé la vidéo", // "la" instead of "cette"
      "J'espère que vous avez apprécié la vidéo",
      "Subtitles by the Amara.org community",
      "Transcribed by https://otter.ai",
      "(Rires)",
    ])("extended families from web research: %s", (text) => {
      expect(isHallucination(text)).toBe(true);
    });
  });

  describe("keeps real speech", () => {
    it.each([
      "le spectacle Le Cid ce soir",
      "on parle du film Basic Instinct",
      "abonnez-vous à la newsletter du théâtre", // not the exact "Abonnez-vous"
      "je regarde la vidéo de présentation", // contains words but not a credit phrase
      "société radio-canada a produit ce documentaire", // 'sous-titrage' prefix absent
    ])("does not drop: %s", (text) => {
      expect(isHallucination(text)).toBe(false);
    });

    it("returns false for empty / punctuation-only text", () => {
      expect(isHallucination("")).toBe(false);
      expect(isHallucination("   ")).toBe(false);
    });
  });
});
