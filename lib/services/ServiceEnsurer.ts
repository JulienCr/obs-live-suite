import { WebSocketHub } from "./WebSocketHub";
import { OBSConnectionManager } from "../adapters/obs/OBSConnectionManager";
import { OBSStateManager } from "../adapters/obs/OBSStateManager";
import { DatabaseService } from "./DatabaseService";
import { Logger } from "../utils/Logger";
import { RECONNECTION } from "../config/Constants";

/**
 * ServiceEnsurer ensures all services are running in the current process
 * Handles Next.js dev mode process isolation
 */
export class ServiceEnsurer {
  private static initialized = false;
  private static initializing = false;
  private static logger = new Logger("ServiceEnsurer");

  /**
   * Ensure all services are initialized in current process
   */
  static async ensureServices(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializing) {
      // Wait for initialization to complete
      await new Promise((resolve) => {
        const check = setInterval(() => {
          if (this.initialized) {
            clearInterval(check);
            resolve(undefined);
          }
        }, RECONNECTION.POLL_INTERVAL_MS);
      });
      return;
    }

    this.initializing = true;

    try {
      this.logger.info("Ensuring services are initialized...");

      // 1. Database
      DatabaseService.getInstance();
      this.logger.info("✓ Database ready");

      // 2. WebSocket Hub
      const wsHub = WebSocketHub.getInstance();
      if (!wsHub.isRunning() && !wsHub.wasAttempted()) {
        wsHub.start();
        // Wait a bit to see if it started successfully
        await new Promise(resolve => setTimeout(resolve, RECONNECTION.POLL_INTERVAL_MS));
        if (wsHub.isRunning()) {
          this.logger.info("✓ WebSocket hub started");
        } else {
          this.logger.info("✓ WebSocket hub (running in another process)");
        }
      } else {
        this.logger.info("✓ WebSocket hub already available");
      }

      // 3. OBS Connection
      const obsManager = OBSConnectionManager.getInstance();
      if (!obsManager.isConnected()) {
        try {
          await obsManager.connect();
          const stateManager = OBSStateManager.getInstance();
          await stateManager.refreshState();
          this.logger.info("✓ OBS connected");
        } catch (error) {
          this.logger.warn("OBS connection failed (will retry)", error);
        }
      } else {
        this.logger.info("✓ OBS already connected");
      }

      this.initialized = true;
      this.logger.info("✓ All services ensured");
    } catch (error) {
      this.logger.error("Failed to ensure services", error);
      throw error;
    } finally {
      this.initializing = false;
    }
  }
}

