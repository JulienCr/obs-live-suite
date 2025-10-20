import { WebSocketHub } from "../services/WebSocketHub";
import { OBSConnectionManager } from "../adapters/obs/OBSConnectionManager";
import { OBSStateManager } from "../adapters/obs/OBSStateManager";
import { DatabaseService } from "../services/DatabaseService";
import { Logger } from "../utils/Logger";

/**
 * ServerInit handles server-side initialization
 */
export class ServerInit {
  private static instance: ServerInit;
  private static initialized = false;
  private logger: Logger;

  private constructor() {
    this.logger = new Logger("ServerInit");
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ServerInit {
    if (!ServerInit.instance) {
      ServerInit.instance = new ServerInit();
    }
    return ServerInit.instance;
  }

  /**
   * Initialize all server services
   */
  async initialize(): Promise<void> {
    if (ServerInit.initialized) {
      this.logger.info("Server already initialized");
      return;
    }

    this.logger.info("Initializing server services...");

    try {
      // Initialize database
      DatabaseService.getInstance();
      this.logger.info("✓ Database initialized");

      // Start WebSocket hub
      WebSocketHub.getInstance().start();
      this.logger.info("✓ WebSocket hub started");

      // Connect to OBS (don't wait, allow retries)
      this.initializeOBS();
      this.logger.info("✓ OBS connection initiated");

      ServerInit.initialized = true;
      this.logger.info("Server initialization complete");
    } catch (error) {
      this.logger.error("Server initialization failed", error);
      throw error;
    }
  }

  /**
   * Initialize OBS connection (async, allows retries)
   */
  private async initializeOBS(): Promise<void> {
    try {
      const connectionManager = OBSConnectionManager.getInstance();
      const stateManager = OBSStateManager.getInstance();

      await connectionManager.connect();
      await stateManager.refreshState();

      this.logger.info("✓ Connected to OBS");
    } catch (error) {
      this.logger.warn("Failed to connect to OBS (will retry)", error);
      // Don't throw - allow app to start without OBS
    }
  }

  /**
   * Shutdown server services
   */
  async shutdown(): Promise<void> {
    this.logger.info("Shutting down server services...");

    try {
      const wsHub = WebSocketHub.getInstance();
      wsHub.stop();

      const obsConnection = OBSConnectionManager.getInstance();
      await obsConnection.disconnect();

      const db = DatabaseService.getInstance();
      db.close();

      this.logger.info("Server shutdown complete");
    } catch (error) {
      this.logger.error("Shutdown error", error);
    }
  }

  /**
   * Check if server is initialized
   */
  static isInitialized(): boolean {
    return ServerInit.initialized;
  }
}

