import { LocalPosterMatcher, type MatchablePoster, type PosterMatch } from "./LocalPosterMatcher";
import { LIVE_ASSIST } from "@/lib/config/Constants";

/**
 * Strip the TranscriptRecorder framing from a recorded `.log` and return just the spoken
 * segments — the inverse of the recorder's line format. Drops the `[HH:MM:SS]` timestamp
 * and every `>> SUGGESTION` / `>> SHADOW` marker line, so a past session can be replayed
 * "sans les suggestions" to see what the CURRENT rules would propose.
 */
export function parseTranscriptSegments(raw: string): string[] {
  return parseTranscriptLog(raw).map((s) => s.text);
}

/** One spoken segment with its recorded wall-clock offset (seconds). */
export interface TimedSegment {
  tSec: number;
  text: string;
}

/**
 * Parse a recorded `.log` into timestamped segments — keeps the `[HH:MM:SS]` offset (so the
 * replay can reproduce the live time-based look-back window) and drops the `>> SUGGESTION` /
 * `>> SHADOW` marker lines. A line with no timestamp inherits the previous one's offset.
 */
export function parseTranscriptLog(raw: string): TimedSegment[] {
  const out: TimedSegment[] = [];
  let last = 0;
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\[(\d{2}):(\d{2}):(\d{2})\]\s*(.*)$/);
    const text = (m ? m[4] : line).trim();
    const tSec = m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : last;
    last = tSec;
    if (!text || text.startsWith(">>")) continue;
    out.push({ tSec, text });
  }
  return out;
}

export interface ReplayProposal {
  segment: string;
  match: PosterMatch;
}

export interface ReplayOptions {
  minSimilarity?: number;
  /** Show-domain keywords enabling the `context` rule (defaults to the LIVE_ASSIST set). */
  domainKeywords?: string[];
  /** Time-based look-back (seconds) for the `context` window when items are `TimedSegment[]` —
   *  mirrors the live `windowBeforeSec`. Default `LIVE_ASSIST.WINDOW_BEFORE_SEC`. */
  windowBeforeSec?: number;
  /** Fallback rolling window (segment count) when items are plain strings (no timestamps). Default 3. */
  contextSegments?: number;
}

const isTimed = (items: string[] | TimedSegment[]): items is TimedSegment[] =>
  items.length > 0 && typeof (items[0] as TimedSegment).text === "string";

/**
 * Replay transcript segments through the LocalPosterMatcher and return every would-be
 * proposal under the current rules (what the fast-path WOULD surface). The matcher's context
 * (scanned for domain keywords) is the recent look-back: a real `windowBeforeSec` time window
 * when given `TimedSegment[]` (faithful to live), or a rolling `contextSegments` count for plain
 * strings. Pure: no I/O — shared by the regression test and the `replay:liveassist` CLI.
 */
export function replayLocalPosters(
  items: string[] | TimedSegment[],
  posters: MatchablePoster[],
  opts: ReplayOptions = {},
): ReplayProposal[] {
  const matcher = new LocalPosterMatcher();
  matcher.setPosters(posters, opts.minSimilarity);
  matcher.setDomainKeywords(opts.domainKeywords ?? [...LIVE_ASSIST.LOCAL_POSTER_DOMAIN_KEYWORDS]);

  const timed = isTimed(items);
  const segs = timed ? (items as TimedSegment[]) : (items as string[]).map((text) => ({ tSec: 0, text }));
  const windowSec = opts.windowBeforeSec ?? LIVE_ASSIST.WINDOW_BEFORE_SEC;
  const k = Math.max(1, opts.contextSegments ?? 3);

  const proposals: ReplayProposal[] = [];
  // Sliding lower bound for the timed window — segments are chronological (non-decreasing
  // tSec), so `start` only advances, keeping the whole replay O(n) instead of O(n²).
  let start = 0;
  for (let i = 0; i < segs.length; i++) {
    let context: string;
    if (timed) {
      while (segs[start].tSec < segs[i].tSec - windowSec) start++;
      context = segs.slice(start, i + 1).map((s) => s.text).join(" ");
    } else {
      context = segs.slice(Math.max(0, i - k + 1), i + 1).map((s) => s.text).join(" ");
    }
    for (const match of matcher.match(segs[i].text, context)) {
      proposals.push({ segment: segs[i].text, match });
    }
  }
  return proposals;
}

/** One-line, human-readable rendering of a proposal (matched word→token, score, rule). */
export function formatProposal({ segment, match }: ReplayProposal): string {
  const { poster, matchedWord, matchedToken, score, rule } = match;
  return `« ${poster.title} » (${score.toFixed(2)}) via ${matchedWord}→${matchedToken} [${rule}]  ⟵  "${segment}"`;
}
