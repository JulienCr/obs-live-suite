import { z } from "zod";
import { WORD_HARVEST } from "@/lib/config/Constants";

// =============================================================================
// Word Harvest Phases & Status
// =============================================================================

export type WordHarvestPhase =
  | "idle"
  | "collecting"
  | "complete"
  | "performing"
  | "done";

export type WordStatus = "pending" | "approved" | "rejected";

// =============================================================================
// Word Harvest Event Types
// =============================================================================

export enum WordHarvestEventType {
  STATE_UPDATE = "state-update",
  WORD_PENDING = "word-pending",
  WORD_APPROVED = "word-approved",
  WORD_REJECTED = "word-rejected",
  WORD_USED = "word-used",
  WORD_UNUSED = "word-unused",
  CELEBRATION = "celebration",
  START_PERFORMING = "start-performing",
  ALL_USED = "all-used",
  HIDE = "hide",
  RESET = "reset",
}

// =============================================================================
// Zod Schemas
// =============================================================================

export const harvestWordSchema = z.object({
  id: z.string(),
  word: z.string(),
  normalizedWord: z.string(),
  submittedBy: z.string(),
  displayName: z.string(),
  submittedAt: z.number(),
  status: z.enum(["pending", "approved", "rejected"]) as z.ZodType<WordStatus>,
  used: z.boolean(),
  usedAt: z.number().optional(),
});

export type HarvestWord = z.infer<typeof harvestWordSchema>;

export const wordHarvestStateSchema = z.object({
  phase: z.enum([
    "idle",
    "collecting",
    "complete",
    "performing",
    "done",
  ]) as z.ZodType<WordHarvestPhase>,
  targetCount: z.number().int().min(WORD_HARVEST.MIN_TARGET_COUNT).max(WORD_HARVEST.MAX_TARGET_COUNT),
  pendingWords: z.array(harvestWordSchema),
  approvedWords: z.array(harvestWordSchema),
  visible: z.boolean(),
});

export type WordHarvestState = z.infer<typeof wordHarvestStateSchema>;

// =============================================================================
// API Payload Schemas
// =============================================================================

export const startGamePayloadSchema = z.object({
  targetCount: z
    .number()
    .int()
    .min(WORD_HARVEST.MIN_TARGET_COUNT)
    .max(WORD_HARVEST.MAX_TARGET_COUNT)
    .default(WORD_HARVEST.DEFAULT_TARGET_COUNT),
});

export type StartGamePayload = z.infer<typeof startGamePayloadSchema>;

export const wordActionPayloadSchema = z.object({
  wordId: z.string().min(1),
});

export type WordActionPayload = z.infer<typeof wordActionPayloadSchema>;

// =============================================================================
// Overlay Event Payloads
// =============================================================================

export const wordHarvestStatePayloadSchema = wordHarvestStateSchema;
export type WordHarvestStatePayload = WordHarvestState;

export const wordHarvestWordApprovedPayloadSchema = z.object({
  word: harvestWordSchema,
  approvedWords: z.array(harvestWordSchema),
  targetCount: z.number(),
});

export type WordHarvestWordApprovedPayload = z.infer<typeof wordHarvestWordApprovedPayloadSchema>;

export const wordHarvestWordPendingPayloadSchema = z.object({
  word: harvestWordSchema,
  pendingCount: z.number(),
});

export type WordHarvestWordPendingPayload = z.infer<typeof wordHarvestWordPendingPayloadSchema>;

export const wordHarvestWordUsedPayloadSchema = z.object({
  wordId: z.string(),
  used: z.boolean(),
});

export type WordHarvestWordUsedPayload = z.infer<typeof wordHarvestWordUsedPayloadSchema>;

export const wordHarvestCelebrationPayloadSchema = z.object({
  targetCount: z.number(),
});

export type WordHarvestCelebrationPayload = z.infer<typeof wordHarvestCelebrationPayloadSchema>;

export const wordHarvestStartPerformingPayloadSchema = z.object({
  targetCount: z.number(),
});
export type WordHarvestStartPerformingPayload = z.infer<typeof wordHarvestStartPerformingPayloadSchema>;

export const wordHarvestAllUsedPayloadSchema = z.object({
  targetCount: z.number(),
});
export type WordHarvestAllUsedPayload = z.infer<typeof wordHarvestAllUsedPayloadSchema>;

// =============================================================================
// Discriminated Union Event Types (for overlay renderer)
// =============================================================================

export interface WordHarvestStateUpdateEvent {
  type: typeof WordHarvestEventType.STATE_UPDATE;
  payload: WordHarvestStatePayload;
  id: string;
}

export interface WordHarvestWordPendingEvent {
  type: typeof WordHarvestEventType.WORD_PENDING;
  payload: WordHarvestWordPendingPayload;
  id: string;
}

export interface WordHarvestWordApprovedEvent {
  type: typeof WordHarvestEventType.WORD_APPROVED;
  payload: WordHarvestWordApprovedPayload;
  id: string;
}

export interface WordHarvestWordRejectedEvent {
  type: typeof WordHarvestEventType.WORD_REJECTED;
  payload: { wordId: string };
  id: string;
}

export interface WordHarvestWordUsedEvent {
  type: typeof WordHarvestEventType.WORD_USED;
  payload: WordHarvestWordUsedPayload;
  id: string;
}

export interface WordHarvestWordUnusedEvent {
  type: typeof WordHarvestEventType.WORD_UNUSED;
  payload: WordHarvestWordUsedPayload;
  id: string;
}

export interface WordHarvestCelebrationEvent {
  type: typeof WordHarvestEventType.CELEBRATION;
  payload: WordHarvestCelebrationPayload;
  id: string;
}

export interface WordHarvestStartPerformingEvent {
  type: typeof WordHarvestEventType.START_PERFORMING;
  payload: WordHarvestStartPerformingPayload;
  id: string;
}

export interface WordHarvestAllUsedEvent {
  type: typeof WordHarvestEventType.ALL_USED;
  payload: WordHarvestAllUsedPayload;
  id: string;
}

export interface WordHarvestHideEvent {
  type: typeof WordHarvestEventType.HIDE;
  payload?: undefined;
  id: string;
}

export interface WordHarvestResetEvent {
  type: typeof WordHarvestEventType.RESET;
  payload?: undefined;
  id: string;
}

export type WordHarvestEvent =
  | WordHarvestStateUpdateEvent
  | WordHarvestWordPendingEvent
  | WordHarvestWordApprovedEvent
  | WordHarvestWordRejectedEvent
  | WordHarvestWordUsedEvent
  | WordHarvestWordUnusedEvent
  | WordHarvestCelebrationEvent
  | WordHarvestStartPerformingEvent
  | WordHarvestAllUsedEvent
  | WordHarvestHideEvent
  | WordHarvestResetEvent;

// =============================================================================
// Type Guard
// =============================================================================

const WORD_HARVEST_EVENT_TYPES = new Set(Object.values(WordHarvestEventType));

export function isWordHarvestEvent(event: { type: string }): event is WordHarvestEvent {
  return WORD_HARVEST_EVENT_TYPES.has(event.type as WordHarvestEventType);
}
