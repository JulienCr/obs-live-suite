import { Logger } from "./Logger";
import { RECONNECTION } from "../config/Constants";

/**
 * Connection status enum shared by all connection managers
 */
export enum ConnectionStatus {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  ERROR = "error",
}

/**
 * Connection error with type and original error
 */
export interface ConnectionError {
  type: string;
  message: string;
  originalError?: unknown;
}

/**
 * Options for connection manager
 */
export interface ConnectionManagerOptions {
  /** Maximum number of reconnection attempts */
  maxReconnectAttempts?: number;
  /** Base delay in milliseconds before first reconnection attempt */
  baseReconnectDelay?: number;
  /** Logger name for this connection manager */
  loggerName: string;
}

/**
 * Abstract base class for connection managers with auto-reconnection.
 * Provides exponential backoff reconnection logic that can be extended
 * by OBS, Streamer.bot, and other WebSocket-based connections.
 *
 * @example
 * class MyConnectionManager extends ConnectionManager {
 *   protected async doConnect(): Promise<void> {
 *     // Implementation-specific connection logic
 *   }
 *
 *   protected async doDisconnect(): Promise<void> {
 *     // Implementation-specific disconnection logic
 *   }
 * }
 */
export abstract class ConnectionManager {
  protected logger: Logger;
  protected status: ConnectionStatus;
  protected reconnectTimer?: NodeJS.Timeout;
  protected reconnectAttempts: number;
  protected maxReconnectAttempts: number;
  protected baseReconnectDelay: number;
  protected currentError?: ConnectionError;

  protected constructor(options: ConnectionManagerOptions) {
    this.logger = new Logger(options.loggerName);
    this.status = ConnectionStatus.DISCONNECTED;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts =
      options.maxReconnectAttempts ?? RECONNECTION.MAX_ATTEMPTS;
    this.baseReconnectDelay =
      options.baseReconnectDelay ?? RECONNECTION.BASE_DELAY_MS;
  }

  /**
   * Implementation-specific connection logic.
   * Should throw on connection failure.
   */
  protected abstract doConnect(): Promise<void>;

  /**
   * Implementation-specific disconnection logic.
   */
  protected abstract doDisconnect(): Promise<void>;

  /**
   * Called when connection is successfully established.
   * Override to add custom behavior.
   */
  protected onConnected(): void {
    this.logger.info("Connected successfully");
  }

  /**
   * Called when connection is closed.
   * Override to add custom behavior.
   */
  protected onDisconnected(): void {
    this.logger.info("Connection closed");
  }

  /**
   * Called when connection error occurs.
   * Override to add custom behavior.
   */
  protected onError(error: ConnectionError): void {
    this.logger.error(`Connection error: ${error.message}`, error.originalError);
  }

  /**
   * Connect to the remote service.
   * Handles status transitions and error handling.
   */
  async connect(): Promise<void> {
    if (this.status === ConnectionStatus.CONNECTED) {
      this.logger.info("Disconnecting existing connection");
      await this.disconnect();
    }

    this.status = ConnectionStatus.CONNECTING;
    this.logger.info("Connecting...");

    try {
      await this.doConnect();

      this.status = ConnectionStatus.CONNECTED;
      this.reconnectAttempts = 0;
      this.currentError = undefined;
      this.onConnected();
    } catch (error) {
      this.status = ConnectionStatus.ERROR;
      this.currentError = {
        type: "CONNECTION_FAILED",
        message: error instanceof Error ? error.message : "Connection failed",
        originalError: error,
      };
      this.logger.error(
        `Connection error: ${this.currentError.message}`,
        this.currentError.originalError
      );
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * Disconnect from the remote service.
   * Cancels any pending reconnection attempts.
   */
  async disconnect(): Promise<void> {
    this.cancelReconnect();

    if (this.status === ConnectionStatus.CONNECTED) {
      await this.doDisconnect();
      this.status = ConnectionStatus.DISCONNECTED;
      this.onDisconnected();
    }
  }

  /**
   * Handle connection closed event.
   * Call this from implementation-specific event handlers.
   */
  protected handleConnectionClosed(): void {
    this.status = ConnectionStatus.DISCONNECTED;
    this.onDisconnected();
    this.scheduleReconnect();
  }

  /**
   * Handle connection error event.
   * Call this from implementation-specific event handlers.
   */
  protected handleConnectionError(error: ConnectionError): void {
    this.status = ConnectionStatus.ERROR;
    this.currentError = error;
    this.onError(error);
    this.scheduleReconnect();
  }

  /**
   * Schedule a reconnection attempt with exponential backoff.
   */
  protected scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return; // Already scheduled
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(
        `Max reconnection attempts (${this.maxReconnectAttempts}) reached`
      );
      return;
    }

    const delay = this.calculateReconnectDelay();
    this.reconnectAttempts++;

    this.logger.info(
      `Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = undefined;
      try {
        await this.connect();
      } catch (error) {
        // Log that this specific reconnection attempt failed
        // (connect() handles its own error logging, but we log here for visibility)
        this.logger.warn(
          `Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} failed`,
          error instanceof Error ? error.message : error
        );
        // Note: scheduleReconnect() is called from connect() on failure, so we don't need to call it here
      }
    }, delay);
  }

  /**
   * Calculate reconnection delay using exponential backoff.
   */
  protected calculateReconnectDelay(): number {
    return this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
  }

  /**
   * Cancel any pending reconnection attempt.
   */
  protected cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  /**
   * Check if currently connected.
   */
  isConnected(): boolean {
    return this.status === ConnectionStatus.CONNECTED;
  }

  /**
   * Get current connection status.
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Get current error if any.
   */
  getError(): ConnectionError | undefined {
    return this.currentError;
  }
}
