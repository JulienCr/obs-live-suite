import OBSWebSocket from "obs-websocket-js";
import { SettingsService } from "../../services/SettingsService";
import {
  ConnectionManager,
  ConnectionStatus,
  ConnectionError,
} from "../../utils/ConnectionManager";

// Re-export ConnectionStatus for backwards compatibility
export { ConnectionStatus } from "../../utils/ConnectionManager";

/**
 * OBSConnectionManager handles connection lifecycle and reconnection
 * Extends ConnectionManager for standardized reconnection logic.
 */
export class OBSConnectionManager extends ConnectionManager {
  private static instance: OBSConnectionManager;
  private obs: OBSWebSocket;
  private settingsService: SettingsService;
  private pendingCredentials?: { url: string; password?: string };

  private constructor() {
    super({ loggerName: "OBSConnectionManager" });
    this.obs = new OBSWebSocket();
    this.settingsService = SettingsService.getInstance();
    this.setupEventListeners();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): OBSConnectionManager {
    if (!OBSConnectionManager.instance) {
      OBSConnectionManager.instance = new OBSConnectionManager();
    }
    return OBSConnectionManager.instance;
  }

  /**
   * Setup OBS event listeners
   */
  private setupEventListeners(): void {
    this.obs.on("ConnectionClosed", () => {
      this.handleConnectionClosed();
    });

    this.obs.on("ConnectionError", (error) => {
      this.handleConnectionError({
        type: "OBS_CONNECTION_ERROR",
        message: error?.message || "OBS connection error",
        originalError: error,
      });
    });
  }

  /**
   * Check if auto-reconnect is enabled in settings.
   */
  protected override shouldAutoReconnect(): boolean {
    return this.settingsService.getOBSSettings().autoReconnect;
  }

  /**
   * Connect to OBS WebSocket using stored settings
   */
  override async connect(): Promise<void> {
    const settings = this.settingsService.getOBSSettings();
    this.pendingCredentials = { url: settings.url, password: settings.password };
    return super.connect();
  }

  /**
   * Connect to OBS WebSocket with specific credentials
   * Useful for testing connection before saving
   */
  async connectWithCredentials(url: string, password?: string): Promise<void> {
    this.pendingCredentials = { url, password };
    return super.connect();
  }

  /**
   * Implementation-specific connection logic
   */
  protected async doConnect(): Promise<void> {
    const { url, password } = this.pendingCredentials || this.settingsService.getOBSSettings();
    this.logger.info(`Connecting to OBS at ${url}...`);

    await this.obs.connect(url, password);

    const version = await this.obs.call("GetVersion");
    this.logger.info(`OBS Version: ${version.obsVersion}`);
  }

  /**
   * Implementation-specific disconnection logic
   */
  protected async doDisconnect(): Promise<void> {
    await this.obs.disconnect();
  }

  /**
   * Called when connection is successfully established
   */
  protected override onConnected(): void {
    super.onConnected();
    this.pendingCredentials = undefined;
  }

  /**
   * Called when connection is closed
   */
  protected override onDisconnected(): void {
    this.logger.warn("OBS connection closed");
  }

  /**
   * Called when connection error occurs
   */
  protected override onError(error: ConnectionError): void {
    this.logger.error("OBS connection error", error.originalError);
  }

  /**
   * Get OBS WebSocket instance
   */
  getOBS(): OBSWebSocket {
    return this.obs;
  }
}
