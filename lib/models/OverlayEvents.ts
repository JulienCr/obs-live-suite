import { z } from "zod";

/**
 * Overlay channel names
 */
export enum OverlayChannel {
  LOWER = "lower",
  COUNTDOWN = "countdown",
  POSTER = "poster",
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
}

/**
 * Lower third show event payload
 */
export const lowerThirdShowPayloadSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  side: z.enum(["left", "right"]).default("left"),
  themeId: z.string().uuid(),
  duration: z.number().int().positive().optional(),
});

export type LowerThirdShowPayload = z.infer<typeof lowerThirdShowPayloadSchema>;

/**
 * Countdown set event payload
 */
export const countdownSetPayloadSchema = z.object({
  seconds: z.number().int().positive(),
  style: z.string().optional(),
});

export type CountdownSetPayload = z.infer<typeof countdownSetPayloadSchema>;

/**
 * Poster show event payload
 */
export const posterShowPayloadSchema = z.object({
  posterId: z.string().uuid(),
  fileUrl: z.string(),
  transition: z.enum(["fade", "slide", "cut", "blur"]).default("fade"),
  duration: z.number().int().positive().optional(),
});

export type PosterShowPayload = z.infer<typeof posterShowPayloadSchema>;

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

