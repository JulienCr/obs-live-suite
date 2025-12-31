import { WebSocketServer, WebSocket } from "ws";
import { createServer as createHTTPServer, Server as HTTPServer } from "http";
import { createServer as createHTTPSServer, Server as HTTPSServer } from "https";
import { AppConfig } from "../config/AppConfig";
import { Logger } from "../utils/Logger";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { RoomPresence, RoomRole } from "../models/Room";

/**
 * WebSocket client with metadata
 */
interface WSClient {
  id: string;
  ws: WebSocket;
  channels: Set<string>;
  isAlive: boolean;
  roomId?: string;
  role?: RoomRole;
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
  private roomPresence: Map<string, Map<string, RoomPresence>>;
  private logger: Logger;
  private config: AppConfig;
  private heartbeatInterval?: NodeJS.Timeout;
  private startAttempted: boolean;
  private onRoomJoinCallback?: (roomId: string, clientId: string, role: RoomRole) => void;

  private constructor() {
    this.wss = null;
    this.httpServer = null;
    this.clients = new Map();
    this.roomPresence = new Map();
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

    // Check for SSL certificates
    const certPath = path.join(process.cwd(), 'localhost+3.pem');
    const keyPath = path.join(process.cwd(), 'localhost+3-key.pem');

    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      // Create HTTPS server for WebSocket Secure (WSS)
      const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
      this.httpServer = createHTTPSServer(httpsOptions);
      this.logger.info(`WebSocket server using HTTPS (wss://)`);
    } else {
      // Fallback to HTTP
      this.httpServer = createHTTPServer();
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
      this.logger.info(`Client connected: ${clientId}`);

      ws.on("message", (data: Buffer) => {
        this.handleMessage(clientId, data.toString());
      });

      ws.on("pong", () => {
        client.isAlive = true;
      });

      ws.on("close", () => {
        this.handleClientDisconnect(clientId);
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

        case "state":
          // Broadcast state updates to all clients subscribed to the channel
          if (message.channel && message.data) {
            this.broadcast(message.channel, message.data);
            this.logger.debug(`Broadcasting state update for channel ${message.channel}`);
          }
          break;

        case "join-room":
          if (message.roomId && message.role) {
            this.handleJoinRoom(clientId, message.roomId, message.role);
          }
          break;

        case "leave-room":
          if (message.roomId) {
            this.handleLeaveRoom(clientId, message.roomId);
          }
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

  // ==================== ROOM METHODS ====================

  /**
   * Set callback for room join events (used by backend to send replay)
   */
  setOnRoomJoinCallback(callback: (roomId: string, clientId: string, role: RoomRole) => void): void {
    this.onRoomJoinCallback = callback;
  }

  /**
   * Handle client joining a room
   */
  private handleJoinRoom(clientId: string, roomId: string, role: RoomRole): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const roomChannel = `room:${roomId}`;

    // Leave previous room if any
    if (client.roomId && client.roomId !== roomId) {
      this.handleLeaveRoom(clientId, client.roomId);
    }

    // Update client metadata
    client.roomId = roomId;
    client.role = role;
    client.lastActivity = Date.now();
    client.channels.add(roomChannel);

    // Update presence
    this.updatePresence(roomId, clientId, role, true);

    this.logger.info(`Client ${clientId} joined room ${roomId} as ${role}`);

    // Broadcast presence update to room
    this.broadcastPresence(roomId);

    // Trigger callback for replay (handled by backend)
    if (this.onRoomJoinCallback) {
      this.onRoomJoinCallback(roomId, clientId, role);
    }
  }

  /**
   * Handle client leaving a room
   */
  private handleLeaveRoom(clientId: string, roomId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const roomChannel = `room:${roomId}`;

    // Remove from channel
    client.channels.delete(roomChannel);
    client.roomId = undefined;
    client.role = undefined;

    // Update presence
    this.updatePresence(roomId, clientId, undefined, false);

    this.logger.info(`Client ${clientId} left room ${roomId}`);

    // Broadcast presence update to room
    this.broadcastPresence(roomId);
  }

  /**
   * Update presence for a client in a room
   */
  private updatePresence(roomId: string, clientId: string, role: RoomRole | undefined, isOnline: boolean): void {
    if (!this.roomPresence.has(roomId)) {
      this.roomPresence.set(roomId, new Map());
    }

    const roomClients = this.roomPresence.get(roomId)!;

    if (isOnline && role) {
      roomClients.set(clientId, {
        roomId,
        clientId,
        role,
        isOnline: true,
        lastSeen: Date.now(),
        lastActivity: Date.now(),
      });
    } else {
      roomClients.delete(clientId);
    }
  }

  /**
   * Update last activity for a client
   */
  private updatePresenceActivity(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client || !client.roomId) return;

    const roomClients = this.roomPresence.get(client.roomId);
    if (!roomClients) return;

    const presence = roomClients.get(clientId);
    if (presence) {
      presence.lastActivity = Date.now();
      presence.lastSeen = Date.now();
    }
  }

  /**
   * Broadcast presence update to all clients in a room
   */
  broadcastPresence(roomId: string): void {
    const roomChannel = `room:${roomId}`;
    const presence = this.getPresence(roomId);

    this.broadcast(roomChannel, {
      type: "presence",
      roomId,
      presence,
      timestamp: Date.now(),
    });
  }

  /**
   * Get presence for a room
   */
  getPresence(roomId: string): RoomPresence[] {
    const roomClients = this.roomPresence.get(roomId);
    if (!roomClients) return [];

    return Array.from(roomClients.values());
  }

  /**
   * Send replay data to a specific client
   */
  sendReplay(clientId: string, roomId: string, messages: unknown[], pinnedMessages: unknown[]): void {
    const presence = this.getPresence(roomId);

    this.sendToClient(clientId, {
      type: "replay",
      roomId,
      messages,
      pinnedMessages,
      presence,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle client disconnect - clean up room presence
   */
  private handleClientDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client?.roomId) {
      this.handleLeaveRoom(clientId, client.roomId);
    }
  }
}

