import { z } from "zod";

/**
 * Event types tracked in the log
 */
export enum EventLogType {
  GUEST = "guest",
  CUSTOM_TEXT = "custom",
  POSTER = "poster",
  CHAT_HIGHLIGHT = "chat",
}

/**
 * Event source - where the event originated
 */
export enum EventSource {
  REGIE = "regie",
  PRESENTER = "presenter",
}

/**
 * Event log entry schema
 */
export const eventLogEntrySchema = z.object({
  id: z.string(),
  type: z.nativeEnum(EventLogType),
  timestamp: z.number(),
  from: z.nativeEnum(EventSource).default(EventSource.REGIE),
  isActive: z.boolean().default(false),
  hideAt: z.number().optional(),
  display: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    channel: z.string(),
    side: z.string().optional(),
  }),
  originalPayload: z.unknown(),
  originalChannel: z.string(),
});

export type EventLogEntry = z.infer<typeof eventLogEntrySchema>;

/**
 * Filter options for the event log
 */
export type EventLogFilter = "all" | EventLogType;

/**
 * Storage format for localStorage persistence
 */
export interface StoredEventLog {
  version: number;
  events: EventLogEntry[];
  updatedAt: string;
}
