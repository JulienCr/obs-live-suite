import { OBSConnectionManager } from "./OBSConnectionManager";
import { Logger } from "../../utils/Logger";

/**
 * OBSSourceController manages OBS sources (text, browser)
 */
export class OBSSourceController {
  private static instance: OBSSourceController;
  private connectionManager: OBSConnectionManager;
  private logger: Logger;

  private constructor() {
    this.connectionManager = OBSConnectionManager.getInstance();
    this.logger = new Logger("OBSSourceController");
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): OBSSourceController {
    if (!OBSSourceController.instance) {
      OBSSourceController.instance = new OBSSourceController();
    }
    return OBSSourceController.instance;
  }

  /**
   * Update text source content
   */
  async updateTextSource(sourceName: string, text: string): Promise<void> {
    const obs = this.connectionManager.getOBS();

    try {
      await obs.call("SetInputSettings", {
        inputName: sourceName,
        inputSettings: { text },
      });

      this.logger.info(`Updated text source: ${sourceName}`);
    } catch (error) {
      this.logger.error(`Failed to update text source ${sourceName}`, error);
      throw error;
    }
  }

  /**
   * Update browser source URL
   */
  async updateBrowserSource(sourceName: string, url: string): Promise<void> {
    const obs = this.connectionManager.getOBS();

    try {
      await obs.call("SetInputSettings", {
        inputName: sourceName,
        inputSettings: { url },
      });

      this.logger.info(`Updated browser source: ${sourceName}`);
    } catch (error) {
      this.logger.error(`Failed to update browser source ${sourceName}`, error);
      throw error;
    }
  }

  /**
   * Refresh browser source
   */
  async refreshBrowserSource(sourceName: string): Promise<void> {
    const obs = this.connectionManager.getOBS();

    try {
      await obs.call("PressInputPropertiesButton", {
        inputName: sourceName,
        propertyName: "refreshnocache",
      });

      this.logger.info(`Refreshed browser source: ${sourceName}`);
    } catch (error) {
      this.logger.error(`Failed to refresh browser source ${sourceName}`, error);
      throw error;
    }
  }

  /**
   * Check if source exists
   */
  async sourceExists(sourceName: string): Promise<boolean> {
    const obs = this.connectionManager.getOBS();

    try {
      await obs.call("GetInputSettings", { inputName: sourceName });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get source settings
   */
  async getSourceSettings(sourceName: string): Promise<Record<string, unknown>> {
    const obs = this.connectionManager.getOBS();

    try {
      const result = await obs.call("GetInputSettings", { inputName: sourceName });
      return result.inputSettings;
    } catch (error) {
      this.logger.error(`Failed to get settings for ${sourceName}`, error);
      throw error;
    }
  }

  /**
   * Update source settings
   */
  async updateSourceSettings(
    sourceName: string,
    settings: Record<string, unknown>
  ): Promise<void> {
    const obs = this.connectionManager.getOBS();

    try {
      await obs.call("SetInputSettings", {
        inputName: sourceName,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputSettings: settings as Record<string, any>,
      });

      this.logger.info(`Updated settings for: ${sourceName}`);
    } catch (error) {
      this.logger.error(`Failed to update settings for ${sourceName}`, error);
      throw error;
    }
  }
}

