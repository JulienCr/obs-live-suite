import { OBSSceneController } from "../adapters/obs/OBSSceneController";
import { OBSConnectionManager } from "../adapters/obs/OBSConnectionManager";
import { Logger } from "../utils/Logger";

/**
 * DSKService manages the global DSK (Downstream Keyer) layer for overlays
 */
export class DSKService {
  private static instance: DSKService;
  private sceneController: OBSSceneController;
  private connectionManager: OBSConnectionManager;
  private logger: Logger;
  private dskSourceName: string;

  private constructor() {
    this.sceneController = OBSSceneController.getInstance();
    this.connectionManager = OBSConnectionManager.getInstance();
    this.logger = new Logger("DSKService");
    this.dskSourceName = "Habillage";
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): DSKService {
    if (!DSKService.instance) {
      DSKService.instance = new DSKService();
    }
    return DSKService.instance;
  }

  /**
   * Set DSK source name
   */
  setDSKSourceName(name: string): void {
    this.dskSourceName = name;
    this.logger.info(`DSK source name set to: ${name}`);
  }

  /**
   * Get DSK source name
   */
  getDSKSourceName(): string {
    return this.dskSourceName;
  }

  /**
   * Check if DSK layer exists in current scene
   */
  async dskExists(): Promise<boolean> {
    try {
      const currentScene = await this.sceneController.getCurrentScene();
      return await this.sceneController.sceneItemExists(currentScene, this.dskSourceName);
    } catch (error) {
      this.logger.error("Failed to check DSK existence", error);
      return false;
    }
  }

  /**
   * Toggle DSK layer visibility
   */
  async toggleDSK(visible: boolean): Promise<void> {
    try {
      const currentScene = await this.sceneController.getCurrentScene();
      const exists = await this.sceneController.sceneItemExists(
        currentScene,
        this.dskSourceName
      );

      if (!exists) {
        this.logger.warn(`DSK source "${this.dskSourceName}" not found in scene`);
        throw new Error("DSK layer not found");
      }

      await this.sceneController.toggleSceneItemVisibility(
        currentScene,
        this.dskSourceName,
        visible
      );

      this.logger.info(`DSK layer ${visible ? "shown" : "hidden"}`);
    } catch (error) {
      this.logger.error("Failed to toggle DSK", error);
      throw error;
    }
  }

  /**
   * Show DSK layer
   */
  async showDSK(): Promise<void> {
    await this.toggleDSK(true);
  }

  /**
   * Hide DSK layer
   */
  async hideDSK(): Promise<void> {
    await this.toggleDSK(false);
  }

  /**
   * Auto-create DSK layer in all scenes
   */
  async autoCreateDSK(): Promise<void> {
    try {
      const scenes = await this.sceneController.getScenes();

      for (const sceneName of scenes) {
        const exists = await this.sceneController.sceneItemExists(
          sceneName,
          this.dskSourceName
        );

        if (!exists) {
          await this.sceneController.createGroup(sceneName, this.dskSourceName);
          this.logger.info(`Created DSK layer in scene: ${sceneName}`);
        }
      }

      this.logger.info("DSK layer auto-creation completed");
    } catch (error) {
      this.logger.error("Failed to auto-create DSK", error);
      throw error;
    }
  }
}

