// scripts/generate-common-words.mjs
//
// Regenerates a "common words" set used by the Live Assist LocalPosterMatcher to decide
// whether a matched poster-title token is a GENERAL word (can't fire a poster on its own —
// needs a show-domain keyword in context, or a 2nd matching token) or a SPECIFIC one
// (proper noun / made-up show name like "Eclypsia" → fires alone). Data, not hand-crafted.
//
// We gate on common words in French AND English (titles mix both, and imported junk titles
// are often English), plus bare numbers (handled in code, not here).
//
// Source: hermitdave/FrequencyWords (OpenSubtitles 2018).
//   curl -sSL .../content/2018/fr/fr_50k.txt -o fr_50k.txt
//   curl -sSL .../content/2018/en/en_50k.txt -o en_50k.txt
//   node scripts/generate-common-words.mjs fr_50k.txt 15000 FRENCH_COMMON_WORDS French  > lib/config/frenchCommonWords.ts
//   node scripts/generate-common-words.mjs en_50k.txt  9000 ENGLISH_COMMON_WORDS English > lib/config/englishCommonWords.ts
//
// Calibration (against the real poster library): French top-15000 catches "féminin"(#7426),
// "design"(#9244), "construction"(#4261), "masculin"(#9664), "building"(#11181) as general
// while "casseroles"(#20267), "blackout"(#30806), "pluriel"(#24331) and made-up names stay
// specific. English top-9000 catches "network"/"design"/"building"/"video"/"automatic" while
// keeping "blackout"(#9561) firable. Raise N for stricter, lower for looser.

import { readFileSync } from "node:fs";

// Mirror of norm() in lib/services/liveassist/KeywordDetector.ts — kept inline so this
// generator has no TS/build dependency. Keep in sync if norm() ever changes.
const norm = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’‘ʼ´`]/g, "'");

const MIN_LEN = 4; // matches LOCAL_POSTER_MIN_TOKEN_LEN

const [, , file, nArg, varName = "COMMON_WORDS", label = ""] = process.argv;
if (!file) {
  console.error("usage: node generate-common-words.mjs <freq-file> [topN=15000] [VAR_NAME] [Label]");
  process.exit(1);
}
const topN = Number(nArg ?? 15000);

const lines = readFileSync(file, "utf-8").split(/\r?\n/).slice(0, topN);
const words = new Set();
for (const line of lines) {
  const surface = line.split(/\s+/)[0];
  if (!surface) continue;
  for (const tok of norm(surface).split(/[^a-z0-9]+/)) {
    if (tok.length >= MIN_LEN) words.add(tok);
  }
}

const sorted = [...words].sort();

const header = `// lib/config/${varName === "ENGLISH_COMMON_WORDS" ? "english" : "french"}CommonWords.ts
//
// GENERATED — do not edit by hand. Regenerate with scripts/generate-common-words.mjs.
// Source: hermitdave/FrequencyWords (OpenSubtitles 2018) ${label || "?"} 50k, top ${topN} surface
// forms, normalized (lowercase + NFD accent-strip + apostrophe-fold) and split on
// non-alphanumerics, keeping sub-tokens >= ${MIN_LEN} chars (same norm()/tokenizer as the
// LocalPosterMatcher). ${sorted.length} entries.
//
// Purpose: part of the "general word" gate for the local-poster fast-path. A spoken word
// that maps to a common ${label || "?"} word cannot, on its own, fire a poster suggestion — it
// needs a show-domain keyword in context, or a 2nd corroborating token. Only a specific
// (non-general) token — a proper noun / made-up show name — fires alone. See commonWords.ts.

/** Common ${label || "?"} words that must not single-handedly trigger a local-poster match. */
export const ${varName}: ReadonlySet<string> = new Set([
`;

let body = "";
let line = " ";
for (const w of sorted) {
  const piece = ` "${w}",`;
  if ((line + piece).length > 96) {
    body += line + "\n";
    line = " ";
  }
  line += piece;
}
if (line.trim()) body += line + "\n";

process.stdout.write(header + body + "]);\n");
