import { OBSConnectionManager } from "./OBSConnectionManager";
import { Logger } from "../../utils/Logger";

/**
 * OBS state information
 */
export interface OBSState {
  currentScene: string | null;
  isStreaming: boolean;
  isRecording: boolean;
  isVirtualCamActive: boolean;
  fps: number;
  streamTime?: number;
  recordTime?: number;
}

/**
 * OBSStateManager tracks current OBS state
 */
export class OBSStateManager {
  private static instance: OBSStateManager;
  private connectionManager: OBSConnectionManager;
  private logger: Logger;
  private state: OBSState;
  private listeners: Set<(state: OBSState) => void>;

  private constructor() {
    this.connectionManager = OBSConnectionManager.getInstance();
    this.logger = new Logger("OBSStateManager");
    this.listeners = new Set();
    
    this.state = {
      currentScene: null,
      isStreaming: false,
      isRecording: false,
      isVirtualCamActive: false,
      fps: 0,
    };

    this.setupEventListeners();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): OBSStateManager {
    if (!OBSStateManager.instance) {
      OBSStateManager.instance = new OBSStateManager();
    }
    return OBSStateManager.instance;
  }

  /**
   * Setup OBS event listeners
   */
  private setupEventListeners(): void {
    const obs = this.connectionManager.getOBS();

    obs.on("CurrentProgramSceneChanged", (data) => {
      this.state.currentScene = data.sceneName;
      this.notifyListeners();
    });

    obs.on("StreamStateChanged", (data) => {
      this.state.isStreaming = data.outputActive;
      this.notifyListeners();
    });

    obs.on("RecordStateChanged", (data) => {
      this.state.isRecording = data.outputActive;
      this.notifyListeners();
    });

    obs.on("VirtualcamStateChanged", (data) => {
      this.state.isVirtualCamActive = data.outputActive;
      this.notifyListeners();
    });
  }

  /**
   * Refresh state from OBS
   */
  async refreshState(): Promise<void> {
    if (!this.connectionManager.isConnected()) {
      this.logger.warn("Cannot refresh state: not connected");
      return;
    }

    const obs = this.connectionManager.getOBS();

    try {
      const scene = await obs.call("GetCurrentProgramScene");
      this.state.currentScene = scene.currentProgramSceneName;

      const streamStatus = await obs.call("GetStreamStatus");
      this.state.isStreaming = streamStatus.outputActive;

      const recordStatus = await obs.call("GetRecordStatus");
      this.state.isRecording = recordStatus.outputActive;

      const stats = await obs.call("GetStats");
      this.state.fps = stats.activeFps;

      this.notifyListeners();
      this.logger.info("State refreshed successfully");
    } catch (error) {
      this.logger.error("Failed to refresh state", error);
      throw error;
    }
  }

  /**
   * Get current state
   */
  getState(): OBSState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: OBSState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    const stateCopy = this.getState();
    this.listeners.forEach((listener) => listener(stateCopy));
  }

  /**
   * Start streaming
   */
  async startStreaming(): Promise<void> {
    const obs = this.connectionManager.getOBS();
    await obs.call("StartStream");
    this.logger.info("Streaming started");
  }

  /**
   * Stop streaming
   */
  async stopStreaming(): Promise<void> {
    const obs = this.connectionManager.getOBS();
    await obs.call("StopStream");
    this.logger.info("Streaming stopped");
  }

  /**
   * Start recording
   */
  async startRecording(): Promise<void> {
    const obs = this.connectionManager.getOBS();
    await obs.call("StartRecord");
    this.logger.info("Recording started");
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<void> {
    const obs = this.connectionManager.getOBS();
    await obs.call("StopRecord");
    this.logger.info("Recording stopped");
  }
}

