import { z } from "zod";

/**
 * Overlay channel names
 */
export enum OverlayChannel {
  LOWER = "lower",
  COUNTDOWN = "countdown",
  POSTER = "poster",
  POSTER_BIGPICTURE = "poster-bigpicture",
  QUIZ = "quiz",
  SYSTEM = "system",
}

/**
 * Lower third event types
 */
export enum LowerThirdEventType {
  SHOW = "show",
  HIDE = "hide",
  UPDATE = "update",
}

/**
 * Countdown event types
 */
export enum CountdownEventType {
  SET = "set",
  START = "start",
  PAUSE = "pause",
  RESET = "reset",
  UPDATE = "update",
  ADD_TIME = "add-time",
  TICK = "tick",
}

/**
 * Poster event types
 */
export enum PosterEventType {
  SHOW = "show",
  HIDE = "hide",
  NEXT = "next",
  PREVIOUS = "previous",
  PLAY = "play",
  PAUSE = "pause",
  SEEK = "seek",
  MUTE = "mute",
  UNMUTE = "unmute",
}

/**
 * Lower third show event payload
 */
export const lowerThirdShowPayloadSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  side: z.enum(["left", "right"]).default("left"),
  themeId: z.string().uuid().optional(),
  duration: z.number().int().positive().optional(),
  avatarUrl: z.string().optional(),
  accentColor: z.string().optional(),
});

export type LowerThirdShowPayload = z.infer<typeof lowerThirdShowPayloadSchema>;

/**
 * Countdown set event payload
 */
export const countdownSetPayloadSchema = z.object({
  seconds: z.number().int().positive(),
  style: z.enum(["bold", "corner", "banner"]).optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
  format: z.enum(["mm:ss", "hh:mm:ss", "seconds"]).optional(),
  size: z.object({
    scale: z.number().min(0.1).max(5),
  }).optional(),
  theme: z.object({
    color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    font: z.object({
      family: z.string(),
      size: z.number().int().positive(),
      weight: z.number().int().min(100).max(900),
    }).optional(),
    shadow: z.boolean().optional(),
  }).optional(),
});

export type CountdownSetPayload = z.infer<typeof countdownSetPayloadSchema>;

/**
 * Poster show event payload
 */
export const posterShowPayloadSchema = z.object({
  posterId: z.string().uuid().optional(),
  fileUrl: z.string(),
  type: z.enum(["image", "video", "youtube"]).optional(),
  transition: z.enum(["fade", "slide", "cut", "blur"]).default("fade"),
  duration: z.number().int().positive().optional(),
  side: z.enum(["left", "right"]).optional(),
  theme: z.object({
    layout: z.object({
      x: z.number(),
      y: z.number(),
      scale: z.number(),
    }),
  }).optional(),
});

export type PosterShowPayload = z.infer<typeof posterShowPayloadSchema>;

/**
 * Poster seek event payload
 */
export const posterSeekPayloadSchema = z.object({
  time: z.number().min(0),
});

export type PosterSeekPayload = z.infer<typeof posterSeekPayloadSchema>;

/**
 * Base overlay event schema
 */
export const overlayEventSchema = z.object({
  channel: z.nativeEnum(OverlayChannel),
  type: z.string(),
  payload: z.unknown().optional(),
  timestamp: z.number().default(() => Date.now()),
  id: z.string().uuid(),
});

export type OverlayEvent = z.infer<typeof overlayEventSchema>;

/**
 * Acknowledgment event schema
 */
export const ackEventSchema = z.object({
  eventId: z.string().uuid(),
  channel: z.nativeEnum(OverlayChannel),
  success: z.boolean(),
  error: z.string().optional(),
  timestamp: z.number().default(() => Date.now()),
});

export type AckEvent = z.infer<typeof ackEventSchema>;

