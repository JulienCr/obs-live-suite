import { OBSConnectionManager } from "./OBSConnectionManager";
import { OBSStateManager } from "./OBSStateManager";
import { Logger } from "../../utils/Logger";

/**
 * Ensures OBS connection is established (handles dev mode process isolation)
 */
export class OBSConnectionEnsurer {
  private static ensuring = false;
  private static logger = new Logger("OBSConnectionEnsurer");

  /**
   * Ensure OBS is connected, connect if not
   */
  static async ensureConnected(): Promise<void> {
    const manager = OBSConnectionManager.getInstance();
    
    // Already connected
    if (manager.isConnected()) {
      return;
    }

    // Already trying to connect
    if (this.ensuring) {
      this.logger.info("Connection attempt already in progress");
      return;
    }

    try {
      this.ensuring = true;
      this.logger.info("Ensuring OBS connection...");
      
      await manager.connect();
      
      const stateManager = OBSStateManager.getInstance();
      await stateManager.refreshState();
      
      this.logger.info("OBS connection ensured successfully");
    } catch (error) {
      this.logger.error("Failed to ensure OBS connection", error);
      throw error;
    } finally {
      this.ensuring = false;
    }
  }
}

