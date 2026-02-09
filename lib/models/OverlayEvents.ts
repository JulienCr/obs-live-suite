import { z } from "zod";
import { videoChapterSchema, endBehaviorSchema, VideoChapter } from "./Poster";

/**
 * Event source - where the event originated
 */
export enum EventSource {
  REGIE = "regie",
  PRESENTER = "presenter",
}

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
  CHAT_HIGHLIGHT = "chat-highlight",
}

/**
 * Room event types for presenter dashboard
 */
export enum RoomEventType {
  JOIN = "join",
  LEAVE = "leave",
  MESSAGE = "message",
  ACTION = "action",
  PRESENCE = "presence",
  REPLAY = "replay",
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
  CHAPTER_NEXT = "chapter-next",
  CHAPTER_PREVIOUS = "chapter-previous",
  CHAPTER_JUMP = "chapter-jump",
}

/**
 * Chat highlight event types
 */
export enum ChatHighlightEventType {
  SHOW = "show",
  HIDE = "hide",
}

/**
 * Lower third animation configuration
 */
export const lowerThirdAnimationConfigSchema = z.object({
  timing: z.object({
    logoFadeDuration: z.number().positive().default(200),
    logoScaleDuration: z.number().positive().default(200),
    flipDuration: z.number().positive().default(600),
    flipDelay: z.number().positive().default(500),
    barAppearDelay: z.number().positive().default(800),
    barExpandDuration: z.number().positive().default(450),
    textAppearDelay: z.number().positive().default(1000),
    textFadeDuration: z.number().positive().default(250),
  }).optional(),
  styles: z.object({
    barBorderRadius: z.number().positive().default(16),
    barMinWidth: z.number().positive().default(200),
    avatarBorderWidth: z.number().positive().default(4),
    avatarBorderColor: z.string().default('#272727'),
    freeTextMaxWidth: z.object({
      left: z.number().min(10).max(100).default(65),
      right: z.number().min(10).max(100).default(65),
      center: z.number().min(10).max(100).default(90),
    }).optional(),
  }).optional(),
}).optional();

export type LowerThirdAnimationConfig = z.infer<typeof lowerThirdAnimationConfigSchema>;

/**
 * Lower third show event payload
 */
export const lowerThirdShowPayloadSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  body: z.string().optional(),
  contentType: z.enum(["guest", "text"]).optional(),
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
  side: z.enum(["left", "right", "center"]).default("left"),
  themeId: z.string().uuid().optional(),
  duration: z.number().int().positive().optional(),
  avatarUrl: z.string().optional(),
  accentColor: z.string().optional(),
  logoImage: z.string().optional(),
  avatarImage: z.string().optional(),
  logoHasPadding: z.boolean().default(false),
  guestId: z.string().optional(), // Guest ID for tracking in dashboard
  textPresetId: z.string().optional(), // Text preset ID for tracking in dashboard
  from: z.nativeEnum(EventSource).default(EventSource.REGIE),
  animationConfig: lowerThirdAnimationConfigSchema,
  theme: z.object({
    colors: z.object({
      primary: z.string(),
      accent: z.string(),
      surface: z.string(),
      text: z.string(),
      success: z.string(),
      warn: z.string(),
    }),
    font: z.object({
      family: z.string(),
      size: z.number(),
      weight: z.number(),
    }),
    layout: z.object({
      x: z.number(),
      y: z.number(),
      scale: z.number(),
    }).optional(),
  }).optional(),
}).superRefine((data, ctx) => {
  if (!data.title && !data.body) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Lower third requires either a title or body.",
      path: ["title"],
    });
  }
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
  from: z.nativeEnum(EventSource).default(EventSource.REGIE),
  theme: z.object({
    layout: z.object({
      x: z.number(),
      y: z.number(),
      scale: z.number(),
    }),
  }).optional(),
  source: z.string().optional(),
  // Sub-video / chapter fields
  startTime: z.number().min(0).optional(),
  endTime: z.number().min(0).optional(),
  endBehavior: endBehaviorSchema.optional(),
  chapters: z.array(videoChapterSchema).optional(),
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
 * Chapter jump event payload - jump to a specific chapter by index or id
 */
export const chapterJumpPayloadSchema = z.union([
  z.object({ chapterIndex: z.number().int().min(0) }),
  z.object({ chapterId: z.string().uuid() }),
]);

export type ChapterJumpPayload = z.infer<typeof chapterJumpPayloadSchema>;

/**
 * Chat highlight message part schema
 */
export const chatHighlightMessagePartSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("emote"), name: z.string(), imageUrl: z.string() }),
]);

export type ChatHighlightMessagePart = z.infer<typeof chatHighlightMessagePartSchema>;

/**
 * Chat highlight show event payload
 */
export const chatHighlightShowPayloadSchema = z.object({
  messageId: z.string(),
  platform: z.enum(["twitch", "youtube", "trovo"]),
  username: z.string(),
  displayName: z.string(),
  message: z.string(),
  parts: z.array(chatHighlightMessagePartSchema).optional(),
  metadata: z.object({
    color: z.string().optional(),
    badges: z.array(z.object({
      name: z.string(),
      imageUrl: z.string().optional(),
    })).optional(),
    isMod: z.boolean().optional(),
    isVip: z.boolean().optional(),
    isSubscriber: z.boolean().optional(),
    isBroadcaster: z.boolean().optional(),
  }).optional(),
  duration: z.number().int().positive().default(10),
  side: z.enum(["left", "right", "center"]).default("center"),
  from: z.nativeEnum(EventSource).default(EventSource.REGIE),
  theme: z.object({
    colors: z.object({
      primary: z.string(),
      accent: z.string(),
      surface: z.string(),
      text: z.string(),
    }),
    font: z.object({
      family: z.string(),
      size: z.number(),
      weight: z.number(),
    }),
  }).optional(),
});

export type ChatHighlightShowPayload = z.infer<typeof chatHighlightShowPayloadSchema>;

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

/**
 * Room event schema for presenter dashboard
 */
export const roomEventSchema = z.object({
  type: z.nativeEnum(RoomEventType),
  payload: z.unknown().optional(),
  timestamp: z.number().default(() => Date.now()),
  id: z.string().uuid(),
});

export type RoomEvent = z.infer<typeof roomEventSchema>;

/**
 * Presenter presence event schema
 */
export const presenterPresenceEventSchema = z.object({
  clientId: z.string().uuid(),
  role: z.enum(["presenter", "control", "producer"]),
  isOnline: z.boolean(),
  lastSeen: z.number(),
  lastActivity: z.number().optional(),
});

export type PresenterPresenceEvent = z.infer<typeof presenterPresenceEventSchema>;

/**
 * Room message replay schema
 */
export const roomReplayEventSchema = z.object({
  messages: z.array(z.unknown()),
  pinnedMessages: z.array(z.unknown()),
  presence: z.array(presenterPresenceEventSchema),
});

export type RoomReplayEvent = z.infer<typeof roomReplayEventSchema>;

// =============================================================================
// DISCRIMINATED UNION TYPES FOR OVERLAY EVENTS
// =============================================================================

/**
 * Theme data structure for lower third overlays.
 * Contains colors, font settings, and optional layout positioning.
 */
export interface LowerThirdThemeData {
  colors: {
    primary: string;
    accent: string;
    surface: string;
    text: string;
    success: string;
    warn: string;
  };
  font: {
    family: string;
    size: number;
    weight: number;
  };
  layout?: {
    x: number;
    y: number;
    scale: number;
  };
}

/**
 * Event to display a lower third overlay.
 * Contains guest/text information, positioning, and theming.
 */
export interface LowerThirdShowEvent {
  type: "show";
  payload: LowerThirdShowPayload;
  id: string;
}

/**
 * Event to hide the lower third overlay.
 * No payload required - simply triggers the hide animation.
 */
export interface LowerThirdHideEvent {
  type: "hide";
  payload?: undefined;
  id: string;
}

/**
 * Event to update the currently displayed lower third.
 * Allows partial updates to existing content without full show/hide cycle.
 */
export interface LowerThirdUpdateEvent {
  type: "update";
  payload?: Partial<LowerThirdShowPayload>;
  id: string;
}

/**
 * Discriminated union of all lower third events.
 * Use type guards like `event.type === "show"` to narrow the type.
 */
export type LowerThirdEvent =
  | LowerThirdShowEvent
  | LowerThirdHideEvent
  | LowerThirdUpdateEvent;

// -----------------------------------------------------------------------------
// Countdown Events
// -----------------------------------------------------------------------------

/**
 * Theme data structure for countdown overlays.
 */
export interface CountdownThemeData {
  colors?: {
    primary: string;
    accent: string;
    surface: string;
    text: string;
    success: string;
    warn: string;
  };
  style?: string;
  font?: {
    family: string;
    size: number;
    weight: number;
  };
  layout?: {
    x: number;
    y: number;
    scale: number;
  };
  color?: string;
  shadow?: boolean;
}

/**
 * Base payload for countdown events that modify display settings.
 */
export interface CountdownDisplayPayload {
  style?: "bold" | "corner" | "banner";
  position?: { x: number; y: number };
  format?: "mm:ss" | "hh:mm:ss" | "seconds";
  size?: { scale: number };
  theme?: CountdownThemeData;
}

/**
 * Event to set the countdown timer with initial seconds and display options.
 * This makes the countdown visible but does not start it.
 */
export interface CountdownSetEvent {
  type: "set";
  payload: CountdownDisplayPayload & {
    /** Initial number of seconds for the countdown */
    seconds: number;
  };
  id: string;
}

/**
 * Event to start the countdown timer.
 * The countdown must have been set first.
 */
export interface CountdownStartEvent {
  type: "start";
  payload?: undefined;
  id: string;
}

/**
 * Event to pause the countdown timer.
 * Can be resumed with a start event.
 */
export interface CountdownPauseEvent {
  type: "pause";
  payload?: undefined;
  id: string;
}

/**
 * Event to reset the countdown timer.
 * Hides the countdown and resets to 0 seconds.
 */
export interface CountdownResetEvent {
  type: "reset";
  payload?: undefined;
  id: string;
}

/**
 * Event to update countdown display settings without affecting the timer.
 */
export interface CountdownUpdateEvent {
  type: "update";
  payload?: CountdownDisplayPayload;
  id: string;
}

/**
 * Event to add time to the current countdown.
 * Can be positive (add time) or negative (subtract time).
 */
export interface CountdownAddTimeEvent {
  type: "add-time";
  payload: {
    /** Number of seconds to add (positive) or subtract (negative) */
    seconds: number;
  };
  id: string;
}

/**
 * Event for countdown tick updates (usually internal).
 * Broadcasts current time remaining.
 */
export interface CountdownTickEvent {
  type: "tick";
  payload: {
    /** Current remaining seconds */
    seconds: number;
  };
  id: string;
}

/**
 * Discriminated union of all countdown events.
 * Use type guards like `event.type === "set"` to narrow the type.
 */
export type CountdownEvent =
  | CountdownSetEvent
  | CountdownStartEvent
  | CountdownPauseEvent
  | CountdownResetEvent
  | CountdownUpdateEvent
  | CountdownAddTimeEvent
  | CountdownTickEvent;

// -----------------------------------------------------------------------------
// Poster Events
// -----------------------------------------------------------------------------

/**
 * Event to display a poster (image, video, or YouTube).
 * Supports transitions and auto-hide duration.
 */
export interface PosterShowEvent {
  type: "show";
  payload: PosterShowPayload;
  id: string;
}

/**
 * Event to hide the poster overlay.
 * Triggers fade-out animation.
 */
export interface PosterHideEvent {
  type: "hide";
  payload?: undefined;
  id: string;
}

/**
 * Event to show the next poster in a sequence.
 * Implementation-specific behavior.
 */
export interface PosterNextEvent {
  type: "next";
  payload?: undefined;
  id: string;
}

/**
 * Event to show the previous poster in a sequence.
 * Implementation-specific behavior.
 */
export interface PosterPreviousEvent {
  type: "previous";
  payload?: undefined;
  id: string;
}

/**
 * Event to start playback of video/YouTube poster.
 */
export interface PosterPlayEvent {
  type: "play";
  payload?: undefined;
  id: string;
}

/**
 * Event to pause playback of video/YouTube poster.
 */
export interface PosterPauseEvent {
  type: "pause";
  payload?: undefined;
  id: string;
}

/**
 * Event to seek to a specific time in video/YouTube poster.
 */
export interface PosterSeekEvent {
  type: "seek";
  payload: PosterSeekPayload;
  id: string;
}

/**
 * Event to mute video/YouTube poster audio.
 */
export interface PosterMuteEvent {
  type: "mute";
  payload?: undefined;
  id: string;
}

/**
 * Event to unmute video/YouTube poster audio.
 */
export interface PosterUnmuteEvent {
  type: "unmute";
  payload?: undefined;
  id: string;
}

/**
 * Event to navigate to the next chapter in a video.
 * Seeks to the next chapter's timestamp based on current playback position.
 */
export interface PosterChapterNextEvent {
  type: "chapter-next";
  payload?: undefined;
  id: string;
}

/**
 * Event to navigate to the previous chapter in a video.
 * Seeks to the previous chapter's timestamp based on current playback position.
 */
export interface PosterChapterPreviousEvent {
  type: "chapter-previous";
  payload?: undefined;
  id: string;
}

/**
 * Event to jump to a specific chapter by index or id.
 */
export interface PosterChapterJumpEvent {
  type: "chapter-jump";
  payload: ChapterJumpPayload;
  id: string;
}

/**
 * Discriminated union of all poster events.
 * Use type guards like `event.type === "show"` to narrow the type.
 */
export type PosterEvent =
  | PosterShowEvent
  | PosterHideEvent
  | PosterNextEvent
  | PosterPreviousEvent
  | PosterPlayEvent
  | PosterPauseEvent
  | PosterSeekEvent
  | PosterMuteEvent
  | PosterUnmuteEvent
  | PosterChapterNextEvent
  | PosterChapterPreviousEvent
  | PosterChapterJumpEvent;

// -----------------------------------------------------------------------------
// Chat Highlight Events
// -----------------------------------------------------------------------------

/**
 * Event to display a chat message highlight.
 * Shows username, message, and platform-specific badges/emotes.
 */
export interface ChatHighlightShowEvent {
  type: "show";
  payload: ChatHighlightShowPayload;
  id: string;
}

/**
 * Event to hide the chat highlight overlay.
 * Triggers fade-out animation.
 */
export interface ChatHighlightHideEvent {
  type: "hide";
  payload?: undefined;
  id: string;
}

/**
 * Discriminated union of all chat highlight events.
 * Use type guards like `event.type === "show"` to narrow the type.
 */
export type ChatHighlightEvent =
  | ChatHighlightShowEvent
  | ChatHighlightHideEvent;

// -----------------------------------------------------------------------------
// Generic Overlay Event Union
// -----------------------------------------------------------------------------

/**
 * Union of all typed overlay events across all channels.
 * Useful for generic event handling where channel is known separately.
 */
export type TypedOverlayEvent =
  | LowerThirdEvent
  | CountdownEvent
  | PosterEvent
  | ChatHighlightEvent;

// Event type sets for type guards - more maintainable than chained comparisons
const LOWER_THIRD_EVENT_TYPES = new Set(["show", "hide", "update"]);
const COUNTDOWN_EVENT_TYPES = new Set(["set", "start", "pause", "reset", "update", "add-time", "tick"]);
const POSTER_EVENT_TYPES = new Set(["show", "hide", "next", "previous", "play", "pause", "seek", "mute", "unmute", "chapter-next", "chapter-previous", "chapter-jump"]);
const CHAT_HIGHLIGHT_EVENT_TYPES = new Set(["show", "hide"]);

/**
 * Type guard to check if an event is a lower third event.
 */
export function isLowerThirdEvent(event: { type: string }): event is LowerThirdEvent {
  return LOWER_THIRD_EVENT_TYPES.has(event.type);
}

/**
 * Type guard to check if an event is a countdown event.
 */
export function isCountdownEvent(event: { type: string }): event is CountdownEvent {
  return COUNTDOWN_EVENT_TYPES.has(event.type);
}

/**
 * Type guard to check if an event is a poster event.
 */
export function isPosterEvent(event: { type: string }): event is PosterEvent {
  return POSTER_EVENT_TYPES.has(event.type);
}

/**
 * Type guard to check if an event is a chat highlight event.
 */
export function isChatHighlightEvent(event: { type: string }): event is ChatHighlightEvent {
  return CHAT_HIGHLIGHT_EVENT_TYPES.has(event.type);
}

// Re-export VideoChapter for convenience
export type { VideoChapter };
