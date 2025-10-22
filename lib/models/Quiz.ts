import { z } from "zod";

// Core quiz types and configs

export const quizModeSchema = z.enum([
  "qcm",
  "image",
  "closest",
  "open",
  "image_simple",
  "image_qcm",
  "image_zoombuzz",
  "mystery_image",
]);

export const zoomConfigSchema = z.object({
  auto: z.boolean().default(true),
  interval_ms: z.number().int().positive().default(300),
  steps: z.number().int().positive().default(20),
  cur_step: z.number().int().min(0).default(0),
  effect: z.enum(["scale", "blur", "reveal"]).default("scale"),
  easing: z.string().optional(),
});

export const buzzConfigSchema = z.object({
  timeout_ms: z.number().int().positive().default(8000),
  lock_ms: z.number().int().positive().default(300),
  steal: z.boolean().default(false),
  steal_window_ms: z.number().int().positive().default(4000),
});

export const questionSchema = z.object({
  id: z.string(),
  type: z.enum(["qcm", "image", "closest", "open"]).default("qcm"),
  mode: quizModeSchema.optional(),
  text: z.string(),
  media: z.string().nullable().default(null), // Allow both URLs and relative paths
  options: z.array(z.string()).max(4).optional(),
  correct: z.union([z.number().int(), z.string(), z.object({ min: z.number(), max: z.number() })]).optional(),
  points: z.number().int().default(1),
  tie_break: z.boolean().default(false),
  time_s: z.number().int().positive().default(20),
  notes: z.string().optional(),
  guest_target: z.enum(["single", "all", "none"]).optional(),
  zoom: zoomConfigSchema.optional(),
  buzz: buzzConfigSchema.optional(),
});

export type Question = z.infer<typeof questionSchema>;

export const quizConfigSchema = z.object({
  closest_k: z.number().default(1),
  time_defaults: z.object({
    qcm: z.number().int().positive().default(20),
    image: z.number().int().positive().default(20),
    closest: z.number().int().positive().default(20),
    open: z.number().int().positive().default(30),
  }).default({ qcm: 20, image: 20, closest: 20, open: 30 }),
  viewers_weight: z.number().default(1),
  players_weight: z.number().default(1),
  allow_multiple_attempts: z.boolean().default(false),
  first_or_last_wins: z.enum(["first", "last"]).default("last"),
  topN: z.number().int().positive().default(10),
  viewers: z.object({
    allow_answers_in_zoombuzz: z.boolean().default(false),
  }).default({ allow_answers_in_zoombuzz: false }),
});

export type QuizConfig = z.infer<typeof quizConfigSchema>;

export const roundSchema = z.object({
  id: z.string(),
  title: z.string(),
  questions: z.array(questionSchema),
});

export type Round = z.infer<typeof roundSchema>;

export const playerSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().optional(),
  accentColor: z.string().optional(),
  buzzerId: z.string().optional(),
});

export type Player = z.infer<typeof playerSchema>;

export const scoreBoardSchema = z.object({
  players: z.record(z.string(), z.number().int()).default({}),
  viewers: z.record(z.string(), z.number().int()).default({}),
});

export type ScoreBoard = z.infer<typeof scoreBoardSchema>;

export const sessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  rounds: z.array(roundSchema),
  currentRoundIndex: z.number().int().nonnegative().default(0),
  currentQuestionIndex: z.number().int().nonnegative().default(0),
  players: z.array(playerSchema).default([]),
  config: quizConfigSchema,
  scores: scoreBoardSchema.default({ players: {}, viewers: {} }),
  playerAnswers: z.record(z.string(), z.string()).optional().default({}), // playerId -> answer (option/text/value)
  scorePanelVisible: z.boolean().optional().default(true), // Overlay score panel visibility
});

export type Session = z.infer<typeof sessionSchema>;


