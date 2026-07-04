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
    // Casseroles is distinctive (fires alone); repeated mentions still yield one entry.
    const r = m.match("Casseroles casseroles casseroles");
    expect(r.filter((x) => x.poster.id === "p2")).toHaveLength(1);
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

  it("does NOT fire a single common-word title on its own (precision trade-off)", () => {
    const m = new LocalPosterMatcher();
    m.setPosters([{ id: "x", title: "Tout le monde le sait", fileUrl: "u", type: "image" }]);
    // "monde" is the only trigger token, and it is a common French word: a single common
    // word is too weak to fire the instant fast-path (it would collide with everyday
    // speech). Such a title falls back to the keyword/LLM path instead.
    // (Previous behavior: fired on bare "monde" — that was a false-positive generator.)
    expect(m.match("tout le monde le sait")).toHaveLength(0);
  });

  it("blocks a 1-edit fuzzy match on a short token (spoken 'faut' must not fire 'Faust')", () => {
    const m = new LocalPosterMatcher();
    m.setPosters([{ id: "x", title: "Faust", fileUrl: "u", type: "image" }]);
    // "faust" is 5 chars ≤ FUZZY_MIN_LEN → exact required. "faut" (from "il faut") is 1
    // edit away (similarity 0.80) but no longer matches — this is the prod false-positive class.
    expect(m.match("il faut bien y aller")).toHaveLength(0);
    // ...while the exact word still fires.
    expect(m.match("on joue Faust")).toHaveLength(1);
  });

  it("fires a common-word title only when ≥2 tokens corroborate", () => {
    const m = new LocalPosterMatcher();
    m.setPosters([{ id: "x", title: "Une histoire de voiture", fileUrl: "u", type: "image" }]);
    // "histoire" and "voiture" are both common → neither fires alone…
    expect(m.match("c'est juste une histoire")).toHaveLength(0);
    // …but both spoken in one segment corroborate.
    const r = m.match("je raconte une histoire de voiture");
    expect(r).toHaveLength(1);
    expect(r[0]?.rule).toBe("corroboration");
  });

  it("reports the matched word/token and rule for explainability", () => {
    const m = new LocalPosterMatcher();
    m.setPosters(posters);
    const r = m.match("voici Éclipsia");
    expect(r[0]?.matchedToken).toBe("eclypsia");
    expect(r[0]?.matchedWord).toBe("eclipsia");
    expect(r[0]?.rule).toBe("distinctive");
  });

  it("regression (prod 2026-06-27): casual chit-chat fires nothing, a named poster still fires", () => {
    const m = new LocalPosterMatcher();
    // A poster whose title is made only of common words (the kind that misfired in prod),
    // plus a distinctive control poster.
    m.setPosters([
      { id: "femme-salon", title: "La Femme du Salon", fileUrl: "u", type: "image" },
      { id: "control", title: "Eclypsia", fileUrl: "u", type: "image" },
    ]);
    // Real segments from liveassist-2026-06-27_11-08-54.log — ordinary studio talk, no
    // poster named. The 4th line is the one that wrongly fired a card at 0.80.
    const chitchat = [
      "salon bavard le changer non",
      "le charger il est chargé",
      "En tout cas, d'avoir un salon, c'est bien.",
      "tout fermé, je me suis aperçu qu'en fait il fait bon",
      "qu'on soit bien dans le salon",
    ];
    for (const line of chitchat) {
      expect(m.match(line)).toHaveLength(0);
    }
    // The matcher still works: a genuinely-named distinctive poster fires.
    expect(m.match("on reçoit Eclypsia ce soir").map((x) => x.poster.id)).toContain("control");
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

  describe("show-domain context rule", () => {
    // "pilote" is an everyday French word (top-5000) → it must NOT fire alone, only when
    // the conversation is about a show. Default domain keywords incl. "spectacle"/"impro".
    it("does NOT fire an everyday-word title without a domain keyword nearby", () => {
      const m = new LocalPosterMatcher();
      m.setPosters([{ id: "x", title: "Pilote", fileUrl: "u", type: "image" }]);
      expect(m.match("le pilote de l'avion a décollé")).toHaveLength(0);
    });

    it("fires an everyday-word title when a domain keyword is in the same segment", () => {
      const m = new LocalPosterMatcher();
      m.setPosters([{ id: "x", title: "Pilote", fileUrl: "u", type: "image" }]);
      const r = m.match("ce soir un spectacle d'impro, on joue le Pilote");
      expect(r).toHaveLength(1);
      expect(r[0]?.rule).toBe("context");
    });

    it("fires when the domain keyword is only in the look-back context (earlier segment)", () => {
      const m = new LocalPosterMatcher();
      m.setPosters([{ id: "x", title: "Pilote", fileUrl: "u", type: "image" }]);
      // current segment names the title; the domain word lives in the recent context window.
      const r = m.match("on reçoit le Pilote", "c'est de l'impro ce soir on reçoit le Pilote");
      expect(r[0]?.poster.id).toBe("x");
      expect(r[0]?.rule).toBe("context");
      // …but with no domain keyword anywhere in context, the same everyday title stays silent.
      expect(m.match("on reçoit le Pilote", "on reçoit le Pilote")).toHaveLength(0);
    });

    it("a distinctive title still fires with no domain keyword at all", () => {
      const m = new LocalPosterMatcher();
      m.setPosters([{ id: "x", title: "Eclypsia", fileUrl: "u", type: "image" }]);
      expect(m.match("on reçoit Eclypsia")[0]?.rule).toBe("distinctive");
    });

    it("respects custom domain keywords", () => {
      const m = new LocalPosterMatcher();
      m.setPosters([{ id: "x", title: "Pilote", fileUrl: "u", type: "image" }]);
      m.setDomainKeywords(["festival"]);
      expect(m.match("un spectacle, le Pilote")).toHaveLength(0); // "spectacle" no longer a keyword
      expect(m.match("au festival, le Pilote")[0]?.rule).toBe("context");
    });

    it("a token that is itself a domain keyword never fires a poster alone", () => {
      const m = new LocalPosterMatcher();
      m.setPosters([
        { id: "a", title: "Mardi de l'impro", fileUrl: "u", type: "image" },
        { id: "b", title: "Caroline - Impro Club", fileUrl: "u", type: "image" },
      ]);
      // Generic talk about "l'impro" names no show — "impro" is a category word, not identity.
      expect(m.match("les professionnels de l'impro évidemment")).toHaveLength(0);
      // Naming a show by its IDENTITY token still fires it (and only it).
      const r = m.match("c'est le Mardi de l'impro ce soir");
      expect(r.map((x) => x.poster.id)).toEqual(["a"]);
    });

    it("treats a title's repeated word as one identity token (no self-corroboration)", () => {
      const m = new LocalPosterMatcher();
      // "boue" is everyday; the duplicated word must NOT count twice (else it would fire as
      // bogus 2-token corroboration / fail the mono-identity context gate).
      m.setPosters([{ id: "x", title: "Boue Boue", fileUrl: "u", type: "image" }]);
      expect(m.match("il y a de la boue partout")).toHaveLength(0); // one distinct everyday token, no context
      expect(m.match("un spectacle de Boue Boue")[0]?.rule).toBe("context"); // mono-identity + domain word
    });

    it("a multi-token title does not fire on a single everyday word via context", () => {
      const m = new LocalPosterMatcher();
      m.setPosters([{ id: "x", title: "La Petite Maison dans la prairie", fileUrl: "u", type: "image" }]);
      // A domain word is in context, but only the generic "petite" matched (1 of 3 id tokens).
      expect(m.match("on fasse une petite date", "un spectacle puis une petite date")).toHaveLength(0);
      // Genuinely naming it (distinctive token / corroboration) still fires.
      expect(m.match("La Petite Maison dans la prairie").length).toBeGreaterThan(0);
    });

    it("an ambiguous token shared by ≥2 titles does not fire those posters alone", () => {
      const m = new LocalPosterMatcher();
      m.setPosters([
        { id: "ding", title: "Thierry - Ding", fileUrl: "u", type: "image" },
        { id: "new", title: "Thierry - NEW", fileUrl: "u", type: "image" },
        { id: "round", title: "Thierry - Next Round Return", fileUrl: "u", type: "image" },
        { id: "emeline", title: "Emeline", fileUrl: "u", type: "image" }, // unique
      ]);
      // "thierry" is rare but shared across 3 titles → identifies none of them alone.
      expect(m.match("Thierry était là aussi pour aider")).toHaveLength(0);
      // A title-unique token disambiguates → fires that ONE poster.
      expect(m.match("on enchaîne avec Thierry Ding").map((x) => x.poster.id)).toEqual(["ding"]);
      // A genuinely unique single-title token still fires alone.
      expect(m.match("merci à Emeline").map((x) => x.poster.id)).toEqual(["emeline"]);
    });
  });
});
