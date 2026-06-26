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
  inputDevice: z.string().nullable().default(null),
  whisperModel: z.string().default(LIVE_ASSIST.DEFAULT_WHISPER_MODEL),
  keywordsByProvider: z
    .record(z.string(), z.array(z.string()))
    .default(LIVE_ASSIST.DEFAULT_KEYWORDS),
  windowBeforeSec: z.number().int().positive().default(LIVE_ASSIST.WINDOW_BEFORE_SEC),
  windowAfterSec: z.number().int().positive().default(LIVE_ASSIST.WINDOW_AFTER_SEC),
  confidenceThreshold: z.number().min(0).max(1).default(LIVE_ASSIST.CONFIDENCE_THRESHOLD),
});
export type LiveAssistSettings = z.infer<typeof LiveAssistSettingsSchema>;

/** WebSocket event payloads on the `live-assist` channel. */
export type LiveAssistEvent =
  | { type: "suggestion:new"; payload: { suggestion: Suggestion } }
  | { type: "suggestion:update"; payload: { id: string; status: Suggestion["status"] } }
  | { type: "stt:status"; payload: { connected: boolean; device: string | null } }
  | { type: "transcript"; payload: { text: string; t0: number; t1: number } };
