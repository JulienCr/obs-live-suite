import { z } from "zod";

/**
 * Presenter role types for the channel
 */
export enum PresenterRole {
  PRESENTER = "presenter",
  CONTROL = "control",
  PRODUCER = "producer",
}

/**
 * Default quick replies for presenter
 */
export const DEFAULT_QUICK_REPLIES = [
  "Ready",
  "Need more context",
  "Delay 1 min",
  "Audio issue",
];

/**
 * Presenter channel settings schema
 * Replaces the multi-room system with a single channel configuration
 */
export const presenterChannelSettingsSchema = z.object({
  vdoNinjaUrl: z.string().url().optional(),
  quickReplies: z.array(z.string()).default(DEFAULT_QUICK_REPLIES),
  canSendCustomMessages: z.boolean().default(false),
  allowPresenterToSendMessage: z.boolean().default(false),
});

export type PresenterChannelSettings = z.infer<typeof presenterChannelSettingsSchema>;

/**
 * Presenter presence schema - tracks who is connected to the channel
 */
export const presenterPresenceSchema = z.object({
  clientId: z.string().uuid(),
  role: z.nativeEnum(PresenterRole),
  isOnline: z.boolean().default(true),
  lastSeen: z.number(), // timestamp
  lastActivity: z.number().optional(), // timestamp of last action
});

export type PresenterPresence = z.infer<typeof presenterPresenceSchema>;
