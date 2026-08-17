import { z } from "zod";
import { LIVE_ASSIST } from "@/lib/config/Constants";

export const TranscriptSegmentSchema = z
  .object({
    text: z.string(),
    t0: z.number(),
    t1: z.number(),
    final: z.boolean(),
    confidence: z.number().min(0).max(1).optional(),
  })
  .refine((s) => s.t1 >= s.t0, { message: "t1 must be >= t0" });
export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;

export const SuggestionPreviewSchema = z.object({
  kind: z.enum(["image", "text"]),
  imageUrl: z.string().optional(),
  text: z.string().optional(),
});
export type SuggestionPreview = z.infer<typeof SuggestionPreviewSchema>;

export const SuggestionStatusSchema = z.enum(["pending", "applied", "dismissed"]);

export const SuggestionSchema = z.object({
  id: z.string(),
  intent: z.string(),
  entity: z.string(),
  title: z.string(),
  preview: SuggestionPreviewSchema,
  triggerExcerpt: z.string(),
  applyPayload: z.record(z.string(), z.unknown()).default({}),
  status: SuggestionStatusSchema.default("pending"),
  confidence: z.number().min(0).max(1),
  createdAt: z.number(),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;

export const SttDeviceSchema = z.object({ id: z.string(), label: z.string() });
export type SttDevice = z.infer<typeof SttDeviceSchema>;

export const LiveAssistSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  /**
   * Re-broadcast each finalized STT segment over the `live-assist` websocket so
   * the panel can show a live "Transcription (debug)" view. Off by default: it's
   * a debug aid, and broadcasting every segment to all subscribers is wasted
   * fan-out when nobody is watching it.
   */
  transcriptDebug: z.boolean().default(false),
  inputDevice: z.string().nullable().default(null),
  whisperModel: z.string().default(LIVE_ASSIST.DEFAULT_WHISPER_MODEL),
  keywordsByProvider: z
    .record(z.string(), z.array(z.string()))
    .default(LIVE_ASSIST.DEFAULT_KEYWORDS),
  /** Per-provider extraction guidance overriding the provider's default context prompt. */
  contextPromptsByProvider: z.record(z.string(), z.string()).default({}),
  /** LocalPosters: fuzzy-match spoken words against existing poster titles (no LLM). */
  localPostersEnabled: z.boolean().default(true),
  /** Similarity bar (0–1) for a local poster title match; higher = stricter. */
  localPosterMinSimilarity: z.number().min(0).max(1).default(LIVE_ASSIST.LOCAL_POSTER_MIN_SIMILARITY),
  /** Dry-run: compute & LOG would-be local-poster matches without firing any card.
   *  Lets you replay real transcripts and measure precision before trusting the gate. */
  localPostersShadow: z.boolean().default(false),
  /** Show-domain keywords that let an everyday-word poster title fire when spoken in
   *  context (e.g. "Pilote" fires near "spectacle"/"impro"). Distinctive titles ignore this. */
  localPosterDomainKeywords: z.array(z.string()).default([...LIVE_ASSIST.LOCAL_POSTER_DOMAIN_KEYWORDS]),
  /** theater-db fast-path: query the remote BilletReduc base (:4173) directly, with NO LLM,
   *  when a distinctive word is spoken in show context. The remote sibling of local-poster. */
  theaterDbEnabled: z.boolean().default(true),
  /** Dry-run: compute & LOG would-be theater-db matches without firing any card. */
  theaterDbShadow: z.boolean().default(false),
  /** Similarity bar (0–1) between a spoken distinctive word and a returned show title;
   *  higher = stricter (guards against theater-data's full-text returning a tangential show). */
  theaterDbMinSimilarity: z.number().min(0).max(1).default(LIVE_ASSIST.LOCAL_POSTER_MIN_SIMILARITY),
  windowBeforeSec: z.number().int().nonnegative().default(LIVE_ASSIST.WINDOW_BEFORE_SEC),
  windowAfterSec: z.number().int().nonnegative().default(LIVE_ASSIST.WINDOW_AFTER_SEC),
  confidenceThreshold: z.number().min(0).max(1).default(LIVE_ASSIST.CONFIDENCE_THRESHOLD),
});
export type LiveAssistSettings = z.infer<typeof LiveAssistSettingsSchema>;

/**
 * Bring stored Live Assist settings forward to the current provider set without
 * surprising the user:
 *  (a) migrate an untouched `poster` keyword list forward: the pre-tmdb-split legacy
 *      default → the current default; and the tmdb-split-era default (théâtre still on
 *      Wikipedia) → EMPTY, since théâtre moved to the non-LLM fast-paths and `poster`
 *      (Wikipedia) is now dormant. A customised `poster` list is left untouched.
 *  (b) prune the `poster-theatre` key/prompt: it became the `theater-db` fast-path,
 *      which has no keyword list — leaving the key would show a ghost editor row.
 *  (c) additively surface any default provider key missing from the stored map.
 */
export function migrateLiveAssistSettings(s: LiveAssistSettings): LiveAssistSettings {
  const kw: Record<string, string[]> = { ...s.keywordsByProvider };
  const eq = (a: string[] | undefined, b: readonly string[]) =>
    !!a && a.length === b.length && a.every((v, i) => v === b[i]);
  if (eq(kw.poster, LIVE_ASSIST.LEGACY_POSTER_KEYWORDS)) {
    kw.poster = [...LIVE_ASSIST.DEFAULT_KEYWORDS.poster];
  }
  if (eq(kw.poster, LIVE_ASSIST.POSTER_KEYWORDS_PRE_FASTPATH)) {
    kw.poster = []; // théâtre moved to fast-paths → Wikipedia poster goes dormant
  }
  delete kw["poster-theatre"]; // now the theater-db fast-path (no keyword list)
  for (const [pid, words] of Object.entries(LIVE_ASSIST.DEFAULT_KEYWORDS)) {
    if (!kw[pid]) kw[pid] = [...words];
  }
  const prompts: Record<string, string> = { ...(s.contextPromptsByProvider ?? {}) };
  delete prompts["poster-theatre"];
  // Saved settings carry this array explicitly, so its Zod default only ever applies to a
  // fresh install. Without this an upgraded one keeps the pre-"affiche" list, and
  // "affiche <titre>" silently fails to reach the fast-paths there. Only an exactly
  // untouched list is refreshed; a customized one is left alone.
  const domainKeywords = eq(s.localPosterDomainKeywords, LIVE_ASSIST.LEGACY_DOMAIN_KEYWORDS)
    ? [...LIVE_ASSIST.LOCAL_POSTER_DOMAIN_KEYWORDS]
    : s.localPosterDomainKeywords;
  return {
    ...s,
    keywordsByProvider: kw,
    contextPromptsByProvider: prompts,
    localPosterDomainKeywords: domainKeywords,
  };
}

/** WebSocket event payloads on the `live-assist` channel. */
export type LiveAssistEvent =
  | { type: "suggestion:new"; payload: { suggestion: Suggestion } }
  | { type: "suggestion:update"; payload: { id: string; status: Suggestion["status"] } }
  | { type: "suggestions:cleared"; payload: Record<string, never> }
  | { type: "stt:status"; payload: { connected: boolean; device: string | null } }
  | { type: "transcript"; payload: { text: string; t0: number; t1: number } };
