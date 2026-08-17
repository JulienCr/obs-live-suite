import { TheaterDbMatcher, type TheaterDbSearchFn } from "@/lib/services/liveassist/TheaterDbMatcher";
import type { TheatreCandidate } from "@/lib/services/TheaterDataResolverService";

const candidate = (id: number, title: string): TheatreCandidate => ({
  id,
  title,
  tagline: "",
  univers: "",
  posterUrl: `http://localhost:4173/poster/${id}`,
});

/** A search stub that records its query and returns a fixed candidate list. */
function stubSearch(result: TheatreCandidate[]): { fn: TheaterDbSearchFn; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    fn: async (query) => {
      calls.push(query);
      return result;
    },
  };
}

describe("TheaterDbMatcher", () => {
  it("queries the title announced after the domain word (real: Le Retour de Richard)", async () => {
    // Regression: "retour" is a stop-word and "richard" is a common-word/name — the old
    // distinctive-token gate dropped BOTH, so theater-db never fired. Now the query is the
    // phrase after the domain word ("spectacle"), keeping the real title words.
    const search = stubSearch([candidate(305193, "Le retour de Richard 3 par le train de 09h24")]);
    const m = new TheaterDbMatcher(search.fn);
    const r = await m.match("j'aimerais qu'on parle du spectacle Le Retour de Richard");
    expect(search.calls[0]).toContain("retour");
    expect(search.calls[0]).toContain("richard");
    expect(search.calls[0]).not.toContain("aimerais"); // words BEFORE the domain keyword are excluded
    expect(r).toHaveLength(1);
    expect(r[0].candidate.id).toBe(305193);
    expect(r[0].score).toBe(1);
  });

  it("also anchors on « la pièce » / « le film » / « théâtre »", async () => {
    const search = stubSearch([candidate(1, "Cassandre")]);
    const m = new TheaterDbMatcher(search.fn);
    for (const phrase of ["on parle de la pièce Cassandre", "le film Cassandre", "au théâtre, Cassandre ce soir"]) {
      search.calls.length = 0;
      const r = await m.match(phrase);
      expect(r).toHaveLength(1);
      expect(search.calls[0]).toContain("cassandre");
    }
  });

  it("does NOT fire (and does not search) without a show-domain word", async () => {
    const search = stubSearch([candidate(1, "Cassandre")]);
    const m = new TheaterDbMatcher(search.fn);
    const r = await m.match("Cassandre était là hier soir");
    expect(r).toHaveLength(0);
    expect(search.calls).toHaveLength(0); // cheap gate short-circuits before the network
  });

  it("post-filter rejects an accroche-only hit whose TITLE shares no term", async () => {
    // theater-data FTS matches accroche too; the post-filter must reject a show whose title
    // shares no token with the query (e.g. « Intra Muros » matched via « Richard » in its accroche).
    const search = stubSearch([candidate(185291, "Intra Muros d'Alexis Michalik")]);
    const m = new TheaterDbMatcher(search.fn);
    const r = await m.match("on parle du spectacle Le Retour de Richard");
    expect(search.calls).toHaveLength(1); // it DID query
    expect(r).toHaveLength(0); // but the title shares no term with "retour richard"
  });

  it("tolerates an STT typo on a long title token WHEN the base still returns the show", async () => {
    // Scope note, so this test is not read as more than it is: the typo tolerance lives in
    // SCORING, after retrieval. The stub returns "Eclypsia" whatever the query, which stands
    // in for a base able to surface the show from a misspelt term. Against the real
    // theater-data FTS the query is exact and AND-based, so "eclipsia" returns nothing and
    // fuzzyScore never runs — see the KNOWN LIMIT on TheaterDbMatcher. Making the tolerance
    // reach retrieval needs a fuzzy/trigram search on the theater-data side.
    const search = stubSearch([candidate(1, "Eclypsia")]);
    const m = new TheaterDbMatcher(search.fn);
    const r = await m.match("le spectacle Eclipsia arrive"); // spoken "eclipsia" vs title "eclypsia"
    expect(search.calls[0]).toContain("eclipsia"); // the misspelt term is what reaches the base
    expect(r).toHaveLength(1);
    expect(r[0].score).toBeGreaterThan(0.8);
  });

  it("degrades to [] when the base is down (search returns [])", async () => {
    const search = stubSearch([]);
    const m = new TheaterDbMatcher(search.fn);
    const r = await m.match("le spectacle Cassandre");
    expect(r).toHaveLength(0);
  });

  it("treats the current segment as the title when the domain word is only in the look-back", async () => {
    const search = stubSearch([candidate(1, "Cassandre")]);
    const m = new TheaterDbMatcher(search.fn);
    // "spectacle" was in the previous segment (look-back), the title in the current one.
    const r = await m.match("Le Retour de Cassandre", "on va parler d'un spectacle. Le Retour de Cassandre");
    expect(r).toHaveLength(1);
    expect(search.calls[0]).toContain("cassandre");
  });

  it("stops the title at the first commentary word (does NOT send the whole sentence)", async () => {
    // Real transcripts: the title is followed by lots of commentary. The query must be ONLY
    // the title words, else the AND-based FTS returns nothing.
    const search = stubSearch([candidate(1, "Roméo et Juliette")]);
    const m = new TheaterDbMatcher(search.fn);
    await m.match(
      "Je crois qu'il faut qu'on parle de la pièce Roméo et Juliette Ah ouais c'est une super pièce Je me souviens Mais je crois que je suis sous hypnose à ce moment là",
    );
    // "et" (title-internal connector) stays; "ah"/"ouais"/"je"/"crois"/"mais" (commentary) are cut.
    expect(search.calls[0]).toBe("romeo juliette");

    search.calls.length = 0;
    await m.match(
      "Ok je crois qu'il faut qu'on parle du spectacle le retour de Richard mais je crois que aussi je suis sous hypnose alors est-ce que c'est une bonne idée ?",
    );
    expect(search.calls[0]).toBe("retour richard"); // cut at "mais"
  });

  it("fires on a performer NAME (cast/accroche match) even when the title shares nothing", async () => {
    // "un spectacle avec X" — X is a person; theater-data FTS finds their show via the cast, whose
    // TITLE ("Bad trip") contains neither "roxane" nor "michelet". A proper-name query is allowed
    // to fire on that FTS-only match.
    const search = stubSearch([candidate(346674, "Bad trip")]);
    const m = new TheaterDbMatcher(search.fn);
    const r = await m.match("c'est une pièce avec Roxane Michelet");
    expect(search.calls[0]).toBe("roxane michelet"); // "avec" is dropped as a function word
    expect(r).toHaveLength(1);
    expect(r[0].candidate.id).toBe(346674);
    expect(r[0].score).toBeCloseTo(0.7); // FTS-only match → lower confidence than a title match
  });

  it("does NOT fire on common-word conversation with no title match (« génial ce soir »)", async () => {
    // The FTS returns shows (it matches accroche broadly), but the query terms are all common
    // words — conversation, not a show name — so no card fires.
    const search = stubSearch([candidate(1, "Un succès fou avec Sébastien Castro")]);
    const m = new TheaterDbMatcher(search.fn);
    const r = await m.match("un spectacle génial ce soir");
    expect(search.calls).toHaveLength(1); // it DID query "genial soir"
    expect(r).toHaveLength(0); // …but neither term is a proper name → no fire
  });

  it("keeps a connector (« et ») inside the title, not as a boundary", async () => {
    const search = stubSearch([candidate(1, "Le Roi et l'Oiseau")]);
    const m = new TheaterDbMatcher(search.fn);
    await m.match("le film Le Roi et l'Oiseau je crois");
    expect(search.calls[0]).toBe("roi oiseau"); // "et"/"l" dropped as function words, not a cut
  });

  it("keeps a boundary word that OPENS the title", async () => {
    const search = stubSearch([candidate(1, "Je suis la maman du bourreau")]);
    const m = new TheaterDbMatcher(search.fn);
    const r = await m.match("le spectacle Je suis la maman du bourreau");
    // "je" is a boundary word, but the word right after the domain anchor opens the
    // title by construction — cutting there would search nothing at all.
    expect(search.calls[0]).toBe("suis maman bourreau");
    expect(r).toHaveLength(1);
  });

  it("still cuts on a boundary word that FOLLOWS the title", async () => {
    const search = stubSearch([candidate(1, "Cassandre")]);
    const m = new TheaterDbMatcher(search.fn);
    await m.match("le spectacle Cassandre je crois");
    expect(search.calls[0]).toBe("cassandre");
  });

  it("skips a barren domain anchor instead of giving up on the segment", async () => {
    const search = stubSearch([candidate(1, "Le Concert")]);
    const m = new TheaterDbMatcher(search.fn);
    // "concert" is both a domain word and the title; the span after it is empty, so it
    // must not preempt "spectacle", the anchor that actually introduced the title.
    await m.match("le spectacle Le Concert");
    expect(search.calls[0]).toBe("concert");
  });

  it("keeps a domain word that is part of the title, dropping only the anchor", async () => {
    const search = stubSearch([candidate(1, "Impro")]);
    const m = new TheaterDbMatcher(search.fn);
    await m.match("le spectacle Impro");
    expect(search.calls[0]).toBe("impro");
  });

  it("does not over-constrain the FTS: caps the query terms", async () => {
    const search = stubSearch([candidate(1, "X")]);
    const m = new TheaterDbMatcher(search.fn);
    await m.match("le spectacle alpha bravo charlie delta echo foxtrot golf hotel india");
    expect(search.calls[0].split(" ").length).toBeLessThanOrEqual(6);
  });
});
