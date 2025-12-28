import { WebSocketHub } from "./WebSocketHub";
import { Logger } from "../utils/Logger";
import { OverlayEvent, OverlayChannel, AckEvent, RoomEvent, RoomEventType } from "../models/OverlayEvents";
import { randomUUID } from "crypto";

/**
 * Room channel prefix for dynamic room channels
 */
const ROOM_CHANNEL_PREFIX = "room:";

/**
 * ChannelManager provides pub/sub functionality for overlay channels
 */
export class ChannelManager {
  private static instance: ChannelManager;
  private wsHub: WebSocketHub;
  private logger: Logger;
  private pendingAcks: Map<string, NodeJS.Timeout>;

  private constructor() {
    this.wsHub = WebSocketHub.getInstance();
    this.logger = new Logger("ChannelManager");
    this.pendingAcks = new Map();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ChannelManager {
    if (!ChannelManager.instance) {
      ChannelManager.instance = new ChannelManager();
    }
    return ChannelManager.instance;
  }

  /**
   * Publish event to a channel
   */
  async publish(channel: OverlayChannel, type: string, payload?: unknown): Promise<void> {
    const event: OverlayEvent = {
      channel,
      type,
      payload,
      timestamp: Date.now(),
      id: randomUUID(),
    };

    this.logger.debug(`Publishing to ${channel}: ${type}`);
    this.wsHub.broadcast(channel, event);

    // Setup ack timeout
    this.setupAckTimeout(event.id, channel);
  }

  /**
   * Publish to lower third channel
   */
  async publishLowerThird(type: string, payload?: unknown): Promise<void> {
    await this.publish(OverlayChannel.LOWER, type, payload);
  }

  /**
   * Publish to countdown channel
   */
  async publishCountdown(type: string, payload?: unknown): Promise<void> {
    await this.publish(OverlayChannel.COUNTDOWN, type, payload);
  }

  /**
   * Publish to poster channel
   */
  async publishPoster(type: string, payload?: unknown): Promise<void> {
    await this.publish(OverlayChannel.POSTER, type, payload);
  }

  /**
   * Publish to system channel
   */
  async publishSystem(type: string, payload?: unknown): Promise<void> {
    await this.publish(OverlayChannel.SYSTEM, type, payload);
  }

  /**
   * Handle acknowledgment from overlay
   */
  handleAck(ackEvent: AckEvent): void {
    const timeout = this.pendingAcks.get(ackEvent.eventId);

    if (timeout) {
      clearTimeout(timeout);
      this.pendingAcks.delete(ackEvent.eventId);
      
      if (ackEvent.success) {
        this.logger.debug(`Received ack for event ${ackEvent.eventId}`);
      } else {
        this.logger.warn(`Received error ack for event ${ackEvent.eventId}: ${ackEvent.error}`);
      }
    }
  }

  /**
   * Setup acknowledgment timeout
   */
  private setupAckTimeout(eventId: string, channel: OverlayChannel): void {
    const timeout = setTimeout(() => {
      this.pendingAcks.delete(eventId);
      this.logger.warn(`No ack received for event ${eventId} on channel ${channel}`);
    }, 5000); // 5 second timeout

    this.pendingAcks.set(eventId, timeout);
  }

  /**
   * Get number of subscribers for a channel
   */
  getSubscriberCount(channel: OverlayChannel): number {
    return this.wsHub.getChannelSubscribers(channel);
  }

  /**
   * Check if channel has subscribers
   */
  hasSubscribers(channel: OverlayChannel): boolean {
    return this.getSubscriberCount(channel) > 0;
  }

  /**
   * Clear all pending acknowledgments
   */
  clearPendingAcks(): void {
    this.pendingAcks.forEach((timeout) => clearTimeout(timeout));
    this.pendingAcks.clear();
    this.logger.debug("Cleared all pending acks");
  }

  // ==================== ROOM METHODS ====================

  /**
   * Get room channel name from room ID
   */
  getRoomChannel(roomId: string): string {
    return `${ROOM_CHANNEL_PREFIX}${roomId}`;
  }

  /**
   * Check if a channel is a room channel
   */
  isRoomChannel(channel: string): boolean {
    return channel.startsWith(ROOM_CHANNEL_PREFIX);
  }

  /**
   * Extract room ID from room channel name
   */
  getRoomIdFromChannel(channel: string): string | null {
    if (!this.isRoomChannel(channel)) return null;
    return channel.slice(ROOM_CHANNEL_PREFIX.length);
  }

  /**
   * Publish event to a room
   */
  async publishToRoom(roomId: string, type: RoomEventType, payload?: unknown): Promise<void> {
    const channel = this.getRoomChannel(roomId);
    const event: RoomEvent = {
      roomId,
      type,
      payload,
      timestamp: Date.now(),
      id: randomUUID(),
    };

    this.logger.debug(`Publishing to room ${roomId}: ${type}`);
    this.wsHub.broadcast(channel, event);
  }

  /**
   * Get number of subscribers for a room
   */
  getRoomSubscribers(roomId: string): number {
    const channel = this.getRoomChannel(roomId);
    return this.wsHub.getChannelSubscribers(channel);
  }

  /**
   * Check if room has subscribers
   */
  roomHasSubscribers(roomId: string): boolean {
    return this.getRoomSubscribers(roomId) > 0;
  }
}

