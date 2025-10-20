import { WebSocketServer, WebSocket } from "ws";
import { createServer, Server as HTTPServer } from "http";
import { AppConfig } from "../config/AppConfig";
import { Logger } from "../utils/Logger";
import { randomUUID } from "crypto";

/**
 * WebSocket client with metadata
 */
interface WSClient {
  id: string;
  ws: WebSocket;
  channels: Set<string>;
  isAlive: boolean;
}

/**
 * WebSocketHub manages WebSocket connections and message routing
 */
export class WebSocketHub {
  private static instance: WebSocketHub;
  private wss: WebSocketServer | null;
  private httpServer: HTTPServer | null;
  private clients: Map<string, WSClient>;
  private logger: Logger;
  private config: AppConfig;
  private heartbeatInterval?: NodeJS.Timeout;
  private startAttempted: boolean;

  private constructor() {
    this.wss = null;
    this.httpServer = null;
    this.clients = new Map();
    this.logger = new Logger("WebSocketHub");
    this.config = AppConfig.getInstance();
    this.startAttempted = false;
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): WebSocketHub {
    if (!WebSocketHub.instance) {
      WebSocketHub.instance = new WebSocketHub();
    }
    return WebSocketHub.instance;
  }

  /**
   * Start the WebSocket server
   */
  start(): void {
    if (this.startAttempted) {
      this.logger.debug("WebSocket server start already attempted, skipping");
      return;
    }

    this.startAttempted = true;
    const port = this.config.websocketPort;
    this.logger.info(`Starting WebSocket server on port ${port}...`);

    this.httpServer = createServer();
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on("connection", (ws: WebSocket) => {
      const clientId = randomUUID();
      const client: WSClient = {
        id: clientId,
        ws,
        channels: new Set(),
        isAlive: true,
      };

      this.clients.set(clientId, client);
      this.logger.info(`Client connected: ${clientId}`);

      ws.on("message", (data: Buffer) => {
        this.handleMessage(clientId, data.toString());
      });

      ws.on("pong", () => {
        client.isAlive = true;
      });

      ws.on("close", () => {
        this.clients.delete(clientId);
        this.logger.info(`Client disconnected: ${clientId}`);
      });

      ws.on("error", (error) => {
        this.logger.error(`WebSocket error for client ${clientId}`, error);
      });
    });

    // Handle both synchronous and asynchronous errors
    const handleError = (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        this.logger.warn(`Port ${port} already in use - WebSocket server is running in another process. This is expected in Next.js dev mode.`);
        // Clean up local references
        if (this.wss) {
          try { this.wss.close(); } catch { /* ignore */ }
          this.wss = null;
        }
        if (this.httpServer) {
          try { this.httpServer.close(); } catch { /* ignore */ }
          this.httpServer = null;
        }
        // Don't throw - this is expected in multi-process mode
      } else {
        this.logger.error(`HTTP server error:`, error);
      }
    };

    this.httpServer.on('error', handleError);

    try {
      this.httpServer.listen(port, () => {
        this.logger.info(`WebSocket server listening on port ${port}`);
        this.startHeartbeat();
      });
    } catch (error) {
      // Catch synchronous errors
      handleError(error as NodeJS.ErrnoException);
    }
  }

  /**
   * Check if the WebSocket server is running in this process
   * Note: In Next.js dev mode, another process may be running the server
   */
  isRunning(): boolean {
    return this.wss !== null && this.httpServer !== null;
  }

  /**
   * Check if this process attempted to start the server
   */
  wasAttempted(): boolean {
    return this.startAttempted;
  }

  /**
   * Stop the WebSocket server
   */
  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
    }

    this.clients.clear();
    this.startAttempted = false;
    this.logger.info("WebSocket server stopped");
  }

  /**
   * Handle incoming message from client
   */
  private handleMessage(clientId: string, data: string): void {
    try {
      const message = JSON.parse(data);
      const client = this.clients.get(clientId);

      if (!client) return;

      switch (message.type) {
        case "subscribe":
          if (message.channel) {
            client.channels.add(message.channel);
            this.logger.debug(`Client ${clientId} subscribed to ${message.channel}`);
          }
          break;

        case "unsubscribe":
          if (message.channel) {
            client.channels.delete(message.channel);
            this.logger.debug(`Client ${clientId} unsubscribed from ${message.channel}`);
          }
          break;

        case "ack":
          this.logger.debug(`Received ack from ${clientId}`);
          break;

        default:
          this.logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      this.logger.error("Failed to parse message", error);
    }
  }

  /**
   * Broadcast message to all clients subscribed to a channel
   */
  broadcast(channel: string, data: unknown): void {
    const message = JSON.stringify({ channel, data });

    this.clients.forEach((client) => {
      if (client.channels.has(channel) && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(message);
        } catch (error) {
          this.logger.error(`Failed to send to client ${client.id}`, error);
        }
      }
    });

    this.logger.debug(`Broadcasted to channel: ${channel}`);
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, data: unknown): void {
    const client = this.clients.get(clientId);

    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(data));
      } catch (error) {
        this.logger.error(`Failed to send to client ${clientId}`, error);
      }
    }
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client) => {
        if (!client.isAlive) {
          client.ws.terminate();
          this.clients.delete(client.id);
          this.logger.debug(`Terminated dead connection: ${client.id}`);
          return;
        }

        client.isAlive = false;
        client.ws.ping();
      });
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get clients subscribed to a channel
   */
  getChannelSubscribers(channel: string): number {
    let count = 0;
    this.clients.forEach((client) => {
      if (client.channels.has(channel)) {
        count++;
      }
    });
    return count;
  }
}

