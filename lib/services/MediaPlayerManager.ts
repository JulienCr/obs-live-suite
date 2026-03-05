/**
 * MediaPlayerManager - Singleton service for managing media player drivers.
 *
 * Routes commands from HTTP API / dashboard to Chrome extension content scripts
 * via WebSocket hub. Tracks registered drivers, correlates command-response pairs,
 * and broadcasts status updates to the dashboard.
 */
import { randomUUID } from "crypto";
import { Logger } from "../utils/Logger";
import { WebSocketHub } from "./WebSocketHub";
import { MEDIA_PLAYER } from "../config/Constants";
import type {
  MediaPlayerAction,
  MediaPlayerStatus,
  MediaPlayerCommand,
  MediaPlayerDashboardEvent,
} from "../models/MediaPlayer";
import {
  MediaPlayerDriverId,
  MediaPlayerRegisterSchema,
  MediaPlayerResponseSchema,
  MediaPlayerStatusBroadcastSchema,
  MEDIA_PLAYER_CHANNEL,
} from "../models/MediaPlayer";

interface PendingCommand {
  resolve: (result: { success: boolean; data?: unknown; error?: string }) => void;
  timer: NodeJS.Timeout;
}

interface RegisteredDriver {
  driverId: MediaPlayerDriverId;
  clientId: string;
  lastStatus: MediaPlayerStatus | null;
  connectedAt: number;
}

export class MediaPlayerManager {
  private static instance: MediaPlayerManager;
  private logger: Logger;
  private wsHub: WebSocketHub;

  /** Map of correlationId → pending command awaiting response */
  private pendingCommands: Map<string, PendingCommand> = new Map();

  /** Map of driverId → registered driver info */
  private drivers: Map<MediaPlayerDriverId, RegisteredDriver> = new Map();

  private constructor() {
    this.logger = new Logger("MediaPlayerManager");
    this.wsHub = WebSocketHub.getInstance();
  }

  static getInstance(): MediaPlayerManager {
    if (!MediaPlayerManager.instance) {
      MediaPlayerManager.instance = new MediaPlayerManager();
    }
    return MediaPlayerManager.instance;
  }

  /**
   * Initialize the manager by registering WS message callbacks.
   * Called during backend startup.
   */
  init(): void {
    this.wsHub.setOnMediaPlayerCallback((clientId, message) => {
      this.handleMessage(clientId, message);
    });

    // Clean up driver when its WS client disconnects
    this.wsHub.setOnClientDisconnectCallback((clientId, _channels) => {
      for (const [driverId, driver] of this.drivers) {
        if (driver.clientId === clientId) {
          this.drivers.delete(driverId);
          this.logger.info(`Driver ${driverId} disconnected (client ${clientId})`);
          this.broadcastToDashboard({
            type: "disconnected",
            driverId,
          });
        }
      }
    });

    this.logger.info("MediaPlayerManager initialized");
  }

  /**
   * Send a command to a driver and wait for its response.
   */
  async sendCommand(
    driverId: MediaPlayerDriverId,
    action: MediaPlayerAction
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const driver = this.drivers.get(driverId);
    if (!driver) {
      return { success: false, error: `Driver "${driverId}" not connected` };
    }

    const correlationId = randomUUID();

    const command: MediaPlayerCommand = {
      type: "media-player-command",
      driverId,
      action,
      correlationId,
    };

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pendingCommands.delete(correlationId);
        resolve({ success: false, error: `Command "${action}" timed out` });
      }, MEDIA_PLAYER.COMMAND_TIMEOUT_MS);

      this.pendingCommands.set(correlationId, { resolve, timer });

      // Send command to the extension's WS client
      this.wsHub.sendToClient(driver.clientId, command);
      this.logger.debug(`Sent ${action} to ${driverId} (${correlationId})`);
    });
  }

  /**
   * Get status for a specific driver (from last known status).
   */
  getDriverStatus(driverId: MediaPlayerDriverId): {
    connected: boolean;
    status: MediaPlayerStatus | null;
  } {
    const driver = this.drivers.get(driverId);
    if (!driver) {
      return { connected: false, status: null };
    }
    return { connected: true, status: driver.lastStatus };
  }

  /**
   * Get status for all registered drivers.
   */
  getAllDriverStatus(): Record<string, { connected: boolean; status: MediaPlayerStatus | null }> {
    const result: Record<string, { connected: boolean; status: MediaPlayerStatus | null }> = {};
    for (const [driverId, driver] of this.drivers) {
      result[driverId] = { connected: true, status: driver.lastStatus };
    }
    return result;
  }

  /**
   * Clean up pending commands and driver state.
   * Called during backend shutdown.
   */
  shutdown(): void {
    for (const [, pending] of this.pendingCommands) {
      clearTimeout(pending.timer);
      pending.resolve({ success: false, error: "Server shutting down" });
    }
    this.pendingCommands.clear();
    this.drivers.clear();
    this.logger.info("MediaPlayerManager shut down");
  }

  /**
   * Handle incoming WS messages from Chrome extension.
   */
  private handleMessage(clientId: string, message: Record<string, unknown>): void {
    switch (message.type) {
      case "media-player-register":
        this.handleRegister(clientId, message);
        break;

      case "media-player-response":
        this.handleResponse(message);
        break;

      case "media-player-status":
        this.handleStatusUpdate(message);
        break;

      case "media-player-driver-event":
        this.handleDriverEvent(message);
        break;

      default:
        this.logger.warn(`Unknown media player message type: ${message.type}`);
    }
  }

  private handleRegister(clientId: string, message: Record<string, unknown>): void {
    const parsed = MediaPlayerRegisterSchema.safeParse(message);
    if (!parsed.success) {
      this.logger.warn("Invalid register message", parsed.error.message);
      return;
    }

    const { driverId } = parsed.data;
    this.drivers.set(driverId, {
      driverId,
      clientId,
      lastStatus: null,
      connectedAt: Date.now(),
    });

    this.logger.info(`Driver "${driverId}" registered (client ${clientId})`);

    this.broadcastToDashboard({
      type: "connected",
      driverId,
    });
  }

  private handleResponse(message: Record<string, unknown>): void {
    const parsed = MediaPlayerResponseSchema.safeParse(message);
    if (!parsed.success) {
      this.logger.warn("Invalid response message", parsed.error.message);
      return;
    }

    const { correlationId, success, data, error } = parsed.data;
    const pending = this.pendingCommands.get(correlationId);
    if (!pending) {
      this.logger.warn(`No pending command for correlation ${correlationId}`);
      return;
    }

    clearTimeout(pending.timer);
    this.pendingCommands.delete(correlationId);

    pending.resolve({ success, data, error });
  }

  private handleStatusUpdate(message: Record<string, unknown>): void {
    const parsed = MediaPlayerStatusBroadcastSchema.safeParse(message);
    if (!parsed.success) {
      this.logger.warn("Invalid status message", parsed.error.message);
      return;
    }

    const { driverId, status } = parsed.data;
    const driver = this.drivers.get(driverId);
    if (driver) {
      // Skip broadcast if status hasn't changed
      if (driver.lastStatus && this.isStatusEqual(driver.lastStatus, status)) {
        return;
      }
      driver.lastStatus = status;
    }

    this.broadcastToDashboard({
      type: "status",
      driverId,
      status,
    });
  }

  private handleDriverEvent(message: Record<string, unknown>): void {
    const driverId = MediaPlayerDriverId.safeParse(message.driverId);
    if (!driverId.success) return;

    if (message.event === "disconnected") {
      this.drivers.delete(driverId.data);
      this.logger.info(`Driver ${driverId.data} reported disconnected (tab closed)`);
      this.broadcastToDashboard({
        type: "disconnected",
        driverId: driverId.data,
      });
    }
  }

  private isStatusEqual(a: MediaPlayerStatus, b: MediaPlayerStatus): boolean {
    return a.track === b.track && a.artist === b.artist &&
      a.current === b.current && a.total === b.total && a.playing === b.playing &&
      a.artworkUrl === b.artworkUrl;
  }

  private broadcastToDashboard(event: MediaPlayerDashboardEvent): void {
    this.wsHub.broadcast(MEDIA_PLAYER_CHANNEL, event);
  }
}
