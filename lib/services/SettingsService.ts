import { randomUUID } from "crypto";
import { z } from "zod";
import { SettingsRepository } from "../repositories/SettingsRepository";
import { Logger } from "../utils/Logger";
import { SettingsStore } from "./SettingsStore";
import { streamerbotConnectionSchema } from "../models/streamerbot/schemas";
import { AppConfig } from "../config/AppConfig";
import { TwitchSettingsSchema } from "../models/Twitch";
import { presenterChannelSettingsSchema } from "../models/PresenterChannel";
import type { TwitchSettings, TwitchOAuthTokens } from "../models/Twitch";
import type { PresenterChannelSettings } from "../models/PresenterChannel";
import type { ChatPredefinedMessage } from "../models/ChatMessages";

// ============================================================================
// SETTINGS SCHEMAS
// ============================================================================

/**
 * OBS WebSocket settings schema
 */
export const OBSSettingsSchema = z.object({
  url: z.string().default("ws://127.0.0.1:4455"),
  password: z.string().optional(),
});

export type OBSSettings = z.infer<typeof OBSSettingsSchema>;

/**
 * Streamerbot settings schema (extends connection settings with autoConnect)
 */
export const StreamerbotSettingsSchema = streamerbotConnectionSchema.extend({
  autoConnect: z.boolean().default(false),
});

export type StreamerbotSettings = z.infer<typeof StreamerbotSettingsSchema>;

/**
 * Overlay settings schema
 */
export const OverlaySettingsSchema = z.object({
  lowerThirdDuration: z.number().default(8),
  chatHighlightDuration: z.number().default(10),
  chatHighlightAutoHide: z.boolean().default(true),
});

export type OverlaySettings = z.infer<typeof OverlaySettingsSchema>;

/**
 * Default overlay settings
 */
export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = {
  lowerThirdDuration: 8,
  chatHighlightDuration: 10,
  chatHighlightAutoHide: true,
};

/**
 * Chat message settings schema
 */
export const ChatMessageSettingsSchema = z.object({
  posterChatMessageEnabled: z.boolean().default(false),
  guestChatMessageEnabled: z.boolean().default(false),
});

export type ChatMessageSettings = z.infer<typeof ChatMessageSettingsSchema>;

/**
 * Default chat message settings
 */
export const DEFAULT_CHAT_MESSAGE_SETTINGS: ChatMessageSettings = {
  posterChatMessageEnabled: false,
  guestChatMessageEnabled: false,
};

/**
 * General UI settings schema
 */
export const GeneralSettingsSchema = z.object({
  defaultPosterDisplayMode: z.string().default("left"),
});

export type GeneralSettings = z.infer<typeof GeneralSettingsSchema>;

// ============================================================================
// SETTINGS SERVICE
// ============================================================================

/**
 * SettingsService manages application settings with fallback to environment variables
 * using typed SettingsStore instances for each settings group.
 */
export class SettingsService {
  private static instance: SettingsService;
  private db: SettingsRepository;
  private logger: Logger;

  // Settings stores for each group
  private obsStore: SettingsStore<typeof OBSSettingsSchema.shape>;
  private streamerbotStore: SettingsStore<typeof StreamerbotSettingsSchema.shape>;
  private overlayStore: SettingsStore<typeof OverlaySettingsSchema.shape>;
  private chatMessageStore: SettingsStore<typeof ChatMessageSettingsSchema.shape>;
  private generalStore: SettingsStore<typeof GeneralSettingsSchema.shape>;
  private twitchStore: SettingsStore<typeof TwitchSettingsSchema.shape>;
  private presenterChannelStore: SettingsStore<typeof presenterChannelSettingsSchema.shape>;

  private constructor() {
    this.db = SettingsRepository.getInstance();
    this.logger = new Logger("SettingsService");

    // Initialize OBS settings store with environment variable fallback
    const config = AppConfig.getInstance();
    this.obsStore = new SettingsStore(
      this.db,
      "obs",
      OBSSettingsSchema,
      this.logger,
      {
        keyMapping: {
          url: "websocket.url",
          password: "websocket.password",
        },
        fallbackProvider: (key) => {
          if (key === "url") return config.obsWebSocketUrl;
          if (key === "password") return config.obsWebSocketPassword;
          return undefined;
        },
      }
    );

    // Initialize Streamerbot settings store
    this.streamerbotStore = new SettingsStore(
      this.db,
      "streamerbot",
      StreamerbotSettingsSchema,
      this.logger
    );

    // Initialize Overlay settings store
    this.overlayStore = new SettingsStore(
      this.db,
      "overlay",
      OverlaySettingsSchema,
      this.logger,
      {
        keyMapping: {
          lowerThirdDuration: "lowerThird.defaultDuration",
          chatHighlightDuration: "chatHighlight.defaultDuration",
          chatHighlightAutoHide: "chatHighlight.autoHideEnabled",
        },
      }
    );

    // Initialize Chat Message settings store
    this.chatMessageStore = new SettingsStore(
      this.db,
      "chatMessage",
      ChatMessageSettingsSchema,
      this.logger,
      {
        keyMapping: {
          posterChatMessageEnabled: "poster.enabled",
          guestChatMessageEnabled: "guest.enabled",
        },
      }
    );

    // Initialize General settings store
    this.generalStore = new SettingsStore(
      this.db,
      "ui",
      GeneralSettingsSchema,
      this.logger,
      {
        keyMapping: {
          defaultPosterDisplayMode: "poster.defaultDisplayMode",
        },
      }
    );

    // Initialize Twitch settings store
    this.twitchStore = new SettingsStore(
      this.db,
      "twitch",
      TwitchSettingsSchema,
      this.logger
    );

    // Initialize Presenter Channel settings store
    this.presenterChannelStore = new SettingsStore(
      this.db,
      "presenter.channel",
      presenterChannelSettingsSchema,
      this.logger
    );
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

  // =========================================================================
  // OBS SETTINGS
  // =========================================================================

  /**
   * Get OBS WebSocket settings
   * Priority: Database > Environment Variables
   */
  getOBSSettings(): OBSSettings {
    const settings = this.obsStore.get();
    const hasDbUrl = this.obsStore.has("url");
    const hasDbPassword = this.obsStore.has("password");

    this.logger.debug(
      `OBS settings loaded: URL from ${hasDbUrl ? "database" : "environment"}, ` +
      `Password from ${hasDbPassword ? "database" : "environment"}`
    );

    return settings;
  }

  /**
   * Save OBS WebSocket settings to database
   */
  saveOBSSettings(settings: OBSSettings): void {
    this.obsStore.set({
      url: settings.url,
      // Only set password if provided, otherwise clear it
      password: settings.password || undefined,
    });

    // If password is explicitly empty, clear it from database
    if (!settings.password) {
      const dbKey = "obs.websocket.password";
      this.db.deleteSetting(dbKey);
    }

    this.logger.info("OBS settings saved to database");
  }

  /**
   * Clear OBS settings from database (will fallback to environment variables)
   */
  clearOBSSettings(): void {
    this.obsStore.clear();
  }

  /**
   * Check if OBS settings are defined in database
   */
  hasOBSSettingsInDatabase(): boolean {
    return this.obsStore.has("url");
  }

  // =========================================================================
  // GENERAL SETTINGS
  // =========================================================================

  /**
   * Get general UI settings
   */
  getGeneralSettings(): GeneralSettings {
    return this.generalStore.get();
  }

  /**
   * Save general UI settings
   */
  saveGeneralSettings(settings: Partial<GeneralSettings>): void {
    this.generalStore.set(settings);
    this.logger.info("General settings saved to database");
  }

  // =========================================================================
  // STREAMERBOT SETTINGS
  // =========================================================================

  /**
   * Get Streamerbot connection settings
   * Priority: Database > Defaults
   */
  getStreamerbotSettings(): StreamerbotSettings {
    const settings = this.streamerbotStore.get();

    this.logger.debug(
      `Streamerbot settings loaded: ${settings.scheme}://${settings.host}:${settings.port}${settings.endpoint}, autoConnect: ${settings.autoConnect}`
    );

    return settings;
  }

  /**
   * Save Streamerbot connection settings to database
   */
  saveStreamerbotSettings(settings: Partial<StreamerbotSettings>): void {
    // Handle password specially - empty string means clear
    const toSave = { ...settings };
    if (settings.password === "") {
      toSave.password = undefined;
    }
    this.streamerbotStore.set(toSave);
  }

  /**
   * Enable/disable auto-connect for Streamerbot gateway
   */
  setStreamerbotAutoConnect(enabled: boolean): void {
    this.streamerbotStore.setField("autoConnect", enabled);
    this.logger.info(`Streamerbot autoConnect ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Check if Streamerbot auto-connect is enabled
   */
  isStreamerbotAutoConnectEnabled(): boolean {
    return this.streamerbotStore.getField("autoConnect");
  }

  /**
   * Clear Streamerbot settings from database
   */
  clearStreamerbotSettings(): void {
    this.streamerbotStore.clear();
  }

  // =========================================================================
  // OVERLAY SETTINGS
  // =========================================================================

  /**
   * Get overlay settings
   */
  getOverlaySettings(): OverlaySettings {
    return this.overlayStore.get();
  }

  /**
   * Save overlay settings to database
   */
  saveOverlaySettings(settings: Partial<OverlaySettings>): void {
    this.overlayStore.set(settings);
    this.logger.info("Overlay settings saved to database");
  }

  // =========================================================================
  // CHAT MESSAGE SETTINGS
  // =========================================================================

  /**
   * Get chat message settings
   */
  getChatMessageSettings(): ChatMessageSettings {
    return this.chatMessageStore.get();
  }

  /**
   * Save chat message settings to database
   */
  saveChatMessageSettings(settings: Partial<ChatMessageSettings>): void {
    this.chatMessageStore.set(settings);
    this.logger.info("Chat message settings saved to database");
  }

  // =========================================================================
  // TWITCH SETTINGS
  // =========================================================================

  /**
   * Get Twitch integration settings
   */
  getTwitchSettings(): TwitchSettings {
    return this.twitchStore.get();
  }

  /**
   * Save Twitch integration settings to database
   */
  saveTwitchSettings(settings: Partial<TwitchSettings>): void {
    // Handle clientId specially - undefined means clear
    const toSave = { ...settings };
    if (settings.clientId === "") {
      toSave.clientId = undefined;
    }
    this.twitchStore.set(toSave);
    this.logger.info("Twitch settings saved to database");
  }

  /**
   * Save Twitch OAuth tokens
   */
  saveTwitchOAuthTokens(tokens: TwitchOAuthTokens | null): void {
    this.twitchStore.setField("oauth", tokens);
    this.logger.info("Twitch OAuth tokens saved");
  }

  /**
   * Get Twitch OAuth tokens
   */
  getTwitchOAuthTokens(): TwitchOAuthTokens | null {
    const oauth = this.twitchStore.getField("oauth");
    return oauth ?? null;
  }

  /**
   * Check if Twitch integration is enabled
   */
  isTwitchEnabled(): boolean {
    return this.twitchStore.getField("enabled");
  }

  /**
   * Clear all Twitch settings
   */
  clearTwitchSettings(): void {
    this.twitchStore.clear();
    // Also clear additional Twitch keys not in the schema
    this.db.deleteSetting("twitch.clientSecret");
    this.db.deleteSetting("twitch.pendingOAuth");
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
    return this.presenterChannelStore.get();
  }

  /**
   * Save presenter channel settings to database
   */
  savePresenterChannelSettings(settings: Partial<PresenterChannelSettings>): void {
    // Handle vdoNinjaUrl specially - empty string means clear
    const toSave = { ...settings };
    if (settings.vdoNinjaUrl === "") {
      toSave.vdoNinjaUrl = undefined;
    }
    this.presenterChannelStore.set(toSave);
    this.logger.info("Presenter channel settings saved to database");
  }

  /**
   * Clear presenter channel settings from database
   */
  clearPresenterChannelSettings(): void {
    this.presenterChannelStore.clear();
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
          const convertedMessages = (data as string[])
            .filter(msg => typeof msg === 'string' && msg.trim().length > 0)
            .map(msg => ({
              id: randomUUID(),
              title: msg.length > 30 ? msg.slice(0, 30) + '...' : msg,
              message: msg
            }));
          // Persist the migrated format to the database
          this.saveChatPredefinedMessages(convertedMessages);
          this.logger.info("Migrated chat predefined messages from string[] to object format");
          return convertedMessages;
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
