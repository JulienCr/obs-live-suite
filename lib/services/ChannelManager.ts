import { WebSocketHub } from "./WebSocketHub";
import { Logger } from "../utils/Logger";
import { OverlayEvent, OverlayChannel, AckEvent, RoomEvent, RoomEventType } from "../models/OverlayEvents";
import { randomUUID } from "crypto";
import { WEBSOCKET } from "../config/Constants";

/**
 * Hardcoded presenter channel name
 */
const PRESENTER_CHANNEL = "presenter";

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

    // Register ack callback so WebSocketHub forwards client acks to us
    this.wsHub.setOnAckCallback((ack) => {
      this.handleAck({
        eventId: ack.eventId,
        channel: ack.channel as OverlayChannel,
        success: ack.success,
        error: ack.error,
        timestamp: Date.now(),
      });
    });
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
    }, WEBSOCKET.ACK_TIMEOUT_MS);

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

  // ==================== PRESENTER METHODS ====================

  /**
   * Get the presenter channel name
   */
  getPresenterChannel(): string {
    return PRESENTER_CHANNEL;
  }

  /**
   * Publish event to the presenter channel
   */
  async publishToPresenter(type: RoomEventType, payload?: unknown): Promise<void> {
    const channel = PRESENTER_CHANNEL;
    const event: RoomEvent = {
      type,
      payload,
      timestamp: Date.now(),
      id: randomUUID(),
    };
    this.logger.debug(`Publishing to presenter: ${type}`);
    this.wsHub.broadcast(channel, event);
  }

  /**
   * Get number of subscribers for the presenter channel
   */
  getPresenterSubscribers(): number {
    return this.wsHub.getChannelSubscribers(PRESENTER_CHANNEL);
  }

  /**
   * Check if presenter channel has subscribers
   */
  presenterHasSubscribers(): boolean {
    return this.getPresenterSubscribers() > 0;
  }
}

