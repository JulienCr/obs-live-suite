import { z } from "zod";

/**
 * Configuration constants for chat predefined messages
 */
export const CHAT_MESSAGES_CONFIG = {
  MAX_MESSAGES: 20,
  MAX_TITLE_LENGTH: 50,
  MAX_MESSAGE_LENGTH: 500,
  CONNECTION_POLL_INTERVAL_MS: 10000,
} as const;

/**
 * Chat predefined message schema for validation
 */
export const chatPredefinedMessageSchema = z.object({
  id: z.string().uuid().optional(), // Optional for backward compatibility
  title: z.string().min(1).max(CHAT_MESSAGES_CONFIG.MAX_TITLE_LENGTH),
  message: z.string().min(1).max(CHAT_MESSAGES_CONFIG.MAX_MESSAGE_LENGTH),
});

/**
 * Chat predefined message type inferred from schema
 */
export type ChatPredefinedMessage = z.infer<typeof chatPredefinedMessageSchema>;

/**
 * Array of chat predefined messages schema
 */
export const chatPredefinedMessagesArraySchema = z
  .array(chatPredefinedMessageSchema)
  .max(CHAT_MESSAGES_CONFIG.MAX_MESSAGES);
