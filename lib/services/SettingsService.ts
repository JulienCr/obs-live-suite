import { DatabaseService } from "./DatabaseService";
import { Logger } from "../utils/Logger";
import { StreamerbotConnectionSettings, DEFAULT_STREAMERBOT_CONNECTION } from "../models/StreamerbotChat";
import { AppConfig } from "../config/AppConfig";

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
}

