#!/usr/bin/env node
/**
 * Standalone Backend Server
 * Runs WebSocket hub and OBS connection independently from Next.js
 * Exposes HTTP API for Next.js to publish messages
 * Updated: Added countdown UPDATE action support
 */

// Load environment variables from .env file
import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import express from "express";
import { fileURLToPath } from "url";
import path from "path";
import { WebSocketHub } from "../lib/services/WebSocketHub";
import { ChannelManager } from "../lib/services/ChannelManager";
import { OBSConnectionManager } from "../lib/adapters/obs/OBSConnectionManager";
import { StreamerbotGateway } from "../lib/adapters/streamerbot/StreamerbotGateway";
import { OBSStateManager } from "../lib/adapters/obs/OBSStateManager";
import { DatabaseService } from "../lib/services/DatabaseService";
import { RoomService } from "../lib/services/RoomService";
import { SettingsService } from "../lib/services/SettingsService";
import { TwitchService } from "../lib/services/TwitchService";
import { Logger } from "../lib/utils/Logger";
import { PathManager } from "../lib/config/PathManager";
import { AppConfig } from "../lib/config/AppConfig";
import quizRouter from "./api/quiz";
import quizBotRouter from "./api/quiz-bot";
import roomsRouter from "./api/rooms";
import cueRouter from "./api/cue";
import streamerbotChatRouter from "./api/streamerbot-chat";
import overlaysRouter from "./api/overlays";
import twitchRouter from "./api/twitch";
import { APP_PORT, BACKEND_PORT, WS_PORT } from "../lib/config/urls";
import { createServerWithFallback } from "../lib/utils/CertificateManager";
import { expressError } from "../lib/utils/apiError";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BackendServer {
  private logger: Logger;
  private wsHub: WebSocketHub;
  private channelManager: ChannelManager;
  private obsManager: OBSConnectionManager;
  private streamerbotGateway: StreamerbotGateway;
  private twitchService: TwitchService;
  private app: express.Application;
  private httpServer: any | null = null;
  private httpPort: number;
  private initialized = false;

  constructor() {
    // Initialize Logger file path first
    const pathManager = PathManager.getInstance();
    Logger.setLogFilePath(pathManager.getLogFilePath());

    this.logger = new Logger("BackendServer");
    this.wsHub = WebSocketHub.getInstance();
    this.channelManager = ChannelManager.getInstance();
    this.obsManager = OBSConnectionManager.getInstance();
    this.streamerbotGateway = StreamerbotGateway.getInstance();
    this.twitchService = TwitchService.getInstance();
    this.app = express();

    // Use port from centralized config
    this.httpPort = parseInt(BACKEND_PORT, 10);

    this.setupHttpApi();
  }

  private setupApiRoutes(): void {
    // OBS Status
    this.app.get('/api/obs/status', async (req, res) => {
      try {
        const state = OBSStateManager.getInstance().getState();
        res.json({
          connected: this.obsManager.isConnected(),
          ...state,
        });
      } catch (error) {
        expressError(res, error, "Failed to get OBS status", { context: "[BackendOBS]" });
      }
    });

    // OBS Reconnect
    this.app.post('/api/obs/reconnect', async (req, res) => {
      try {
        await this.obsManager.disconnect();
        await this.obsManager.connect();
        res.json({ success: true });
      } catch (error) {
        expressError(res, error, "OBS reconnect failed", { context: "[BackendOBS]" });
      }
    });

    // OBS Stream Control
    this.app.post('/api/obs/stream', async (req, res) => {
      try {
        const { action } = req.body;
        if (action === "start") {
          await this.obsManager.getOBS().call("StartStream");
        } else if (action === "stop") {
          await this.obsManager.getOBS().call("StopStream");
        }
        res.json({ success: true });
      } catch (error) {
        expressError(res, error, "Stream control failed", { context: "[BackendOBS]" });
      }
    });

    // OBS Record Control
    this.app.post('/api/obs/record', async (req, res) => {
      try {
        const { action } = req.body;
        if (action === "start") {
          await this.obsManager.getOBS().call("StartRecord");
        } else if (action === "stop") {
          await this.obsManager.getOBS().call("StopRecord");
        }
        res.json({ success: true });
      } catch (error) {
        expressError(res, error, "Record control failed", { context: "[BackendOBS]" });
      }
    });

    // Quiz API
    this.app.use('/api/quiz', quizRouter);
    this.app.use('/api/quiz-bot', quizBotRouter);

    // Presenter Dashboard API
    this.app.use('/api/rooms', roomsRouter);
    this.app.use('/api/cue', cueRouter);

    // Streamerbot Chat Gateway API
    this.app.use('/api/streamerbot-chat', streamerbotChatRouter);

    // Twitch Integration API
    this.app.use('/api/twitch', twitchRouter);

    // Overlay control routes (consolidated in server/api/overlays.ts)
    this.app.use('/api/overlays', overlaysRouter);

    // 404 handler MUST be added LAST (after all routes)
    this.app.use((req, res) => {
      this.logger.warn(`404: ${req.method} ${req.path}`);
      res.status(404).json({ error: 'Endpoint not found', path: req.path });
    });

    this.logger.info("✓ API routes configured");
  }

  private setupHttpApi(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Serve VDO.ninja static files
    const vdoNinjaPath = path.join(__dirname, 'static', 'vdoninja');
    this.app.use('/vdoninja', express.static(vdoNinjaPath));
    this.logger.info(`VDO.ninja static files served from: ${vdoNinjaPath}`);

    // CORS for Next.js and network access
    this.app.use((req, res, next) => {
      const origin = req.headers.origin;
      // Allow localhost, local network IPs, and local hostnames (HTTP or HTTPS)
      const isLocalOrigin = origin && (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('https://localhost:') ||
        origin.match(/^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.).*:[0-9]+$/) ||
        // Allow local hostnames (no dots = local network name)
        origin.match(/^https?:\/\/[a-zA-Z][a-zA-Z0-9-]*:[0-9]+$/)
      );
      if (isLocalOrigin) {
        res.header('Access-Control-Allow-Origin', origin);
      } else {
        res.header('Access-Control-Allow-Origin', `https://localhost:${APP_PORT}`);
      }
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        wsRunning: this.wsHub.isRunning(),
        obsConnected: this.obsManager.isConnected(),
        timestamp: Date.now()
      });
    });

    // API routes will be loaded during start()

    // Legacy endpoints (for backward compatibility)
    this.app.post('/publish', async (req, res) => {
      try {
        const { channel, type, payload } = req.body;

        if (!channel || !type) {
          return res.status(400).json({ error: 'channel and type are required' });
        }

        await this.channelManager.publish(channel, type, payload);

        res.json({ success: true });
      } catch (error) {
        expressError(res, error, "Failed to publish message", { context: "[BackendPublish]" });
      }
    });

    // WebSocket stats
    this.app.get('/ws/stats', (req, res) => {
      res.json({
        isRunning: this.wsHub.isRunning(),
        clients: this.wsHub.getClientCount(),
        channels: {
          lower: this.wsHub.getChannelSubscribers('lower'),
          countdown: this.wsHub.getChannelSubscribers('countdown'),
          poster: this.wsHub.getChannelSubscribers('poster'),
          'poster-bigpicture': this.wsHub.getChannelSubscribers('poster-bigpicture'),
          quiz: this.wsHub.getChannelSubscribers('quiz'),
        }
      });
    });

    // 404 handler will be added AFTER API routes in start()
  }

  async start(): Promise<void> {
    if (this.initialized) {
      this.logger.warn("Backend server already initialized");
      return;
    }

    this.logger.info("Starting backend server...");

    try {
      // 0. Setup API routes (must be first)
      this.setupApiRoutes();

      // 1. Initialize database
      DatabaseService.getInstance();
      this.logger.info("✓ Database initialized");

      // 2. Initialize default room
      const roomService = RoomService.getInstance();
      await roomService.initializeDefaultRoom();
      this.logger.info("✓ Default room initialized");

      // 3. Start WebSocket Hub
      this.wsHub.start();
      this.logger.info("✓ WebSocket hub started");

      // 4. Connect to OBS
      try {
        await this.obsManager.connect();
        const stateManager = OBSStateManager.getInstance();
        await stateManager.refreshState();
        this.logger.info("✓ OBS connected");
      } catch (error) {
        this.logger.warn("OBS connection failed (will retry)", error);
      }

      // 5. Auto-connect to Streamerbot if enabled
      try {
        const settingsService = SettingsService.getInstance();
        if (settingsService.isStreamerbotAutoConnectEnabled()) {
          await this.streamerbotGateway.connect();
          this.logger.info("✓ Streamerbot gateway connected");
        } else {
          this.logger.info("Streamerbot gateway auto-connect disabled");
        }
      } catch (error) {
        this.logger.warn("Streamerbot gateway connection failed (will retry)", error);
      }

      // 6. Start Twitch integration polling
      try {
        const settingsService = SettingsService.getInstance();
        if (settingsService.isTwitchEnabled()) {
          this.twitchService.startPolling();
          this.logger.info("✓ Twitch polling started");
        } else {
          this.logger.info("Twitch integration disabled");
        }
      } catch (error) {
        this.logger.warn("Twitch polling failed to start", error);
      }

      // 7. Start HTTP/HTTPS API server using centralized certificate manager
      await new Promise<void>((resolve) => {
        const { server, isHttps } = createServerWithFallback(this.app);
        this.httpServer = server;

        this.httpServer.listen(this.httpPort, () => {
          if (isHttps) {
            this.logger.info(`✓ HTTPS API listening on port ${this.httpPort}`);
            this.logger.info(`  - https://localhost:${this.httpPort}`);
            this.logger.info(`  - https://192.168.1.10:${this.httpPort}`);
          } else {
            this.logger.warn('SSL certificates not found, falling back to HTTP');
            this.logger.info(`✓ HTTP API listening on port ${this.httpPort}`);
          }
          resolve();
        });
      });

      this.initialized = true;
      this.logger.info("✓ Backend server ready");
    } catch (error) {
      this.logger.error("Failed to start backend server", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.logger.info("Stopping backend server...");

    try {
      // Close HTTP server
      if (this.httpServer) {
        await new Promise<void>((resolve) => {
          this.httpServer.close(() => {
            this.logger.info("✓ HTTP server closed");
            resolve();
          });
        });
        this.httpServer = null;
      }

      // Stop Twitch polling
      this.twitchService.stopPolling();

      this.wsHub.stop();
      await this.obsManager.disconnect();
      await this.streamerbotGateway.disconnect();
      const db = DatabaseService.getInstance();
      db.close();

      this.initialized = false;
      this.logger.info("✓ Backend server stopped");
    } catch (error) {
      this.logger.error("Error stopping backend server", error);
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// Start server
const server = new BackendServer();

server.start().then(() => {
  console.log("\n✓ Backend server is running");
  console.log(`  - WebSocket: ws://localhost:${WS_PORT}`);
  console.log(`  - HTTP API: http://localhost:${BACKEND_PORT}`);
  console.log("  - OBS: Connected");
  console.log("");
}).catch((error) => {
  console.error("✗ Failed to start backend server:", error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

export { server };

