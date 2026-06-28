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
  windowBeforeSec: z.number().int().nonnegative().default(LIVE_ASSIST.WINDOW_BEFORE_SEC),
  windowAfterSec: z.number().int().nonnegative().default(LIVE_ASSIST.WINDOW_AFTER_SEC),
  confidenceThreshold: z.number().min(0).max(1).default(LIVE_ASSIST.CONFIDENCE_THRESHOLD),
});
export type LiveAssistSettings = z.infer<typeof LiveAssistSettingsSchema>;

/**
 * Bring stored Live Assist settings forward to the current provider set without
 * surprising the user:
 *  (a) additively surface any default provider key missing from the stored map
 *      (e.g. the `poster-tmdb` provider added after a config was first saved), and
 *  (b) ONLY if the stored `poster` keywords are still the exact pre-split legacy
 *      default, migrate them to the new split (film/série moved to `poster-tmdb`).
 * A customised config is left untouched.
 */
export function migrateLiveAssistSettings(s: LiveAssistSettings): LiveAssistSettings {
  const kw: Record<string, string[]> = { ...s.keywordsByProvider };
  const eq = (a: string[] | undefined, b: readonly string[]) =>
    !!a && a.length === b.length && a.every((v, i) => v === b[i]);
  if (eq(kw.poster, LIVE_ASSIST.LEGACY_POSTER_KEYWORDS)) {
    kw.poster = [...LIVE_ASSIST.DEFAULT_KEYWORDS.poster];
  }
  for (const [pid, words] of Object.entries(LIVE_ASSIST.DEFAULT_KEYWORDS)) {
    if (!kw[pid]) kw[pid] = [...words];
  }
  return { ...s, keywordsByProvider: kw };
}

/** WebSocket event payloads on the `live-assist` channel. */
export type LiveAssistEvent =
  | { type: "suggestion:new"; payload: { suggestion: Suggestion } }
  | { type: "suggestion:update"; payload: { id: string; status: Suggestion["status"] } }
  | { type: "suggestions:cleared"; payload: Record<string, never> }
  | { type: "stt:status"; payload: { connected: boolean; device: string | null } }
  | { type: "transcript"; payload: { text: string; t0: number; t1: number } };
