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
import { WebSocketHub } from "../lib/services/WebSocketHub";
import { ChannelManager } from "../lib/services/ChannelManager";
import { OBSConnectionManager } from "../lib/adapters/obs/OBSConnectionManager";
import { OverlayChannel } from "../lib/models/OverlayEvents";
import { OBSStateManager } from "../lib/adapters/obs/OBSStateManager";
import { DatabaseService } from "../lib/services/DatabaseService";
import { RoomService } from "../lib/services/RoomService";
import { Logger } from "../lib/utils/Logger";
import { PathManager } from "../lib/config/PathManager";
import { AppConfig } from "../lib/config/AppConfig";
import quizRouter from "./api/quiz";
import quizBotRouter from "./api/quiz-bot";
import roomsRouter from "./api/rooms";
import cueRouter from "./api/cue";
import { updatePosterSourceInOBS } from "./api/obs-helpers";

class BackendServer {
  private logger: Logger;
  private wsHub: WebSocketHub;
  private channelManager: ChannelManager;
  private obsManager: OBSConnectionManager;
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
    this.app = express();

    // Use port 3002 for backend HTTP API
    const config = AppConfig.getInstance();
    this.httpPort = (config as any).backendApiPort || 3002;

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
        this.logger.error('Error in /api/obs/status:', error);
        res.status(500).json({ error: String(error) });
      }
    });

    // OBS Reconnect
    this.app.post('/api/obs/reconnect', async (req, res) => {
      try {
        await this.obsManager.disconnect();
        await this.obsManager.connect();
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: String(error) });
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
        res.status(500).json({ error: String(error) });
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
        res.status(500).json({ error: String(error) });
      }
    });

    // Quiz API
    this.app.use('/api/quiz', quizRouter);
    this.app.use('/api/quiz-bot', quizBotRouter);

    // Presenter Dashboard API
    this.app.use('/api/rooms', roomsRouter);
    this.app.use('/api/cue', cueRouter);

    // Overlays - Lower Third
    this.app.post('/api/overlays/lower', async (req, res) => {
      try {
        const { action, payload } = req.body;
        const channel = OverlayChannel.LOWER;
        let type;
        switch (action) {
          case "show": type = "show"; break;
          case "hide": type = "hide"; break;
          case "update": type = "update"; break;
          default: return res.status(400).json({ error: "Invalid action" });
        }
        await this.channelManager.publish(channel, type, payload);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });

    // Overlays - Countdown
    this.app.post('/api/overlays/countdown', async (req, res) => {
      try {
        const { action, payload } = req.body;
        const channel = OverlayChannel.COUNTDOWN;
        let type;
        switch (action) {
          case "set": type = "set"; break;
          case "start": type = "start"; break;
          case "pause": type = "pause"; break;
          case "reset": type = "reset"; break;
          case "update": type = "update"; break;
          case "add-time": type = "add-time"; break;
          default: return res.status(400).json({ error: "Invalid action" });
        }
        await this.channelManager.publish(channel, type, payload);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });

    // Overlays - Poster
    this.app.post('/api/overlays/poster', async (req, res) => {
      try {
        const { action, payload } = req.body;
        const channel = OverlayChannel.POSTER;
        let type;
        switch (action) {
          case "show": type = "show"; break;
          case "hide": type = "hide"; break;
          case "next": type = "next"; break;
          case "previous": type = "previous"; break;
          case "play": type = "play"; break;
          case "pause": type = "pause"; break;
          case "seek": type = "seek"; break;
          case "mute": type = "mute"; break;
          case "unmute": type = "unmute"; break;
          default: return res.status(400).json({ error: "Invalid action" });
        }
        await this.channelManager.publish(channel, type, payload);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });

    // Overlays - Big-Picture Poster
    this.app.post('/api/overlays/poster-bigpicture', async (req, res) => {
      try {
        const { action, payload } = req.body;
        const channel = OverlayChannel.POSTER_BIGPICTURE;
        let type;
        switch (action) {
          case "show":
            type = "show";
            // Update source text in OBS

            if (payload && typeof payload === 'object') {
              const sourceText = (payload as any).source || "";
              updatePosterSourceInOBS(this.obsManager.getOBS(), sourceText).catch(err => {
                this.logger.warn("Failed to update source-text in OBS", err);
              });
            }
            break;
          case "hide": type = "hide";
            // Reset source text in OBS
            updatePosterSourceInOBS(this.obsManager.getOBS(), "").catch(err => {
              this.logger.warn("Failed to reset source-text in OBS", err);
            });
            break;
          case "play": type = "play"; break;
          case "pause": type = "pause"; break;
          case "seek": type = "seek"; break;
          case "mute": type = "mute"; break;
          case "unmute": type = "unmute"; break;
          default: return res.status(400).json({ error: "Invalid action" });
        }
        await this.channelManager.publish(channel, type, payload);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });

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

    // CORS for Next.js
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
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
        this.logger.error('Failed to publish message', error);
        res.status(500).json({ error: String(error) });
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

  /**
   * Helper to update OBS source text and position
   */
  private async updatePosterSourceInOBS(sourceText: string): Promise<void> {
    if (!this.obsManager.isConnected()) return;

    try {
      const obs = this.obsManager.getOBS();

      // 1. Update text content and internal alignment
      // align: "right" makes text grow to the left from its origin
      await obs.call("SetInputSettings", {
        inputName: "source-text",
        inputSettings: {
          text: sourceText,
          align: "right"
        }
      });

      // 2. Position the scene item (Right aligned, 35px from edge)
      const { currentProgramSceneName } = await obs.call("GetCurrentProgramScene");

      // Find the scene item id
      const { sceneItemId } = await obs.call("GetSceneItemId", {
        sceneName: currentProgramSceneName,
        sourceName: "source-text"
      });

      if (sceneItemId) {
        const { baseWidth } = await obs.call("GetVideoSettings");
        const targetX = baseWidth - 35; // 35px from right edge

        // Get current transform to preserve vertical alignment
        const { sceneItemTransform } = await obs.call("GetSceneItemTransform", {
          sceneName: currentProgramSceneName,
          sceneItemId
        });

        // Calculate new alignment: Preserve vertical bits (0x18 = 0001 1000 = Top|Bottom inverted?) 
        // OBS Alignment is:
        // Center: 0
        // Left: 1
        // Right: 2
        // Top: 4
        // Bottom: 8
        // Mask: 0b1100 = 12 (0xC) for vertical (Top|Bottom)
        // Check current:
        const currentAlign = sceneItemTransform.alignment as number;

        // Preserve vertical (Top(4) / Bottom(8) / Center(0))
        const verticalPart = currentAlign & 12; // 12 = 4 | 8

        // Force Right (2)
        const newAlign = verticalPart | 2;

        await obs.call("SetSceneItemTransform", {
          sceneName: currentProgramSceneName,
          sceneItemId,
          sceneItemTransform: {
            positionX: targetX,
            alignment: newAlign
          }
        });

        this.logger.debug(`Updated source-text: Right aligned at ${targetX}px`);
      }
    } catch (error) {
      // It's normal to fail if source-text doesn't exist in current scene or at all
      // We assume source-text might be global but scene item is local
      throw error;
    }
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

      // 5. Start HTTP API server
      await new Promise<void>((resolve) => {
        this.httpServer = this.app.listen(this.httpPort, () => {
          this.logger.info(`✓ HTTP API listening on port ${this.httpPort}`);
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

      this.wsHub.stop();
      await this.obsManager.disconnect();
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
  console.log("  - WebSocket: ws://localhost:3003");
  console.log("  - HTTP API: http://localhost:3002");
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

