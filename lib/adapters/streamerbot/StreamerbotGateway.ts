import { StreamerbotClient } from "@streamerbot/client";
import { Logger } from "../../utils/Logger";
import { SettingsService } from "../../services/SettingsService";
import { WebSocketHub } from "../../services/WebSocketHub";
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
 * StreamerbotGateway manages backend connection to Streamer.bot and relays messages
 * to frontend clients via WebSocket hub
 */
export class StreamerbotGateway {
  private static instance: StreamerbotGateway;
  private client: StreamerbotClient | null;
  private logger: Logger;
  private settingsService: SettingsService;
  private wsHub: WebSocketHub;
  private status: StreamerbotConnectionStatus;
  private reconnectTimer?: NodeJS.Timeout;
  private reconnectAttempts: number;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private lastEventTime?: number;
  private currentError?: StreamerbotConnectionError;

  private constructor() {
    this.client = null;
    this.logger = new Logger("StreamerbotGateway");
    this.settingsService = SettingsService.getInstance();
    this.wsHub = WebSocketHub.getInstance();
    this.status = StreamerbotConnectionStatus.DISCONNECTED;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 3000;
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
      this.broadcastMessage(message);
    } catch (error) {
      this.logger.error("Failed to normalize Streamer.bot event", error);
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

    // WebSocketHub.broadcast() automatically wraps with { channel, data }
    // So we just pass the data object directly
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
      status: this.status,
      error: this.currentError,
      lastEventTime: this.lastEventTime,
    };

    const payload: StreamerbotGatewayMessage = {
      type: "status",
      payload: statusPayload,
    };

    // WebSocketHub.broadcast() automatically wraps with { channel, data }
    this.wsHub.broadcast("streamerbot-chat", {
      type: "status",
      payload,
      timestamp: Date.now(),
    });
  }

  /**
   * Connect to Streamer.bot using stored settings
   */
  async connect(): Promise<void> {
    const settings = this.settingsService.getStreamerbotSettings();

    if (this.status === StreamerbotConnectionStatus.CONNECTED) {
      this.logger.info("Disconnecting existing Streamer.bot connection");
      await this.disconnect();
    }

    this.status = StreamerbotConnectionStatus.CONNECTING;
    this.logger.info(`Connecting to Streamer.bot at ${settings.scheme}://${settings.host}:${settings.port}${settings.endpoint}...`);
    this.broadcastStatus();

    try {
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
          Twitch: ["ChatMessage", "Follow", "Sub", "ReSub", "GiftSub", "GiftBomb", "Raid", "Cheer"],
          YouTube: ["Message", "NewSponsor", "NewSubscriber", "SuperChat", "SuperSticker"],
        },
        onConnect: () => {
          this.logger.info("Streamer.bot connected");
          this.status = StreamerbotConnectionStatus.CONNECTED;
          this.reconnectAttempts = 0;
          this.currentError = undefined;
          this.broadcastStatus();
        },
        onDisconnect: () => {
          this.logger.warn("Streamer.bot disconnected");
          this.status = StreamerbotConnectionStatus.DISCONNECTED;
          this.broadcastStatus();
          this.scheduleReconnect();
        },
        onError: (error: Error) => {
          this.logger.error("Streamer.bot error", error);
          this.status = StreamerbotConnectionStatus.ERROR;
          this.currentError = {
            type: StreamerbotErrorType.WEBSOCKET_ERROR,
            message: error.message,
            originalError: error,
          };
          this.broadcastStatus();
          this.scheduleReconnect();
        },
      });

      // Setup event listeners for chat/events
      this.setupEventListeners();

      // Connect
      await this.client.connect();
    } catch (error) {
      this.status = StreamerbotConnectionStatus.ERROR;
      const errorMessage = error instanceof Error ? error.message : "Failed to connect to Streamer.bot";
      this.currentError = {
        type: StreamerbotErrorType.CONNECTION_REFUSED,
        message: errorMessage,
        originalError: error,
      };
      this.logger.error("Failed to connect to Streamer.bot", error);
      this.broadcastStatus();
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * Disconnect from Streamer.bot
   */
  async disconnect(): Promise<void> {
    // Clear any pending reconnect
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    // Disable autoConnect
    this.settingsService.setStreamerbotAutoConnect(false);

    if (this.client && this.status === StreamerbotConnectionStatus.CONNECTED) {
      this.client.disconnect();
      this.client = null;
      this.status = StreamerbotConnectionStatus.DISCONNECTED;
      this.logger.info("Disconnected from Streamer.bot");
      this.broadcastStatus();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error("Max reconnection attempts reached");
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.logger.info(`Scheduling Streamer.bot reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = undefined;
      try {
        await this.connect();
      } catch {
        // Error already logged in connect()
      }
    }, delay);
  }

  /**
   * Send a chat message to Streamer.bot
   */
  async sendMessage(platform: ChatPlatform, message: string): Promise<void> {
    if (!this.client || this.status !== StreamerbotConnectionStatus.CONNECTED) {
      throw new Error("Not connected to Streamer.bot");
    }

    try {
      await this.client.sendMessage(platform, message, { bot: false, internal: false });
      this.logger.debug(`Sent message to ${platform}: ${message}`);
    } catch (error) {
      this.logger.error(`Failed to send message to ${platform}`, error);
      throw error;
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): StreamerbotGatewayStatus {
    return {
      status: this.status,
      error: this.currentError,
      lastEventTime: this.lastEventTime,
    };
  }

  /**
   * Get current connection state
   */
  isConnected(): boolean {
    return this.status === StreamerbotConnectionStatus.CONNECTED;
  }
}
