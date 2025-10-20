import { OBSConnectionManager } from "./OBSConnectionManager";
import { Logger } from "../../utils/Logger";

/**
 * OBSSceneController manages scene items and DSK layer
 */
export class OBSSceneController {
  private static instance: OBSSceneController;
  private connectionManager: OBSConnectionManager;
  private logger: Logger;

  private constructor() {
    this.connectionManager = OBSConnectionManager.getInstance();
    this.logger = new Logger("OBSSceneController");
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): OBSSceneController {
    if (!OBSSceneController.instance) {
      OBSSceneController.instance = new OBSSceneController();
    }
    return OBSSceneController.instance;
  }

  /**
   * Get scene item ID by name
   */
  async getSceneItemId(sceneName: string, sourceName: string): Promise<number> {
    const obs = this.connectionManager.getOBS();

    try {
      const result = await obs.call("GetSceneItemId", {
        sceneName,
        sourceName,
      });
      return result.sceneItemId;
    } catch (error) {
      this.logger.error(`Failed to get scene item ID for ${sourceName}`, error);
      throw error;
    }
  }

  /**
   * Toggle scene item visibility
   */
  async toggleSceneItemVisibility(
    sceneName: string,
    sourceName: string,
    visible: boolean
  ): Promise<void> {
    const obs = this.connectionManager.getOBS();

    try {
      const itemId = await this.getSceneItemId(sceneName, sourceName);

      await obs.call("SetSceneItemEnabled", {
        sceneName,
        sceneItemId: itemId,
        sceneItemEnabled: visible,
      });

      this.logger.info(`Scene item ${sourceName} visibility: ${visible}`);
    } catch (error) {
      this.logger.error(`Failed to toggle visibility for ${sourceName}`, error);
      throw error;
    }
  }

  /**
   * Check if scene item exists
   */
  async sceneItemExists(sceneName: string, sourceName: string): Promise<boolean> {
    try {
      await this.getSceneItemId(sceneName, sourceName);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all scenes
   */
  async getScenes(): Promise<string[]> {
    const obs = this.connectionManager.getOBS();

    try {
      const result = await obs.call("GetSceneList");
      return result.scenes.map((scene) => scene.sceneName);
    } catch (error) {
      this.logger.error("Failed to get scenes", error);
      throw error;
    }
  }

  /**
   * Switch to a scene
   */
  async switchScene(sceneName: string): Promise<void> {
    const obs = this.connectionManager.getOBS();

    try {
      await obs.call("SetCurrentProgramScene", { sceneName });
      this.logger.info(`Switched to scene: ${sceneName}`);
    } catch (error) {
      this.logger.error(`Failed to switch to scene ${sceneName}`, error);
      throw error;
    }
  }

  /**
   * Get current scene name
   */
  async getCurrentScene(): Promise<string> {
    const obs = this.connectionManager.getOBS();

    try {
      const result = await obs.call("GetCurrentProgramScene");
      return result.currentProgramSceneName;
    } catch (error) {
      this.logger.error("Failed to get current scene", error);
      throw error;
    }
  }

  /**
   * Create a group (for DSK layer)
   */
  async createGroup(sceneName: string, groupName: string): Promise<void> {
    const obs = this.connectionManager.getOBS();

    try {
      await obs.call("CreateSceneItem", {
        sceneName,
        sourceName: groupName,
      });
      this.logger.info(`Created group: ${groupName}`);
    } catch (error) {
      this.logger.error(`Failed to create group ${groupName}`, error);
      throw error;
    }
  }
}

