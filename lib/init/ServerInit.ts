import { WebSocketHub } from "../services/WebSocketHub";
import { OBSConnectionManager } from "../adapters/obs/OBSConnectionManager";
import { OBSStateManager } from "../adapters/obs/OBSStateManager";
import { DatabaseService } from "../services/DatabaseService";
import { ThemeService } from "../services/ThemeService";

import { WorkspaceService } from "../services/WorkspaceService";
import { Logger } from "../utils/Logger";
import { PathManager } from "../config/PathManager";

/**
 * ServerInit handles server-side initialization
 */
export class ServerInit {
  private static instance: ServerInit;
  private static initialized = false;
  private logger: Logger;

  private constructor() {
    // Initialize Logger file path first (before creating any loggers)
    const pathManager = PathManager.getInstance();
    Logger.setLogFilePath(pathManager.getLogFilePath());
    
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
   * Starts WebSocket server, database, and OBS connection
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

      // Initialize default themes
      const themeService = ThemeService.getInstance();
      await themeService.initializeDefaultThemes();
      this.logger.info("✓ Default themes initialized");

      // Note: Room system was removed - presenter now uses a single channel
      // See ChannelManager for the presenter channel configuration

      // Initialize built-in workspaces
      const workspaceService = WorkspaceService.getInstance();
      workspaceService.initializeBuiltInWorkspaces();
      this.logger.info("✓ Built-in workspaces initialized");

      // Initialize WebSocket Hub
      const wsHub = WebSocketHub.getInstance();
      if (!wsHub.isRunning()) {
        wsHub.start();
        this.logger.info("✓ WebSocket hub started");
      } else {
        this.logger.info("✓ WebSocket hub already running");
      }

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

