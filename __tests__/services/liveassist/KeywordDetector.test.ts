import { KeywordDetector } from "@/lib/services/liveassist/KeywordDetector";

const seg = (text: string, t0 = 5000, t1 = 6000) => ({ text, t0, t1, final: true });

describe("KeywordDetector", () => {
  const detector = new KeywordDetector({
    poster: ["spectacle", "affiche"],
    definition: ["définition", "c'est quoi"],
  });

  it("matches a whole-word keyword, case/accent-insensitive", () => {
    const hits = detector.scan(seg("On parle du SPECTACLE de ce soir"));
    expect(hits).toEqual([{ providerId: "poster", keyword: "spectacle", tHit: 5000 }]);
  });

  it("does not match a keyword embedded in another word", () => {
    expect(detector.scan(seg("c'est de l'affichage urbain"))).toEqual([]);
  });

  it("matches a multi-word keyword", () => {
    const hits = detector.scan(seg("alors c'est quoi exactement"));
    expect(hits.map((h) => h.providerId)).toContain("definition");
  });

  it("returns one hit per matched keyword across providers", () => {
    const hits = detector.scan(seg("définition du spectacle"));
    expect(hits).toHaveLength(2);
  });
});
