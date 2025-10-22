import { z } from "zod";
import { OverlayChannel } from "./OverlayEvents";

// Quiz Event Names
export const quizEventTypeSchema = z.enum([
  "quiz.start_round",
  "quiz.end_round",
  "question.show",
  "question.change", // Question navigation (prev/next/select)
  "question.lock",
  "question.reveal",
  "question.revealed", // After scoring applied
  "question.reset",
  "question.finished", // Question complete, ready for next
  "question.next_ready", // Next question ready
  "phase.update", // Phase changed
  "round.order.update",
  "vote.update",
  "closest.update",
  "score.update",
  "leaderboard.push",
  "media.progress",
  "timer.tick",
  // delta
  "zoom.start",
  "zoom.step",
  "zoom.stop",
  "mystery.start",
  "mystery.step",
  "mystery.stop",
  "buzzer.hit",
  "buzzer.lock",
  "buzzer.release",
  "answer.request",
  "answer.submit",
  "answer.assign", // Player assigned to answer
]);

export type QuizEventType = z.infer<typeof quizEventTypeSchema>;

// Generic envelope for quiz events
export const quizEventSchema = z.object({
  channel: z.literal(OverlayChannel.QUIZ),
  type: quizEventTypeSchema,
  payload: z.unknown().optional(),
  timestamp: z.number(),
  id: z.string().uuid(),
});

// Payloads
export const questionShowPayloadSchema = z.object({
  question_id: z.string(),
});

export const questionChangePayloadSchema = z.object({
  question_id: z.string(),
  clear_assignments: z.boolean().default(true),
});

export const questionRevealPayloadSchema = z.object({
  question_id: z.string(),
  correct: z.union([z.number().int(), z.string(), z.object({ min: z.number(), max: z.number() })]).optional(),
});

export const questionRevealedPayloadSchema = z.object({
  question_id: z.string(),
  correct: z.union([z.number().int(), z.string(), z.object({ min: z.number(), max: z.number() })]),
  scores_applied: z.boolean().default(true),
});

export const questionResetPayloadSchema = z.object({
  question_id: z.string(),
});

export const roundOrderUpdatePayloadSchema = z.object({
  round_id: z.string(),
  question_ids: z.array(z.string()),
});

export const voteUpdatePayloadSchema = z.object({
  counts: z.record(z.string(), z.number().int().nonnegative()),
  percentages: z.record(z.string(), z.number().min(0).max(100)),
});

export const closestUpdatePayloadSchema = z.object({
  leader: z.string().optional(),
  value: z.number().optional(),
  delta: z.number().optional(),
});

export const scoreUpdatePayloadSchema = z.object({
  user_id: z.string(),
  delta: z.number(),
  total: z.number(),
});

export const leaderboardPushPayloadSchema = z.object({
  topN: z.array(z.object({ id: z.string(), name: z.string(), score: z.number().int() })),
});

export const mediaProgressPayloadSchema = z.object({
  step: z.number().int().nonnegative(),
  total: z.number().int().positive(),
});

export const timerTickPayloadSchema = z.object({
  s: z.number().int().nonnegative(),
  phase: z.enum(["idle", "show_question", "accept_answers", "lock", "reveal", "score_update", "interstitial"]).default("idle"),
});

export const zoomStepPayloadSchema = z.object({
  cur_step: z.number().int().nonnegative(),
  total: z.number().int().positive(),
});

export const mysteryStepPayloadSchema = z.object({
  revealed_squares: z.number().int().nonnegative(),
  total_squares: z.number().int().positive(),
});

export const buzzerHitPayloadSchema = z.object({
  buzzer_id: z.string(),
  player_id: z.string(),
  t: z.number(),
});

export const answerSubmitPayloadSchema = z.object({
  player_id: z.string(),
  text: z.string().optional(),
  option: z.string().optional(),
});

export const answerAssignPayloadSchema = z.object({
  question_id: z.string(),
  player_id: z.string(),
  option: z.string().optional(),
  text: z.string().optional(),
  value: z.number().optional(),
});

export const questionFinishedPayloadSchema = z.object({
  question_id: z.string(),
});

export const questionNextReadyPayloadSchema = z.object({
  next_id: z.string().optional(),
});

export const phaseUpdatePayloadSchema = z.object({
  phase: z.enum(["idle", "show_question", "accept_answers", "lock", "reveal", "score_update", "interstitial"]),
  question_id: z.string().optional(),
});

export type QuestionShowPayload = z.infer<typeof questionShowPayloadSchema>;
export type QuestionRevealPayload = z.infer<typeof questionRevealPayloadSchema>;
export type QuestionRevealedPayload = z.infer<typeof questionRevealedPayloadSchema>;
export type QuestionResetPayload = z.infer<typeof questionResetPayloadSchema>;
export type RoundOrderUpdatePayload = z.infer<typeof roundOrderUpdatePayloadSchema>;
export type VoteUpdatePayload = z.infer<typeof voteUpdatePayloadSchema>;
export type ClosestUpdatePayload = z.infer<typeof closestUpdatePayloadSchema>;
export type ScoreUpdatePayload = z.infer<typeof scoreUpdatePayloadSchema>;
export type LeaderboardPushPayload = z.infer<typeof leaderboardPushPayloadSchema>;
export type MediaProgressPayload = z.infer<typeof mediaProgressPayloadSchema>;
export type TimerTickPayload = z.infer<typeof timerTickPayloadSchema>;
export type ZoomStepPayload = z.infer<typeof zoomStepPayloadSchema>;
export type MysteryStepPayload = z.infer<typeof mysteryStepPayloadSchema>;
export type BuzzerHitPayload = z.infer<typeof buzzerHitPayloadSchema>;
export type AnswerSubmitPayload = z.infer<typeof answerSubmitPayloadSchema>;
export type AnswerAssignPayload = z.infer<typeof answerAssignPayloadSchema>;
export type QuestionFinishedPayload = z.infer<typeof questionFinishedPayloadSchema>;
export type QuestionNextReadyPayload = z.infer<typeof questionNextReadyPayloadSchema>;
export type PhaseUpdatePayload = z.infer<typeof phaseUpdatePayloadSchema>;


