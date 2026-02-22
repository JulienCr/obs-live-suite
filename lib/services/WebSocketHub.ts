import { WebSocketServer, WebSocket } from "ws";
import { Server as HTTPServer } from "http";
import { Server as HTTPSServer } from "https";
import { AppConfig } from "../config/AppConfig";
import { Logger } from "../utils/Logger";
import { randomUUID } from "crypto";
import { PresenterPresence, PresenterRole } from "../models/PresenterChannel";
import { createHttpServerWithFallback } from "../utils/CertificateManager";
import { WEBSOCKET } from "../config/Constants";

/**
 * WebSocket client with metadata
 */
interface WSClient {
  id: string;
  ws: WebSocket;
  channels: Set<string>;
  isAlive: boolean;
  isPresenter?: boolean;
  role?: PresenterRole;
  lastActivity?: number;
}

/**
 * WebSocketHub manages WebSocket connections and message routing
 */
export class WebSocketHub {
  private static instance: WebSocketHub;
  private wss: WebSocketServer | null;
  private httpServer: HTTPServer | HTTPSServer | null;
  private clients: Map<string, WSClient>;
  private presenterPresence: Map<string, PresenterPresence>;
  private logger: Logger;
  private config: AppConfig;
  private heartbeatInterval?: NodeJS.Timeout;
  private startAttempted: boolean;
  private onPresenterJoinCallback?: (clientId: string, role: PresenterRole) => void;
  private onAckCallback?: (ack: { eventId: string; channel: string; success: boolean; error?: string }) => void;
  private onClientDisconnectCallback?: (clientId: string, channels: Set<string>) => void;

  private constructor() {
    this.wss = null;
    this.httpServer = null;
    this.clients = new Map();
    this.presenterPresence = new Map();
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

    // Create HTTP/HTTPS server using centralized certificate manager
    const { server, isHttps } = createHttpServerWithFallback();
    this.httpServer = server;

    if (isHttps) {
      this.logger.info(`WebSocket server using HTTPS (wss://)`);
    } else {
      this.logger.warn('SSL certificates not found, WebSocket using HTTP (ws://)');
    }

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
      this.logger.debug(`Client connected: ${clientId}`);

      ws.on("message", (data: Buffer) => {
        this.handleMessage(clientId, data.toString());
      });

      ws.on("pong", () => {
        client.isAlive = true;
      });

      ws.on("close", () => {
        this.handleClientDisconnect(clientId);
        this.clients.delete(clientId);
        this.logger.debug(`Client disconnected: ${clientId}`);
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
          if (this.onAckCallback && message.eventId && message.channel) {
            this.onAckCallback({
              eventId: message.eventId,
              channel: message.channel,
              success: message.success !== false,
              error: message.error,
            });
          }
          break;

        case "state":
          // Broadcast state updates to all clients subscribed to the channel
          if (message.channel && message.data) {
            this.broadcast(message.channel, message.data);
            this.logger.debug(`Broadcasting state update for channel ${message.channel}`);
          }
          break;

        case "join-presenter":
          if (message.role) {
            this.handleJoinPresenter(clientId, message.role);
          }
          break;

        case "leave-presenter":
          this.handleLeavePresenter(clientId);
          break;

        case "cue-action":
          // Handle cue actions (ack, done, take, skip, pin, unpin)
          if (message.messageId && message.action) {
            client.lastActivity = Date.now();
            this.updatePresenceActivity(clientId);
            // The action itself is handled by the backend API
            this.logger.debug(`Cue action from ${clientId}: ${message.action} on ${message.messageId}`);
          }
          break;

        case "presence-ping":
          // Update last activity for presence tracking
          client.lastActivity = Date.now();
          this.updatePresenceActivity(clientId);
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
    }, WEBSOCKET.HEARTBEAT_INTERVAL_MS);
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

  // ==================== PRESENTER METHODS ====================

  /**
   * Set callback for ack events (used by ChannelManager to clear pending ack timeouts)
   */
  setOnAckCallback(callback: (ack: { eventId: string; channel: string; success: boolean; error?: string }) => void): void {
    this.onAckCallback = callback;
  }

  /**
   * Set callback for client disconnect events (used by ChannelManager to clear orphaned pending acks)
   */
  setOnClientDisconnectCallback(callback: (clientId: string, channels: Set<string>) => void): void {
    this.onClientDisconnectCallback = callback;
  }

  /**
   * Set callback for presenter join events (used by backend to send replay)
   */
  setOnPresenterJoinCallback(callback: (clientId: string, role: PresenterRole) => void): void {
    this.onPresenterJoinCallback = callback;
  }

  /**
   * Handle client joining the presenter channel
   */
  private handleJoinPresenter(clientId: string, role: PresenterRole): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Leave presenter channel if already joined (rejoin scenario)
    if (client.isPresenter) {
      this.handleLeavePresenter(clientId);
    }

    // Update client metadata
    client.isPresenter = true;
    client.role = role;
    client.lastActivity = Date.now();
    client.channels.add("presenter");

    // Update presence
    this.updatePresence(clientId, role, true);

    this.logger.info(`Client ${clientId} joined presenter channel as ${role}`);

    // Broadcast presence update to presenter channel
    this.broadcastPresence();

    // Trigger callback for replay (handled by backend)
    if (this.onPresenterJoinCallback) {
      this.onPresenterJoinCallback(clientId, role);
    }
  }

  /**
   * Handle client leaving the presenter channel
   */
  private handleLeavePresenter(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from channel
    client.channels.delete("presenter");
    client.isPresenter = undefined;
    client.role = undefined;

    // Update presence
    this.updatePresence(clientId, undefined, false);

    this.logger.info(`Client ${clientId} left presenter channel`);

    // Broadcast presence update to presenter channel
    this.broadcastPresence();
  }

  /**
   * Update presence for a client in the presenter channel
   */
  private updatePresence(clientId: string, role: PresenterRole | undefined, isOnline: boolean): void {
    if (isOnline && role) {
      this.presenterPresence.set(clientId, {
        clientId,
        role,
        isOnline: true,
        lastSeen: Date.now(),
        lastActivity: Date.now(),
      });
    } else {
      this.presenterPresence.delete(clientId);
    }
  }

  /**
   * Update last activity for a client
   */
  private updatePresenceActivity(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client || !client.isPresenter) return;

    const presence = this.presenterPresence.get(clientId);
    if (presence) {
      presence.lastActivity = Date.now();
      presence.lastSeen = Date.now();
    }
  }

  /**
   * Broadcast presence update to all clients in the presenter channel
   */
  broadcastPresence(): void {
    const presence = this.getPresenterPresence();

    this.broadcast("presenter", {
      type: "presence",
      presence,
      timestamp: Date.now(),
    });
  }

  /**
   * Get presence for the presenter channel
   */
  getPresenterPresence(): PresenterPresence[] {
    return Array.from(this.presenterPresence.values());
  }

  /**
   * Send replay data to a specific client
   */
  sendReplay(clientId: string, messages: unknown[], pinnedMessages: unknown[]): void {
    const presence = this.getPresenterPresence();

    this.sendToClient(clientId, {
      type: "replay",
      messages,
      pinnedMessages,
      presence,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle client disconnect - clean up pending acks and presenter presence
   */
  private handleClientDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Notify ChannelManager to clear orphaned pending acks before removing the client
    if (this.onClientDisconnectCallback) {
      this.onClientDisconnectCallback(clientId, client.channels);
    }

    if (client.isPresenter) {
      this.handleLeavePresenter(clientId);
    }
  }
}
