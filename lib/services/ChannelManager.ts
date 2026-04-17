import { WebSocketHub } from "./WebSocketHub";
import { Logger } from "../utils/Logger";
import { OverlayEvent, OverlayChannel, AckEvent, RoomEvent, RoomEventType, PosterEventType } from "../models/OverlayEvents";
import { randomUUID } from "crypto";
import { WEBSOCKET } from "../config/Constants";

/**
 * Hardcoded presenter channel name
 */
const PRESENTER_CHANNEL = "presenter";

/**
 * Tracked state for an active poster channel. Stored so that:
 *  - Re-subscribing dashboards can be replayed the current show event
 *    (needed for reload-persists-ownership to work on the regie preview).
 *  - The takeover action knows what to re-broadcast.
 */
interface PosterChannelState {
  payload: Record<string, unknown>;
  ownerClientId?: string;
  eventId: string;
  /**
   * Auto-expiry timer: when the show payload carries a `duration`, the
   * overlay renderer self-hides client-side without emitting a backend hide.
   * Mirror that here so replays don't resurrect a poster that is no longer
   * on-air, and so `takeoverPoster` can't claim a dead channel.
   */
  expiryTimer?: NodeJS.Timeout;
}

const POSTER_CHANNELS: ReadonlySet<OverlayChannel> = new Set([
  OverlayChannel.POSTER,
  OverlayChannel.POSTER_BIGPICTURE,
]);

/**
 * Pending ack entry with its associated channel
 */
interface PendingAck {
  timeout: NodeJS.Timeout;
  channel: string;
}

/**
 * ChannelManager provides pub/sub functionality for overlay channels
 */
export class ChannelManager {
  private static instance: ChannelManager;
  private wsHub: WebSocketHub;
  private logger: Logger;
  private pendingAcks: Map<string, PendingAck>;
  private posterStates: Map<OverlayChannel, PosterChannelState>;

  private constructor() {
    this.wsHub = WebSocketHub.getInstance();
    this.logger = new Logger("ChannelManager");
    this.pendingAcks = new Map();
    this.posterStates = new Map();

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

    // Register disconnect callback to clear orphaned pending acks
    this.wsHub.setOnClientDisconnectCallback((_clientId, channels) => {
      this.clearOrphanedAcks(channels);
    });

    // Replay the current poster show event to reconnecting dashboards so the
    // regie preview can re-appear immediately for the owner after a reload.
    this.wsHub.setOnSubscribeCallback((clientId, channel) => {
      const overlayChannel = channel as OverlayChannel;
      if (!POSTER_CHANNELS.has(overlayChannel)) return;
      const state = this.posterStates.get(overlayChannel);
      if (!state) return;
      this.wsHub.sendToClient(clientId, {
        channel,
        data: {
          channel,
          type: PosterEventType.SHOW,
          payload: state.payload,
          timestamp: Date.now(),
          id: state.eventId,
        },
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

    // Track poster state so reconnecting dashboards can be replayed.
    if (POSTER_CHANNELS.has(channel)) {
      if (type === PosterEventType.SHOW && payload && typeof payload === "object") {
        this.recordPosterShow(channel, payload as Record<string, unknown>, event.id);
      } else if (type === PosterEventType.HIDE) {
        this.clearPosterState(channel);
      }
    }

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
   * Record that a poster show just happened on this channel so reconnecting
   * dashboards can be replayed the state (owner included).
   *
   * The stored payload is a snapshot at publish-time — if the active theme is
   * edited mid-show, a replayed show still carries the old theme. This is only
   * consumed by the regie dashboard preview (which ignores the theme), not by
   * the overlay renderer, so it is harmless today. The `eventId` is likewise
   * frozen; any future consumer that dedupes by id should be aware.
   */
  recordPosterShow(channel: OverlayChannel, payload: Record<string, unknown>, eventId: string): void {
    if (!POSTER_CHANNELS.has(channel)) return;

    // Replace any existing tracked state for this channel; clear the previous
    // expiry timer so it doesn't fire against the new show.
    const previous = this.posterStates.get(channel);
    if (previous?.expiryTimer) {
      clearTimeout(previous.expiryTimer);
    }

    const duration = typeof payload.duration === "number" && payload.duration > 0
      ? payload.duration
      : undefined;
    const expiryTimer = duration
      ? setTimeout(() => {
          // Only clear if still the same show — a later show event supersedes us.
          const current = this.posterStates.get(channel);
          if (current?.eventId === eventId) {
            this.posterStates.delete(channel);
          }
        }, duration * 1000)
      : undefined;

    this.posterStates.set(channel, {
      payload,
      ownerClientId: typeof payload.ownerClientId === "string" ? payload.ownerClientId : undefined,
      eventId,
      expiryTimer,
    });
  }

  /**
   * Clear tracked state for a poster channel (on hide).
   */
  clearPosterState(channel: OverlayChannel): void {
    const state = this.posterStates.get(channel);
    if (state?.expiryTimer) {
      clearTimeout(state.expiryTimer);
    }
    this.posterStates.delete(channel);
  }

  /**
   * Reassign the owner of the current poster on this channel without
   * re-playing media. No-op if there is no active poster.
   * Returns true if the takeover was applied.
   */
  async takeoverPoster(channel: OverlayChannel, ownerClientId: string): Promise<boolean> {
    const state = this.posterStates.get(channel);
    if (!state) return false;

    const nextPayload = { ...state.payload, ownerClientId };
    this.posterStates.set(channel, { ...state, payload: nextPayload, ownerClientId });
    await this.publish(channel, PosterEventType.TAKEOVER, { ownerClientId });
    return true;
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
    const pending = this.pendingAcks.get(ackEvent.eventId);

    if (pending) {
      clearTimeout(pending.timeout);
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

    this.pendingAcks.set(eventId, { timeout, channel });
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
    this.pendingAcks.forEach((pending) => clearTimeout(pending.timeout));
    this.pendingAcks.clear();
    this.logger.debug("Cleared all pending acks");
  }

  /**
   * Clear pending acks for channels that have no remaining subscribers.
   * Called when a client disconnects to prevent zombie timers.
   */
  private clearOrphanedAcks(disconnectedChannels: Set<string>): void {
    for (const [eventId, pending] of this.pendingAcks) {
      if (disconnectedChannels.has(pending.channel) && this.wsHub.getChannelSubscribers(pending.channel) === 0) {
        clearTimeout(pending.timeout);
        this.pendingAcks.delete(eventId);
        this.logger.debug(`Cleared orphaned pending ack ${eventId} for channel ${pending.channel}`);
      }
    }
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
