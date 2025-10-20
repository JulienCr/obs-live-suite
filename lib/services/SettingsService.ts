import { DatabaseService } from "./DatabaseService";
import { Logger } from "../utils/Logger";

/**
 * OBS settings interface
 */
export interface OBSSettings {
  url: string;
  password?: string;
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

    // Fallback to environment variables
    const url = dbUrl || process.env.OBS_WEBSOCKET_URL || "ws://localhost:4455";
    const password = dbPassword || process.env.OBS_WEBSOCKET_PASSWORD || undefined;

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
}

