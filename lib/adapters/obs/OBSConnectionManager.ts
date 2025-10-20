import OBSWebSocket from "obs-websocket-js";
import { Logger } from "../../utils/Logger";
import { AppConfig } from "../../config/AppConfig";

/**
 * Connection status enum
 */
export enum ConnectionStatus {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  ERROR = "error",
}

/**
 * OBSConnectionManager handles connection lifecycle and reconnection
 */
export class OBSConnectionManager {
  private static instance: OBSConnectionManager;
  private obs: OBSWebSocket;
  private logger: Logger;
  private config: AppConfig;
  private status: ConnectionStatus;
  private reconnectTimer?: NodeJS.Timeout;
  private reconnectAttempts: number;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;

  private constructor() {
    this.obs = new OBSWebSocket();
    this.logger = new Logger("OBSConnectionManager");
    this.config = AppConfig.getInstance();
    this.status = ConnectionStatus.DISCONNECTED;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 3000;

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
      this.logger.warn("OBS connection closed");
      this.status = ConnectionStatus.DISCONNECTED;
      this.scheduleReconnect();
    });

    this.obs.on("ConnectionError", (error) => {
      this.logger.error("OBS connection error", error);
      this.status = ConnectionStatus.ERROR;
      this.scheduleReconnect();
    });
  }

  /**
   * Connect to OBS WebSocket
   */
  async connect(): Promise<void> {
    if (this.status === ConnectionStatus.CONNECTED) {
      this.logger.info("Already connected to OBS");
      return;
    }

    this.status = ConnectionStatus.CONNECTING;
    this.logger.info("Connecting to OBS...");

    try {
      await this.obs.connect(
        this.config.obsWebSocketUrl,
        this.config.obsWebSocketPassword
      );

      this.status = ConnectionStatus.CONNECTED;
      this.reconnectAttempts = 0;
      this.logger.info("Connected to OBS successfully");

      const version = await this.obs.call("GetVersion");
      this.logger.info(`OBS Version: ${version.obsVersion}`);
    } catch (error) {
      this.status = ConnectionStatus.ERROR;
      this.logger.error("Failed to connect to OBS", error);
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * Disconnect from OBS
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.status === ConnectionStatus.CONNECTED) {
      await this.obs.disconnect();
      this.status = ConnectionStatus.DISCONNECTED;
      this.logger.info("Disconnected from OBS");
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error("Max reconnection attempts reached");
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.logger.info(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = undefined;
      try {
        await this.connect();
      } catch {
        // Error already logged in connect()
      }
    }, delay);
  }

  /**
   * Get connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    // Check both our status and the actual WebSocket connection state
    try {
      // obs-websocket-js doesn't expose connection state directly,
      // but we can check if we can access the socket
      return this.status === ConnectionStatus.CONNECTED && this.obs !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get OBS WebSocket instance
   */
  getOBS(): OBSWebSocket {
    return this.obs;
  }
}

