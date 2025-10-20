import { Macro, MacroActionType } from "../models/Macro";
import { ChannelManager } from "./ChannelManager";
import { OBSSceneController } from "../adapters/obs/OBSSceneController";
import { Logger } from "../utils/Logger";
import { LowerThirdEventType, CountdownEventType, PosterEventType } from "../models/OverlayEvents";

/**
 * MacroEngine executes macro action sequences
 */
export class MacroEngine {
  private static instance: MacroEngine;
  private channelManager: ChannelManager;
  private sceneController: OBSSceneController;
  private logger: Logger;
  private isExecuting: boolean;

  private constructor() {
    this.channelManager = ChannelManager.getInstance();
    this.sceneController = OBSSceneController.getInstance();
    this.logger = new Logger("MacroEngine");
    this.isExecuting = false;
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): MacroEngine {
    if (!MacroEngine.instance) {
      MacroEngine.instance = new MacroEngine();
    }
    return MacroEngine.instance;
  }

  /**
   * Execute a macro
   */
  async execute(macro: Macro): Promise<void> {
    if (this.isExecuting) {
      this.logger.warn("Macro already executing");
      throw new Error("Another macro is already executing");
    }

    this.isExecuting = true;
    this.logger.info(`Executing macro: ${macro.name}`);

    try {
      const actions = macro.actions;

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        await this.executeAction(action.type, action.params);

        // Wait for delay after action
        if (action.delayAfter > 0) {
          await this.delay(action.delayAfter);
        }
      }

      this.logger.info(`Macro completed: ${macro.name}`);
    } catch (error) {
      this.logger.error(`Macro execution failed: ${macro.name}`, error);
      throw error;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Execute a single macro action
   */
  private async executeAction(
    type: MacroActionType,
    params?: Record<string, unknown>
  ): Promise<void> {
    switch (type) {
      case MacroActionType.LOWER_SHOW:
        await this.channelManager.publishLowerThird(
          LowerThirdEventType.SHOW,
          params
        );
        break;

      case MacroActionType.LOWER_HIDE:
        await this.channelManager.publishLowerThird(LowerThirdEventType.HIDE);
        break;

      case MacroActionType.COUNTDOWN_START:
        if (params?.seconds) {
          await this.channelManager.publishCountdown(
            CountdownEventType.SET,
            { seconds: params.seconds }
          );
          await this.channelManager.publishCountdown(CountdownEventType.START);
        }
        break;

      case MacroActionType.COUNTDOWN_PAUSE:
        await this.channelManager.publishCountdown(CountdownEventType.PAUSE);
        break;

      case MacroActionType.COUNTDOWN_RESET:
        await this.channelManager.publishCountdown(CountdownEventType.RESET);
        break;

      case MacroActionType.POSTER_SHOW:
        await this.channelManager.publishPoster(PosterEventType.SHOW, params);
        break;

      case MacroActionType.POSTER_HIDE:
        await this.channelManager.publishPoster(PosterEventType.HIDE);
        break;

      case MacroActionType.OBS_SCENE_SWITCH:
        if (params?.sceneName) {
          await this.sceneController.switchScene(params.sceneName as string);
        }
        break;

      case MacroActionType.DELAY:
        if (params?.duration) {
          await this.delay(params.duration as number);
        }
        break;

      default:
        this.logger.warn(`Unknown action type: ${type}`);
    }
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if macro is currently executing
   */
  getIsExecuting(): boolean {
    return this.isExecuting;
  }

  /**
   * Stop current execution (emergency stop)
   */
  stop(): void {
    this.isExecuting = false;
    this.logger.warn("Macro execution stopped");
  }
}

