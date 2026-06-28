// scripts/replay-local-posters.ts
//
// Replay a recorded Live Assist transcript through the CURRENT local-poster matching
// rules, against the REAL poster library, to see what the fast-path WOULD propose —
// "sans les suggestions": the recorder's own >> SUGGESTION/>> SHADOW lines are stripped.
//
//   pnpm replay:liveassist <transcript.log> [--db <data.db>] [--min <0-1>] [--window <sec>]
//
// Reads posters AND the saved Live Assist settings straight from SQLite (read-only); no
// backend needs to be running. The DB path defaults to PathManager's resolution (the same
// file the app uses). Similarity + domain keywords come from the saved settings; --min and
// --window override the fuzz bar / look-back for what-if tuning.
//
// Run via tsx:  tsx scripts/replay-local-posters.ts <log>   (or the pnpm alias above)

import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { PathManager } from "@/lib/config/PathManager";
import { LiveAssistSettingsSchema } from "@/lib/models/LiveAssist";
import {
  parseTranscriptLog,
  replayLocalPosters,
  formatProposal,
} from "@/lib/services/liveassist/transcriptReplay";
import type { MatchablePoster } from "@/lib/services/liveassist/LocalPosterMatcher";

const USAGE = "usage: pnpm replay:liveassist <transcript.log> [--db <data.db>] [--min <0-1>] [--window <sec>]";
const die = (msg: string): never => {
  console.error(`${msg}\n${USAGE}`);
  process.exit(1);
};

let logFile: string | undefined;
let dbOverride: string | undefined;
let minStr: string | undefined;
let windowStr: string | undefined;
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--db" || a === "--min" || a === "--window") {
    // A flag must be followed by a real value, not end-of-args or another flag.
    const v = argv[++i];
    if (v === undefined || v.startsWith("--")) die(`${a} requires a value`);
    if (a === "--db") dbOverride = v;
    else if (a === "--min") minStr = v;
    else windowStr = v;
  } else if (!a.startsWith("--") && !logFile) {
    logFile = a;
  }
}

if (!logFile) die("missing <transcript.log>");

// Parse --min/--window up front so a typo fails fast with a clear message rather than
// silently passing NaN into the matcher (which would make every comparison fail → 0 proposals).
const num = (s: string | undefined, flag: string): number | undefined => {
  if (s === undefined) return undefined;
  const n = Number(s);
  if (!Number.isFinite(n)) die(`${flag} must be a number, got "${s}"`);
  return n;
};
const minOverride = num(minStr, "--min");
const windowOverride = num(windowStr, "--window");

const safeJson = (s: unknown): Record<string, unknown> | null => {
  if (typeof s !== "string" || !s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const dbPath = dbOverride ?? PathManager.getInstance().getDatabasePath();
const db = new Database(dbPath, { readonly: true });
const rows = db
  .prepare("SELECT id, title, fileUrl, type, thumbnailUrl, startTime, endTime, endBehavior, metadata FROM posters")
  .all() as Array<Record<string, unknown>>;
// Read the SAVED Live Assist settings so the replay reflects the user's ACTUAL config
// (custom domain keywords / similarity), not just the constant defaults. Falls back to
// schema defaults when the row is absent/unparseable. CLI flags still override below.
const settingsRow = db.prepare("SELECT value FROM settings WHERE key = ?").get("liveAssist") as
  | { value?: string }
  | undefined;
const settings = LiveAssistSettingsSchema.parse(safeJson(settingsRow?.value) ?? {});
db.close();

const posters: MatchablePoster[] = rows.map((r) => ({
  id: String(r.id),
  title: String(r.title ?? ""),
  fileUrl: String(r.fileUrl ?? ""),
  type: String(r.type ?? "image"),
  thumbnailUrl: (r.thumbnailUrl as string | null) ?? null,
  startTime: (r.startTime as number | null) ?? null,
  endTime: (r.endTime as number | null) ?? null,
  endBehavior: (r.endBehavior as "stop" | "loop" | null) ?? null,
  metadata: safeJson(r.metadata),
}));

// Parse with timestamps so the context look-back uses the REAL time window (windowBeforeSec),
// faithful to live. Similarity + domain keywords come from the SAVED settings; --min / --window
// override the fuzz bar and look-back seconds for what-if tuning.
const segments = parseTranscriptLog(readFileSync(logFile!, "utf-8"));
const proposals = replayLocalPosters(segments, posters, {
  minSimilarity: minOverride ?? settings.localPosterMinSimilarity,
  domainKeywords: settings.localPosterDomainKeywords,
  ...(windowOverride !== undefined ? { windowBeforeSec: windowOverride } : {}),
});

console.log(`DB: ${dbPath}`);
console.log(
  `Replayed ${segments.length} segment(s) against ${posters.length} poster(s) → ${proposals.length} proposal(s)\n`,
);
if (proposals.length) {
  for (const p of proposals) console.log("  • " + formatProposal(p));
} else {
  console.log("  (nothing — the fast-path would stay silent on this transcript)");
}
