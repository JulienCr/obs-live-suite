import { z } from "zod";

/**
 * Cue severity levels
 */
export enum CueSeverity {
  INFO = "info",
  WARN = "warn",
  URGENT = "urgent",
}

/**
 * Cue message types
 */
export enum CueType {
  CUE = "cue",
  COUNTDOWN = "countdown",
  QUESTION = "question",
  CONTEXT = "context",
  NOTE = "note",
  REPLY = "reply",
}

/**
 * Message sender role
 */
export enum CueFrom {
  CONTROL = "control",
  PRESENTER = "presenter",
  SYSTEM = "system",
}

/**
 * Available actions on cue messages
 */
export enum CueAction {
  ACK = "ack",
  DONE = "done",
  CLEAR = "clear",
  TAKE = "take",
  SKIP = "skip",
  PIN = "pin",
  UNPIN = "unpin",
}

/**
 * Countdown-specific payload
 */
export const countdownPayloadSchema = z.object({
  mode: z.enum(["duration", "targetTime"]),
  durationSec: z.number().positive().optional(),
  targetTime: z.string().datetime().optional(),
});

export type CountdownPayload = z.infer<typeof countdownPayloadSchema>;

/**
 * Context link schema
 */
export const contextLinkSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
});

export type ContextLink = z.infer<typeof contextLinkSchema>;

/**
 * Context-specific payload (image + bullets + links)
 */
export const contextPayloadSchema = z.object({
  // Accept both absolute URLs (http://, https://) and relative paths (/data/...)
  imageUrl: z.string().refine(
    (val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
    { message: 'Must be a valid URL or relative path starting with /' }
  ).optional(),
  links: z.array(contextLinkSchema).optional(),
  bullets: z.array(z.string()).optional(),
  guestId: z.string().optional(), // For tracking guest on screen
  posterId: z.string().optional(), // For tracking poster on screen
});

export type ContextPayload = z.infer<typeof contextPayloadSchema>;

/**
 * Badge for chat messages
 */
export const chatBadgeSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  imageUrl: z.string().optional(),
});

/**
 * Message part for rendering text and emotes
 */
export const messagePartSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    text: z.string(),
  }),
  z.object({
    type: z.literal("emote"),
    name: z.string(),
    imageUrl: z.string(),
  }),
]);

/**
 * Question-specific payload (promoted from Twitch chat)
 */
export const questionPayloadSchema = z.object({
  platform: z.enum(["twitch", "youtube", "trovo"]),
  author: z.string(),
  text: z.string(),
  messageUrl: z.string().url().optional(),
  color: z.string().optional(),
  badges: z.array(chatBadgeSchema).optional(),
  parts: z.array(messagePartSchema).optional(),
});

export type QuestionPayload = z.infer<typeof questionPayloadSchema>;

/**
 * Complete cue message schema
 */
export const cueMessageSchema = z.object({
  id: z.string().uuid(),
  roomId: z.string().uuid(),
  type: z.nativeEnum(CueType),
  from: z.nativeEnum(CueFrom),
  severity: z.nativeEnum(CueSeverity).optional(),
  title: z.string().optional(),
  body: z.string().optional(), // markdown-lite
  pinned: z.boolean().default(false),
  actions: z.array(z.nativeEnum(CueAction)).default([]),

  // Type-specific payloads
  countdownPayload: countdownPayloadSchema.optional(),
  contextPayload: contextPayloadSchema.optional(),
  questionPayload: questionPayloadSchema.optional(),

  // State tracking
  seenBy: z.array(z.string()).default([]), // clientIds
  ackedBy: z.array(z.string()).default([]), // clientIds
  resolvedAt: z.number().optional(), // timestamp
  resolvedBy: z.string().optional(), // clientId

  createdAt: z.number(), // timestamp
  updatedAt: z.number(), // timestamp
});

export type CueMessage = z.infer<typeof cueMessageSchema>;

/**
 * Input schema for creating a cue message
 */
export const createCueMessageSchema = cueMessageSchema.omit({
  id: true,
  seenBy: true,
  ackedBy: true,
  resolvedAt: true,
  resolvedBy: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateCueMessageInput = z.infer<typeof createCueMessageSchema>;

/**
 * Input schema for updating a cue message
 */
export const updateCueMessageSchema = cueMessageSchema.partial().required({
  id: true,
});

export type UpdateCueMessageInput = z.infer<typeof updateCueMessageSchema>;

/**
 * Action event schema (when user performs an action on a cue)
 */
export const cueActionEventSchema = z.object({
  messageId: z.string().uuid(),
  action: z.nativeEnum(CueAction),
  clientId: z.string().uuid(),
  timestamp: z.number(),
});

export type CueActionEvent = z.infer<typeof cueActionEventSchema>;

/**
 * Get default actions available for a cue type and role
 */
export function getDefaultActions(
  type: CueType,
  from: CueFrom,
  isPresenter: boolean
): CueAction[] {
  const actions: CueAction[] = [];

  // Common actions
  if (isPresenter) {
    actions.push(CueAction.ACK);
  }

  // Type-specific actions
  if (type === CueType.QUESTION && isPresenter) {
    actions.push(CueAction.TAKE, CueAction.SKIP);
  }

  // Control room can always resolve
  if (!isPresenter) {
    actions.push(CueAction.DONE, CueAction.CLEAR);
    actions.push(CueAction.PIN, CueAction.UNPIN);
  }

  return actions;
}

/**
 * Cue message model class for business logic
 */
export class CueMessageModel {
  private data: CueMessage;

  constructor(data: CueMessage) {
    this.data = cueMessageSchema.parse(data);
  }

  getId(): string {
    return this.data.id;
  }

  getRoomId(): string {
    return this.data.roomId;
  }

  getType(): CueType {
    return this.data.type;
  }

  getSeverity(): CueSeverity | undefined {
    return this.data.severity;
  }

  isPinned(): boolean {
    return this.data.pinned;
  }

  isResolved(): boolean {
    return this.data.resolvedAt !== undefined;
  }

  isSeenBy(clientId: string): boolean {
    return this.data.seenBy.includes(clientId);
  }

  isAckedBy(clientId: string): boolean {
    return this.data.ackedBy.includes(clientId);
  }

  markSeen(clientId: string): void {
    if (!this.data.seenBy.includes(clientId)) {
      this.data.seenBy.push(clientId);
      this.data.updatedAt = Date.now();
    }
  }

  markAcked(clientId: string): void {
    if (!this.data.ackedBy.includes(clientId)) {
      this.data.ackedBy.push(clientId);
      this.data.updatedAt = Date.now();
    }
  }

  resolve(clientId: string): void {
    this.data.resolvedAt = Date.now();
    this.data.resolvedBy = clientId;
    this.data.updatedAt = Date.now();
  }

  pin(): void {
    this.data.pinned = true;
    this.data.updatedAt = Date.now();
  }

  unpin(): void {
    this.data.pinned = false;
    this.data.updatedAt = Date.now();
  }

  toJSON(): CueMessage {
    return { ...this.data };
  }

  static fromJSON(data: unknown): CueMessageModel {
    return new CueMessageModel(cueMessageSchema.parse(data));
  }
}
