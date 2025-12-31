/**
 * Streamerbot Chat - Gateway Types
 *
 * Types for the backend Streamerbot gateway that bridges
 * between the frontend and Streamer.bot WebSocket server.
 */

import type {
  ChatMessage,
  StreamerbotConnectionStatus,
  StreamerbotConnectionError,
} from "./schemas";

/**
 * Gateway status for backend Streamerbot connection
 */
export interface StreamerbotGatewayStatus {
  status: StreamerbotConnectionStatus;
  error?: StreamerbotConnectionError;
  lastEventTime?: number;
}

/**
 * Gateway message types sent via WebSocket
 */
export type StreamerbotGatewayMessageType = "message" | "status" | "error";

/**
 * Gateway message payload
 */
export interface StreamerbotGatewayMessage {
  type: StreamerbotGatewayMessageType;
  payload: ChatMessage | StreamerbotGatewayStatus | StreamerbotConnectionError;
}
