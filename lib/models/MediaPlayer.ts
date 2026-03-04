/**
 * Media Player Driver System - Zod schemas and types
 *
 * Defines the contract between backend, Chrome extension, and dashboard
 * for controlling media players (Artlist, YouTube, etc.) via WebSocket.
 */
import { z } from "zod";

// ============================================================================
// DRIVER IDS & ACTIONS
// ============================================================================

/** Supported media player driver identifiers */
export const MediaPlayerDriverId = z.enum(["artlist", "youtube"]);
export type MediaPlayerDriverId = z.infer<typeof MediaPlayerDriverId>;

/** Actions supported by all media player drivers */
export const MediaPlayerAction = z.enum([
  "play",
  "pause",
  "stop",
  "next",
  "prev",
  "replay",
  "fadeout",
  "status",
]);
export type MediaPlayerAction = z.infer<typeof MediaPlayerAction>;

// ============================================================================
// STATUS
// ============================================================================

/** Current playback status reported by a driver */
export const MediaPlayerStatusSchema = z.object({
  track: z.string().nullable(),
  artist: z.string().nullable(),
  current: z.string().nullable(),
  total: z.string().nullable(),
  playing: z.boolean(),
});
export type MediaPlayerStatus = z.infer<typeof MediaPlayerStatusSchema>;

// ============================================================================
// WEBSOCKET MESSAGE TYPES
// ============================================================================

/**
 * Message types flowing through the WebSocket hub.
 *
 * Extension → Hub:
 *   media-player-register   : Driver announces itself (driverId, tabId)
 *   media-player-response   : Response to a command (correlationId, result)
 *   media-player-status     : Periodic status broadcast from driver
 *
 * Hub → Extension:
 *   media-player-command    : Command to execute (driverId, action, correlationId)
 *
 * Hub → Dashboard (via channel broadcast):
 *   status                  : Driver status update
 *   connected / disconnected: Driver connection state
 */
export const MediaPlayerMessageType = z.enum([
  "media-player-register",
  "media-player-command",
  "media-player-response",
  "media-player-status",
  "media-player-driver-event",
]);
export type MediaPlayerMessageType = z.infer<typeof MediaPlayerMessageType>;

// ============================================================================
// COMMAND (Hub → Extension)
// ============================================================================

/** Command sent from backend to Chrome extension via WS */
export const MediaPlayerCommandSchema = z.object({
  type: z.literal("media-player-command"),
  driverId: MediaPlayerDriverId,
  action: MediaPlayerAction,
  correlationId: z.string(),
});
export type MediaPlayerCommand = z.infer<typeof MediaPlayerCommandSchema>;

// ============================================================================
// RESPONSE (Extension → Hub)
// ============================================================================

/** Response from extension back to backend */
export const MediaPlayerResponseSchema = z.object({
  type: z.literal("media-player-response"),
  correlationId: z.string(),
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
});
export type MediaPlayerResponse = z.infer<typeof MediaPlayerResponseSchema>;

// ============================================================================
// REGISTER (Extension → Hub)
// ============================================================================

/** Driver registration message from extension */
export const MediaPlayerRegisterSchema = z.object({
  type: z.literal("media-player-register"),
  driverId: MediaPlayerDriverId,
});
export type MediaPlayerRegister = z.infer<typeof MediaPlayerRegisterSchema>;

// ============================================================================
// STATUS BROADCAST (Extension → Hub)
// ============================================================================

/** Periodic status update from extension */
export const MediaPlayerStatusBroadcastSchema = z.object({
  type: z.literal("media-player-status"),
  driverId: MediaPlayerDriverId,
  status: MediaPlayerStatusSchema,
});
export type MediaPlayerStatusBroadcast = z.infer<typeof MediaPlayerStatusBroadcastSchema>;

// ============================================================================
// DASHBOARD EVENTS (Hub → Dashboard via WS channel)
// ============================================================================

/** Events broadcast on the "media-player" WS channel for dashboard consumption */
export type MediaPlayerDashboardEvent =
  | { type: "status"; driverId: MediaPlayerDriverId; status: MediaPlayerStatus }
  | { type: "connected"; driverId: MediaPlayerDriverId }
  | { type: "disconnected"; driverId: MediaPlayerDriverId }
  | { type: "command-result"; driverId: MediaPlayerDriverId; action: MediaPlayerAction; success: boolean; error?: string };

/** WS channel name for media player events */
export const MEDIA_PLAYER_CHANNEL = "media-player";
