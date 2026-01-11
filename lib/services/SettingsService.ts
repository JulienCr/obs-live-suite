import { DatabaseService } from "./DatabaseService";
import { Logger } from "../utils/Logger";
import { StreamerbotConnectionSettings, DEFAULT_STREAMERBOT_CONNECTION } from "../models/StreamerbotChat";
import { AppConfig } from "../config/AppConfig";
import { TwitchSettings, TwitchOAuthTokens, DEFAULT_TWITCH_SETTINGS } from "../models/Twitch";
import { PresenterChannelSettings, DEFAULT_QUICK_REPLIES } from "../models/PresenterChannel";
import type { ChatPredefinedMessage } from "../models/ChatMessages";

/**
 * OBS settings interface
 */
export interface OBSSettings {
  url: string;
  password?: string;
}

/**
 * Streamerbot settings interface (extends connection settings with autoConnect flag)
 */
export interface StreamerbotSettings extends StreamerbotConnectionSettings {
  autoConnect: boolean;
}

/**
 * Overlay settings interface
 */
export interface OverlaySettings {
  lowerThirdDuration: number;      // seconds
  chatHighlightDuration: number;   // seconds
  chatHighlightAutoHide: boolean;  // toggle on/off
}

/**
 * Default overlay settings
 */
export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = {
  lowerThirdDuration: 8,
  chatHighlightDuration: 10,
  chatHighlightAutoHide: true,
};

/**
 * Chat message settings interface
 * Controls automatic chat message sending when posters/guests are triggered
 */
export interface ChatMessageSettings {
  posterChatMessageEnabled: boolean;
  guestChatMessageEnabled: boolean;
}

/**
 * Default chat message settings (disabled by default)
 */
export const DEFAULT_CHAT_MESSAGE_SETTINGS: ChatMessageSettings = {
  posterChatMessageEnabled: false,
  guestChatMessageEnabled: false,
};

/**
 * SettingsService manages application settings with fallback to environment variables
 */
export class SettingsService {
  private static instance: SettingsService;
  private db: DatabaseService;
  private logger: Logger;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.logger = new Logger("SettingsService");
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  /**
   * Get OBS WebSocket settings
   * Priority: Database > Environment Variables
   */
  getOBSSettings(): OBSSettings {
    // Try to get from database first
    const dbUrl = this.db.getSetting("obs.websocket.url");
    const dbPassword = this.db.getSetting("obs.websocket.password");

    // Fallback to AppConfig (which reads from environment variables)
    const config = AppConfig.getInstance();
    const url = dbUrl || config.obsWebSocketUrl;
    const password = dbPassword || config.obsWebSocketPassword;

    this.logger.debug(
      `OBS settings loaded: URL from ${dbUrl ? "database" : "environment"}, ` +
      `Password from ${dbPassword ? "database" : dbPassword === null ? "environment" : "none"}`
    );

    return { url, password };
  }

  /**
   * Save OBS WebSocket settings to database
   */
  saveOBSSettings(settings: OBSSettings): void {
    this.db.setSetting("obs.websocket.url", settings.url);
    
    if (settings.password) {
      this.db.setSetting("obs.websocket.password", settings.password);
    } else {
      // If password is empty, delete it from database (fallback to env)
      this.db.deleteSetting("obs.websocket.password");
    }

    this.logger.info("OBS settings saved to database");
  }

  /**
   * Clear OBS settings from database (will fallback to environment variables)
   */
  clearOBSSettings(): void {
    this.db.deleteSetting("obs.websocket.url");
    this.db.deleteSetting("obs.websocket.password");
    this.logger.info("OBS settings cleared from database");
  }

  /**
   * Check if OBS settings are defined in database
   */
  hasOBSSettingsInDatabase(): boolean {
    return this.db.getSetting("obs.websocket.url") !== null;
  }

  /**
   * Get general UI settings
   */
  getGeneralSettings(): { defaultPosterDisplayMode: string } {
    const mode = this.db.getSetting("ui.poster.defaultDisplayMode");
    return {
      defaultPosterDisplayMode: mode || "left",
    };
  }

  /**
   * Save general UI settings
   */
  saveGeneralSettings(settings: { defaultPosterDisplayMode?: string }): void {
    if (settings.defaultPosterDisplayMode) {
      this.db.setSetting("ui.poster.defaultDisplayMode", settings.defaultPosterDisplayMode);
    }
    this.logger.info("General settings saved to database");
  }

  /**
   * Get Streamerbot connection settings
   * Priority: Database > Defaults
   */
  getStreamerbotSettings(): StreamerbotSettings {
    const host = this.db.getSetting("streamerbot.host") || DEFAULT_STREAMERBOT_CONNECTION.host;
    const port = this.db.getSetting("streamerbot.port")
      ? parseInt(this.db.getSetting("streamerbot.port")!, 10)
      : DEFAULT_STREAMERBOT_CONNECTION.port;
    const endpoint = this.db.getSetting("streamerbot.endpoint") || DEFAULT_STREAMERBOT_CONNECTION.endpoint;
    const scheme = (this.db.getSetting("streamerbot.scheme") as "ws" | "wss") || DEFAULT_STREAMERBOT_CONNECTION.scheme;
    const password = this.db.getSetting("streamerbot.password") || undefined;
    const autoConnect = this.db.getSetting("streamerbot.autoConnect") === "true";

    this.logger.debug(`Streamerbot settings loaded: ${scheme}://${host}:${port}${endpoint}, autoConnect: ${autoConnect}`);

    return {
      host,
      port,
      endpoint,
      scheme,
      password,
      autoConnect,
      autoReconnect: true, // Always enabled for gateway
    };
  }

  /**
   * Save Streamerbot connection settings to database
   */
  saveStreamerbotSettings(settings: Partial<StreamerbotSettings>): void {
    if (settings.host) this.db.setSetting("streamerbot.host", settings.host);
    if (settings.port !== undefined) this.db.setSetting("streamerbot.port", settings.port.toString());
    if (settings.endpoint) this.db.setSetting("streamerbot.endpoint", settings.endpoint);
    if (settings.scheme) this.db.setSetting("streamerbot.scheme", settings.scheme);

    if (settings.password) {
      this.db.setSetting("streamerbot.password", settings.password);
    } else if (settings.password === "") {
      // Empty string means explicitly clear password
      this.db.deleteSetting("streamerbot.password");
    }

    if (settings.autoConnect !== undefined) {
      this.db.setSetting("streamerbot.autoConnect", settings.autoConnect.toString());
    }

    this.logger.info("Streamerbot settings saved to database");
  }

  /**
   * Enable/disable auto-connect for Streamerbot gateway
   */
  setStreamerbotAutoConnect(enabled: boolean): void {
    this.db.setSetting("streamerbot.autoConnect", enabled.toString());
    this.logger.info(`Streamerbot autoConnect ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Check if Streamerbot auto-connect is enabled
   */
  isStreamerbotAutoConnectEnabled(): boolean {
    return this.db.getSetting("streamerbot.autoConnect") === "true";
  }

  /**
   * Clear Streamerbot settings from database
   */
  clearStreamerbotSettings(): void {
    this.db.deleteSetting("streamerbot.host");
    this.db.deleteSetting("streamerbot.port");
    this.db.deleteSetting("streamerbot.endpoint");
    this.db.deleteSetting("streamerbot.scheme");
    this.db.deleteSetting("streamerbot.password");
    this.db.deleteSetting("streamerbot.autoConnect");
    this.logger.info("Streamerbot settings cleared from database");
  }

  /**
   * Get overlay settings
   */
  getOverlaySettings(): OverlaySettings {
    const lowerThirdDuration = this.db.getSetting("overlay.lowerThird.defaultDuration");
    const chatHighlightDuration = this.db.getSetting("overlay.chatHighlight.defaultDuration");
    const chatHighlightAutoHide = this.db.getSetting("overlay.chatHighlight.autoHideEnabled");

    return {
      lowerThirdDuration: lowerThirdDuration
        ? parseInt(lowerThirdDuration, 10)
        : DEFAULT_OVERLAY_SETTINGS.lowerThirdDuration,
      chatHighlightDuration: chatHighlightDuration
        ? parseInt(chatHighlightDuration, 10)
        : DEFAULT_OVERLAY_SETTINGS.chatHighlightDuration,
      chatHighlightAutoHide: chatHighlightAutoHide !== null
        ? chatHighlightAutoHide === "true"
        : DEFAULT_OVERLAY_SETTINGS.chatHighlightAutoHide,
    };
  }

  /**
   * Save overlay settings to database
   */
  saveOverlaySettings(settings: Partial<OverlaySettings>): void {
    if (settings.lowerThirdDuration !== undefined) {
      this.db.setSetting("overlay.lowerThird.defaultDuration", settings.lowerThirdDuration.toString());
    }
    if (settings.chatHighlightDuration !== undefined) {
      this.db.setSetting("overlay.chatHighlight.defaultDuration", settings.chatHighlightDuration.toString());
    }
    if (settings.chatHighlightAutoHide !== undefined) {
      this.db.setSetting("overlay.chatHighlight.autoHideEnabled", settings.chatHighlightAutoHide.toString());
    }
    this.logger.info("Overlay settings saved to database");
  }

  /**
   * Get chat message settings
   */
  getChatMessageSettings(): ChatMessageSettings {
    const posterEnabled = this.db.getSetting("chatMessage.poster.enabled");
    const guestEnabled = this.db.getSetting("chatMessage.guest.enabled");

    return {
      posterChatMessageEnabled: posterEnabled !== null
        ? posterEnabled === "true"
        : DEFAULT_CHAT_MESSAGE_SETTINGS.posterChatMessageEnabled,
      guestChatMessageEnabled: guestEnabled !== null
        ? guestEnabled === "true"
        : DEFAULT_CHAT_MESSAGE_SETTINGS.guestChatMessageEnabled,
    };
  }

  /**
   * Save chat message settings to database
   */
  saveChatMessageSettings(settings: Partial<ChatMessageSettings>): void {
    if (settings.posterChatMessageEnabled !== undefined) {
      this.db.setSetting("chatMessage.poster.enabled", settings.posterChatMessageEnabled.toString());
    }
    if (settings.guestChatMessageEnabled !== undefined) {
      this.db.setSetting("chatMessage.guest.enabled", settings.guestChatMessageEnabled.toString());
    }
    this.logger.info("Chat message settings saved to database");
  }

  // =========================================================================
  // TWITCH SETTINGS
  // =========================================================================

  /**
   * Get Twitch integration settings
   */
  getTwitchSettings(): TwitchSettings {
    const enabled = this.db.getSetting("twitch.enabled");
    const pollIntervalMs = this.db.getSetting("twitch.pollIntervalMs");
    const preferredProvider = this.db.getSetting("twitch.preferredProvider");
    const clientId = this.db.getSetting("twitch.clientId");
    const oauthJson = this.db.getSetting("twitch.oauth");

    let oauth: TwitchOAuthTokens | null = null;
    if (oauthJson) {
      try {
        oauth = JSON.parse(oauthJson);
      } catch {
        this.logger.warn("Failed to parse Twitch OAuth tokens");
      }
    }

    return {
      enabled: enabled !== null ? enabled === "true" : DEFAULT_TWITCH_SETTINGS.enabled,
      pollIntervalMs: pollIntervalMs
        ? parseInt(pollIntervalMs, 10)
        : DEFAULT_TWITCH_SETTINGS.pollIntervalMs,
      preferredProvider: (preferredProvider as TwitchSettings["preferredProvider"]) ||
        DEFAULT_TWITCH_SETTINGS.preferredProvider,
      clientId: clientId || undefined,
      oauth,
    };
  }

  /**
   * Save Twitch integration settings to database
   */
  saveTwitchSettings(settings: Partial<TwitchSettings>): void {
    if (settings.enabled !== undefined) {
      this.db.setSetting("twitch.enabled", settings.enabled.toString());
    }
    if (settings.pollIntervalMs !== undefined) {
      this.db.setSetting("twitch.pollIntervalMs", settings.pollIntervalMs.toString());
    }
    if (settings.preferredProvider !== undefined) {
      this.db.setSetting("twitch.preferredProvider", settings.preferredProvider);
    }
    if (settings.clientId !== undefined) {
      if (settings.clientId) {
        this.db.setSetting("twitch.clientId", settings.clientId);
      } else {
        this.db.deleteSetting("twitch.clientId");
      }
    }
    this.logger.info("Twitch settings saved to database");
  }

  /**
   * Save Twitch OAuth tokens
   */
  saveTwitchOAuthTokens(tokens: TwitchOAuthTokens | null): void {
    if (tokens) {
      this.db.setSetting("twitch.oauth", JSON.stringify(tokens));
    } else {
      this.db.deleteSetting("twitch.oauth");
    }
    this.logger.info("Twitch OAuth tokens saved");
  }

  /**
   * Get Twitch OAuth tokens
   */
  getTwitchOAuthTokens(): TwitchOAuthTokens | null {
    const oauthJson = this.db.getSetting("twitch.oauth");
    if (!oauthJson) return null;

    try {
      return JSON.parse(oauthJson);
    } catch {
      return null;
    }
  }

  /**
   * Check if Twitch integration is enabled
   */
  isTwitchEnabled(): boolean {
    const enabled = this.db.getSetting("twitch.enabled");
    return enabled === null ? DEFAULT_TWITCH_SETTINGS.enabled : enabled === "true";
  }

  /**
   * Clear all Twitch settings
   */
  clearTwitchSettings(): void {
    this.db.deleteSetting("twitch.enabled");
    this.db.deleteSetting("twitch.pollIntervalMs");
    this.db.deleteSetting("twitch.preferredProvider");
    this.db.deleteSetting("twitch.clientId");
    this.db.deleteSetting("twitch.clientSecret");
    this.db.deleteSetting("twitch.oauth");
    this.logger.info("Twitch settings cleared from database");
  }

  /**
   * Save Twitch Client Secret
   */
  saveTwitchClientSecret(secret: string | null): void {
    if (secret) {
      this.db.setSetting("twitch.clientSecret", secret);
    } else {
      this.db.deleteSetting("twitch.clientSecret");
    }
    this.logger.info("Twitch client secret saved");
  }

  /**
   * Get Twitch Client Secret
   */
  getTwitchClientSecret(): string | null {
    return this.db.getSetting("twitch.clientSecret");
  }

  /**
   * Check if Twitch credentials are fully configured
   */
  hasTwitchCredentials(): boolean {
    const settings = this.getTwitchSettings();
    const clientSecret = this.getTwitchClientSecret();
    return !!(settings.clientId && clientSecret);
  }

  /**
   * Save pending OAuth state (for PKCE flow)
   */
  saveTwitchOAuthState(state: { state: string; codeVerifier: string; createdAt: number; returnUrl?: string } | null): void {
    if (state) {
      this.db.setSetting("twitch.pendingOAuth", JSON.stringify(state));
    } else {
      this.db.deleteSetting("twitch.pendingOAuth");
    }
  }

  /**
   * Get pending OAuth state
   */
  getTwitchOAuthState(): { state: string; codeVerifier: string; createdAt: number; returnUrl?: string } | null {
    const json = this.db.getSetting("twitch.pendingOAuth");
    if (!json) return null;

    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  // =========================================================================
  // PRESENTER CHANNEL SETTINGS
  // =========================================================================

  /**
   * Get presenter channel settings
   */
  getPresenterChannelSettings(): PresenterChannelSettings {
    const vdoNinjaUrl = this.db.getSetting("presenter.channel.vdoNinjaUrl");
    const quickRepliesJson = this.db.getSetting("presenter.channel.quickReplies");
    const canSendCustomMessages = this.db.getSetting("presenter.channel.canSendCustomMessages");
    const allowPresenterToSendMessage = this.db.getSetting("presenter.channel.allowPresenterToSendMessage");

    let quickReplies: string[] = DEFAULT_QUICK_REPLIES;
    if (quickRepliesJson) {
      try {
        quickReplies = JSON.parse(quickRepliesJson);
      } catch {
        this.logger.warn("Failed to parse presenter channel quick replies");
      }
    }

    return {
      vdoNinjaUrl: vdoNinjaUrl || undefined,
      quickReplies,
      canSendCustomMessages: canSendCustomMessages !== null
        ? canSendCustomMessages === "true"
        : true,
      allowPresenterToSendMessage: allowPresenterToSendMessage !== null
        ? allowPresenterToSendMessage === "true"
        : true,
    };
  }

  /**
   * Save presenter channel settings to database
   */
  savePresenterChannelSettings(settings: Partial<PresenterChannelSettings>): void {
    if (settings.vdoNinjaUrl !== undefined) {
      if (settings.vdoNinjaUrl) {
        this.db.setSetting("presenter.channel.vdoNinjaUrl", settings.vdoNinjaUrl);
      } else {
        this.db.deleteSetting("presenter.channel.vdoNinjaUrl");
      }
    }

    if (settings.quickReplies !== undefined) {
      this.db.setSetting("presenter.channel.quickReplies", JSON.stringify(settings.quickReplies));
    }

    if (settings.canSendCustomMessages !== undefined) {
      this.db.setSetting("presenter.channel.canSendCustomMessages", settings.canSendCustomMessages.toString());
    }

    if (settings.allowPresenterToSendMessage !== undefined) {
      this.db.setSetting("presenter.channel.allowPresenterToSendMessage", settings.allowPresenterToSendMessage.toString());
    }

    this.logger.info("Presenter channel settings saved to database");
  }

  /**
   * Clear presenter channel settings from database
   */
  clearPresenterChannelSettings(): void {
    this.db.deleteSetting("presenter.channel.vdoNinjaUrl");
    this.db.deleteSetting("presenter.channel.quickReplies");
    this.db.deleteSetting("presenter.channel.canSendCustomMessages");
    this.db.deleteSetting("presenter.channel.allowPresenterToSendMessage");
    this.logger.info("Presenter channel settings cleared from database");
  }

  // =========================================================================
  // CHAT PREDEFINED MESSAGES
  // =========================================================================

  /**
   * Get predefined chat messages
   */
  getChatPredefinedMessages(): ChatPredefinedMessage[] {
    const messagesJson = this.db.getSetting("chat.predefinedMessages");
    if (messagesJson) {
      try {
        const data = JSON.parse(messagesJson);
        // Migration: convert old string[] format to new object format
        if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
          return (data as string[]).map(msg => ({
            title: msg.length > 30 ? msg.slice(0, 30) + '...' : msg,
            message: msg
          }));
        }
        return data as ChatPredefinedMessage[];
      } catch {
        this.logger.warn("Failed to parse chat predefined messages");
      }
    }
    return [];
  }

  /**
   * Save predefined chat messages
   */
  saveChatPredefinedMessages(messages: ChatPredefinedMessage[]): void {
    this.db.setSetting("chat.predefinedMessages", JSON.stringify(messages));
    this.logger.info("Chat predefined messages saved to database");
  }
}

