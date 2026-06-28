import { LocalPosterMatcher } from "@/lib/services/liveassist/LocalPosterMatcher";

const posters = [
  { id: "p1", title: "Pilote", fileUrl: "u1", type: "image" },
  { id: "p2", title: "Casseroles", fileUrl: "u2", type: "image" },
  { id: "p3", title: "Rowanne - Eclypsia", fileUrl: "u3", type: "image", thumbnailUrl: null },
];

describe("LocalPosterMatcher", () => {
  it("matches a distinctive token of a multi-word title", () => {
    const m = new LocalPosterMatcher();
    m.setPosters(posters);
    const r = m.match("on reçoit Eclypsia ce soir");
    expect(r.map((x) => x.poster.id)).toContain("p3");
  });

  it("tolerates an STT typo + accent (« Éclipsia » → Eclypsia)", () => {
    const m = new LocalPosterMatcher();
    m.setPosters(posters);
    const r = m.match("voici Éclipsia");
    expect(r[0]?.poster.id).toBe("p3");
    expect(r[0]?.score).toBeGreaterThan(0.8);
  });

  it("does not match unrelated speech", () => {
    const m = new LocalPosterMatcher();
    m.setPosters(posters);
    expect(m.match("bonjour tout le monde")).toHaveLength(0);
  });

  it("returns one entry per poster even on repeated mentions", () => {
    const m = new LocalPosterMatcher();
    m.setPosters(posters);
    const r = m.match("Pilote pilote pilote");
    expect(r.filter((x) => x.poster.id === "p1")).toHaveLength(1);
  });

  it("ignores titles whose only tokens are short or stop-words", () => {
    const m = new LocalPosterMatcher();
    m.setPosters([{ id: "x", title: "Le Roi", fileUrl: "u", type: "image" }]);
    expect(m.match("le roi est mort")).toHaveLength(0); // "roi"<4 chars, "le" is a stop-word
  });

  it("regression: does not match 'tout de suite' against 'Tout le monde le sait'", () => {
    const m = new LocalPosterMatcher();
    m.setPosters([{ id: "x", title: "Tout le monde le sait", fileUrl: "u", type: "image" }]);
    // "tout" and "sait" are now stop-words; "monde" is not in the transcript
    expect(m.match("de là tout de suite pour voir si ça fonctionne")).toHaveLength(0);
  });

  it("matches 'Tout le monde le sait' when 'monde' is spoken", () => {
    const m = new LocalPosterMatcher();
    m.setPosters([{ id: "x", title: "Tout le monde le sait", fileUrl: "u", type: "image" }]);
    // "monde" is not a stop-word → valid trigger
    expect(m.match("tout le monde le sait")).toHaveLength(1);
  });

  it("matches a short single-word proper-noun title on its own", () => {
    const m = new LocalPosterMatcher();
    m.setPosters([{ id: "x", title: "Faust", fileUrl: "u", type: "image" }]);
    // "faust" is a proper noun, not a stop-word → trigger alone
    expect(m.match("on joue Faust ce soir")[0]?.poster.id).toBe("x");
  });

  it("respects a stricter minSimilarity (rejects the typo, keeps the exact word)", () => {
    const m = new LocalPosterMatcher();
    m.setPosters(posters, 0.99);
    expect(m.match("Eclipsia")).toHaveLength(0); // 0.875 < 0.99
    expect(m.match("Eclypsia").map((x) => x.poster.id)).toContain("p3");
  });
});
