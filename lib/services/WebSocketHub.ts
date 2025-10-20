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

  private constructor() {
    this.wss = null;
    this.httpServer = null;
    this.clients = new Map();
    this.logger = new Logger("WebSocketHub");
    this.config = AppConfig.getInstance();
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
    if (this.wss) {
      this.logger.warn("WebSocket server already running");
      return;
    }

    const port = this.config.websocketPort;

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

    this.httpServer.listen(port, () => {
      this.logger.info(`WebSocket server listening on port ${port}`);
    });

    this.startHeartbeat();
  }

  /**
   * Check if the WebSocket server is running
   */
  isRunning(): boolean {
    return this.wss !== null && this.httpServer !== null;
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

