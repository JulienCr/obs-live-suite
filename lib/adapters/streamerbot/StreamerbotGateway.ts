import { StreamerbotClient } from "@streamerbot/client";
import { SettingsService } from "../../services/SettingsService";
import { WebSocketHub } from "../../services/WebSocketHub";
import { DatabaseService } from "../../services/DatabaseService";
import {
  ConnectionManager,
  ConnectionStatus as BaseConnectionStatus,
  ConnectionError,
} from "../../utils/ConnectionManager";
import {
  ChatMessage,
  StreamerbotConnectionStatus,
  StreamerbotErrorType,
  StreamerbotConnectionError,
  StreamerbotGatewayMessage,
  StreamerbotGatewayStatus,
  ChatPlatform,
  normalizeTwitchChatMessage,
  normalizeTwitchFollowEvent,
  normalizeTwitchSubEvent,
  normalizeTwitchReSubEvent,
  normalizeTwitchGiftSubEvent,
  normalizeTwitchRaidEvent,
  normalizeTwitchCheerEvent,
  normalizeYouTubeChatMessage,
  normalizeYouTubeNewSponsor,
  normalizeYouTubeSuperChat,
  normalizeYouTubeSuperSticker,
} from "../../models/StreamerbotChat";

/**
 * Map base ConnectionStatus to StreamerbotConnectionStatus
 */
function mapConnectionStatus(status: BaseConnectionStatus): StreamerbotConnectionStatus {
  switch (status) {
    case BaseConnectionStatus.CONNECTED:
      return StreamerbotConnectionStatus.CONNECTED;
    case BaseConnectionStatus.CONNECTING:
      return StreamerbotConnectionStatus.CONNECTING;
    case BaseConnectionStatus.ERROR:
      return StreamerbotConnectionStatus.ERROR;
    default:
      return StreamerbotConnectionStatus.DISCONNECTED;
  }
}

/**
 * StreamerbotGateway manages backend connection to Streamer.bot and relays messages
 * to frontend clients via WebSocket hub.
 * Extends ConnectionManager for standardized reconnection logic.
 */
export class StreamerbotGateway extends ConnectionManager {
  private static instance: StreamerbotGateway;
  private client: StreamerbotClient | null;
  private settingsService: SettingsService;
  private wsHub: WebSocketHub;
  private lastEventTime?: number;
  private currentStreamerbotError?: StreamerbotConnectionError;

  private constructor() {
    super({ loggerName: "StreamerbotGateway" });
    this.client = null;
    this.settingsService = SettingsService.getInstance();
    this.wsHub = WebSocketHub.getInstance();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): StreamerbotGateway {
    if (!StreamerbotGateway.instance) {
      StreamerbotGateway.instance = new StreamerbotGateway();
    }
    return StreamerbotGateway.instance;
  }

  /**
   * Setup Streamer.bot event listeners (for chat/events only)
   */
  private setupEventListeners(): void {
    if (!this.client) return;

    // Twitch events
    this.client.on("Twitch.ChatMessage", (data) => {
      this.handleEvent(() => normalizeTwitchChatMessage(data));
    });

    this.client.on("Twitch.Follow", (data) => {
      this.handleEvent(() => normalizeTwitchFollowEvent(data));
    });

    this.client.on("Twitch.Sub", (data) => {
      this.handleEvent(() => normalizeTwitchSubEvent(data));
    });

    this.client.on("Twitch.ReSub", (data) => {
      this.handleEvent(() => normalizeTwitchReSubEvent(data));
    });

    this.client.on("Twitch.GiftSub", (data) => {
      this.handleEvent(() => normalizeTwitchGiftSubEvent(data));
    });

    this.client.on("Twitch.Raid", (data) => {
      this.handleEvent(() => normalizeTwitchRaidEvent(data));
    });

    this.client.on("Twitch.Cheer", (data) => {
      this.handleEvent(() => normalizeTwitchCheerEvent(data));
    });

    // YouTube events
    this.client.on("YouTube.Message", (data) => {
      this.handleEvent(() => normalizeYouTubeChatMessage(data));
    });

    this.client.on("YouTube.NewSponsor", (data) => {
      this.handleEvent(() => normalizeYouTubeNewSponsor(data));
    });

    this.client.on("YouTube.SuperChat", (data) => {
      this.handleEvent(() => normalizeYouTubeSuperChat(data));
    });

    this.client.on("YouTube.SuperSticker", (data) => {
      this.handleEvent(() => normalizeYouTubeSuperSticker(data));
    });
  }

  /**
   * Handle incoming event and broadcast to WebSocket clients
   */
  private handleEvent(normalizer: () => ChatMessage): void {
    try {
      const message = normalizer();
      this.lastEventTime = Date.now();
      this.persistMessage(message);
      this.broadcastMessage(message);
    } catch (error) {
      this.logger.error("Failed to normalize Streamer.bot event", error);
    }
  }

  /**
   * Persist chat message to database rolling buffer
   */
  private persistMessage(message: ChatMessage): void {
    try {
      const db = DatabaseService.getInstance();
      db.insertStreamerbotChatMessage({
        id: message.id,
        timestamp: message.timestamp,
        platform: message.platform,
        eventType: message.eventType,
        channel: message.channel || null,
        username: message.username,
        displayName: message.displayName,
        message: message.message,
        parts: message.parts || null,
        metadata: message.metadata || null,
      });
    } catch (error) {
      this.logger.error("Failed to persist chat message", error);
      // Don't throw - message still broadcasts even if persistence fails
    }
  }

  /**
   * Broadcast chat message to all WebSocket clients
   */
  private broadcastMessage(message: ChatMessage): void {
    const payload: StreamerbotGatewayMessage = {
      type: "message",
      payload: message,
    };

    this.wsHub.broadcast("streamerbot-chat", {
      type: "message",
      payload,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast connection status to all WebSocket clients
   */
  private broadcastStatus(): void {
    const statusPayload: StreamerbotGatewayStatus = {
      status: mapConnectionStatus(this.status),
      error: this.currentStreamerbotError,
      lastEventTime: this.lastEventTime,
    };

    const payload: StreamerbotGatewayMessage = {
      type: "status",
      payload: statusPayload,
    };

    this.wsHub.broadcast("streamerbot-chat", {
      type: "status",
      payload,
      timestamp: Date.now(),
    });
  }

  /**
   * Implementation-specific connection logic
   */
  protected async doConnect(): Promise<void> {
    const settings = this.settingsService.getStreamerbotSettings();
    this.logger.info(
      `Connecting to Streamer.bot at ${settings.scheme}://${settings.host}:${settings.port}${settings.endpoint}...`
    );
    this.broadcastStatus();

    // Create new client with settings
    this.client = new StreamerbotClient({
      host: settings.host,
      port: settings.port,
      endpoint: settings.endpoint,
      scheme: settings.scheme,
      password: settings.password,
      immediate: false,
      autoReconnect: false, // We handle reconnection ourselves
      subscribe: {
        Twitch: [
          "ChatMessage",
          "Follow",
          "Sub",
          "ReSub",
          "GiftSub",
          "GiftBomb",
          "Raid",
          "Cheer",
        ],
        YouTube: [
          "Message",
          "NewSponsor",
          "NewSubscriber",
          "SuperChat",
          "SuperSticker",
        ],
      },
      onConnect: () => {
        this.logger.info("Streamer.bot connected");
        this.currentStreamerbotError = undefined;
        this.broadcastStatus();
      },
      onDisconnect: () => {
        this.handleConnectionClosed();
      },
      onError: (error: Error) => {
        this.handleConnectionError({
          type: StreamerbotErrorType.WEBSOCKET_ERROR,
          message: error.message,
          originalError: error,
        });
      },
    });

    // Setup event listeners for chat/events
    this.setupEventListeners();

    // Connect
    await this.client.connect();
  }

  /**
   * Implementation-specific disconnection logic
   */
  protected async doDisconnect(): Promise<void> {
    // Disable autoConnect
    this.settingsService.setStreamerbotAutoConnect(false);

    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
  }

  /**
   * Called when connection is successfully established
   */
  protected override onConnected(): void {
    super.onConnected();
    this.currentStreamerbotError = undefined;
    this.broadcastStatus();
  }

  /**
   * Called when connection is closed
   */
  protected override onDisconnected(): void {
    this.logger.warn("Streamer.bot disconnected");
    this.broadcastStatus();
  }

  /**
   * Called when connection error occurs
   */
  protected override onError(error: ConnectionError): void {
    super.onError(error);
    this.currentStreamerbotError = {
      type: error.type as StreamerbotErrorType,
      message: error.message,
      originalError: error.originalError,
    };
    this.broadcastStatus();
  }

  /**
   * Send a chat message to Streamer.bot
   */
  async sendMessage(platform: ChatPlatform, message: string): Promise<void> {
    if (!this.client || !this.isConnected()) {
      throw new Error("Not connected to Streamer.bot");
    }

    try {
      await this.client.sendMessage(platform, message, {
        bot: false,
        internal: false,
      });
      this.logger.debug(`Sent message to ${platform}: ${message}`);
    } catch (error) {
      this.logger.error(`Failed to send message to ${platform}`, error);
      throw error;
    }
  }

  /**
   * Get current connection status (with Streamerbot-specific types)
   */
  getStreamerbotStatus(): StreamerbotGatewayStatus {
    return {
      status: mapConnectionStatus(this.status),
      error: this.currentStreamerbotError,
      lastEventTime: this.lastEventTime,
    };
  }
}
