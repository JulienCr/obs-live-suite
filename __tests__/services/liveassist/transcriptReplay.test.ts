import { readFileSync } from "fs";
import { join } from "path";
import {
  parseTranscriptSegments,
  replayLocalPosters,
  formatProposal,
} from "@/lib/services/liveassist/transcriptReplay";
import type { MatchablePoster } from "@/lib/services/liveassist/LocalPosterMatcher";

// A recorded prod session (chit-chat, no poster named) that wrongly fired a local-poster
// card at 0.80 under the old rules. Replaying it "sans les suggestions" must now propose
// nothing. This is the regression that guards the matching rules against re-loosening.
const fixture = readFileSync(
  join(__dirname, "../../fixtures/liveassist/prod-2026-06-27.log"),
  "utf-8",
);

describe("transcript replay (local posters)", () => {
  describe("parseTranscriptSegments", () => {
    it("strips timestamps and drops the >> SUGGESTION / >> SHADOW marker lines", () => {
      const segments = parseTranscriptSegments(fixture);
      expect(segments).toContain("tout fermé, je me suis aperçu qu'en fait il fait bon");
      // The recorder's marker line is removed (that's the "sans les suggestions" part).
      expect(segments.some((s) => s.startsWith(">>"))).toBe(false);
      expect(segments.some((s) => s.includes("0f184264"))).toBe(false);
      // No leading "[HH:MM:SS]" survives.
      expect(segments.every((s) => !/^\[\d{2}:\d{2}:\d{2}\]/.test(s))).toBe(true);
    });
  });

  it("regression: the real 2026-06-27 chit-chat proposes NOTHING (collision-prone library)", () => {
    // Titles built only from common words — exactly the kind that misfired in prod.
    const library: MatchablePoster[] = [
      { id: "femme-salon", title: "La Femme du Salon", fileUrl: "u", type: "image" },
      { id: "salon", title: "Le Salon", fileUrl: "u", type: "image" },
      // A distinctive control that WOULD fire if named — it never is in this session.
      { id: "control", title: "Eclypsia", fileUrl: "u", type: "image" },
    ];
    const proposals = replayLocalPosters(parseTranscriptSegments(fixture), library);
    // Surface what (if anything) it would propose, for eyeballing when the test is run.
    if (proposals.length) {
      // eslint-disable-next-line no-console
      console.log("UNEXPECTED proposals:\n" + proposals.map(formatProposal).join("\n"));
    }
    expect(proposals).toHaveLength(0);
  });

  it("still proposes a genuinely-named poster, with explainable word→token/rule", () => {
    const library: MatchablePoster[] = [
      { id: "control", title: "Eclypsia", fileUrl: "u", type: "image" },
    ];
    // A transcript that DOES name the poster (incl. an STT typo on the long token).
    const segments = parseTranscriptSegments(
      "[12:00:00] on reçoit Éclipsia ce soir\n[12:00:02] >> SUGGESTION local-poster « x » (0.99)",
    );
    const proposals = replayLocalPosters(segments, library);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]?.match.poster.id).toBe("control");
    expect(proposals[0]?.match.matchedToken).toBe("eclypsia");
    expect(proposals[0]?.match.rule).toBe("distinctive");
  });

  it("honors the domain-keyword context window across segments", () => {
    const library: MatchablePoster[] = [{ id: "pilote", title: "Pilote", fileUrl: "u", type: "image" }];
    // Domain word in an earlier segment, everyday-word title later → the rolling context
    // window corroborates it (rule `context`).
    const proposals = replayLocalPosters(
      ["c'est un spectacle d'impro ce soir", "et on enchaîne avec le Pilote"],
      library,
    );
    expect(proposals).toHaveLength(1);
    expect(proposals[0]?.match.rule).toBe("context");
    // Same title with no show context anywhere → stays silent.
    expect(replayLocalPosters(["et on enchaîne avec le Pilote"], library)).toHaveLength(0);
  });
});
