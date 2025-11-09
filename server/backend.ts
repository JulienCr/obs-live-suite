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
import { Logger } from "../lib/utils/Logger";
import { PathManager } from "../lib/config/PathManager";
import { AppConfig } from "../lib/config/AppConfig";
import quizRouter from "./api/quiz";
import quizBotRouter from "./api/quiz-bot";
import { randomUUID } from "crypto";
import {
  MediaInstance,
  MediaEventType,
  addMediaItemRequestSchema,
  updateMediaItemRequestSchema,
  reorderMediaItemsRequestSchema,
  toggleMediaRequestSchema,
  muteMediaRequestSchema,
} from "../lib/models/Media";
import {
  detectMediaType,
  extractYouTubeId,
  getYouTubeThumbnail,
  generateMediaTitle,
} from "../lib/utils/media";

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
          default: return res.status(400).json({ error: "Invalid action" });
        }
        await this.channelManager.publish(channel, type, payload);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });

    // ==================== MEDIA OVERLAY API ====================

    // Helper to get channel for instance
    const getMediaChannel = (instance: string) => {
      if (instance === 'A') return OverlayChannel.MEDIA_A;
      if (instance === 'B') return OverlayChannel.MEDIA_B;
      throw new Error('Invalid instance');
    };

    // Get media playlist state
    this.app.get('/api/media/:instance/state', async (req, res) => {
      try {
        const instance = req.params.instance as MediaInstance;
        if (instance !== 'A' && instance !== 'B') {
          return res.status(400).json({ error: 'Invalid instance' });
        }

        const db = DatabaseService.getInstance();
        const playlist = db.getMediaPlaylistByInstance(instance);

        if (!playlist) {
          return res.status(404).json({ error: 'Playlist not found' });
        }

        const currentItem = playlist.items[playlist.index] || null;

        res.json({
          playlist,
          currentItem,
        });
      } catch (error) {
        this.logger.error('Error getting media state:', error);
        res.status(500).json({ error: String(error) });
      }
    });

    // Add media item
    this.app.post('/api/media/:instance/items', async (req, res) => {
      try {
        const instance = req.params.instance as MediaInstance;
        if (instance !== 'A' && instance !== 'B') {
          return res.status(400).json({ error: 'Invalid instance' });
        }

        const body = addMediaItemRequestSchema.parse(req.body);
        const { url } = body;

        // Detect media type
        const type = detectMediaType(url);
        if (!type) {
          return res.status(400).json({ error: 'Unsupported media type' });
        }

        // Generate metadata
        const id = randomUUID();
        const title = generateMediaTitle(url, type);
        let thumb: string | undefined;

        if (type === 'youtube') {
          const videoId = extractYouTubeId(url);
          if (videoId) {
            thumb = getYouTubeThumbnail(videoId);
          }
        }

        // Get playlist
        const db = DatabaseService.getInstance();
        const playlist = db.getMediaPlaylistByInstance(instance);
        if (!playlist) {
          return res.status(404).json({ error: 'Playlist not found' });
        }

        // Create item
        const item = {
          id,
          url,
          type,
          title,
          thumb,
        };

        db.createMediaItem(playlist.id, item);

        // Broadcast to overlay
        const channel = getMediaChannel(instance);
        await this.channelManager.publish(channel, MediaEventType.ADD_ITEM, { item });

        res.json({ success: true, item });
      } catch (error) {
        this.logger.error('Error adding media item:', error);
        res.status(500).json({ error: String(error) });
      }
    });

    // Update media item
    this.app.patch('/api/media/:instance/items/:id', async (req, res) => {
      try {
        const instance = req.params.instance as MediaInstance;
        const itemId = req.params.id;

        if (instance !== 'A' && instance !== 'B') {
          return res.status(400).json({ error: 'Invalid instance' });
        }

        const updates = updateMediaItemRequestSchema.parse(req.body);

        // Update in database
        const db = DatabaseService.getInstance();
        db.updateMediaItem(itemId, updates);

        // Broadcast to overlay
        const channel = getMediaChannel(instance);
        await this.channelManager.publish(channel, MediaEventType.UPDATE_ITEM, {
          id: itemId,
          updates,
        });

        res.json({ success: true });
      } catch (error) {
        this.logger.error('Error updating media item:', error);
        res.status(500).json({ error: String(error) });
      }
    });

    // Delete media item
    this.app.delete('/api/media/:instance/items/:id', async (req, res) => {
      try {
        const instance = req.params.instance as MediaInstance;
        const itemId = req.params.id;

        if (instance !== 'A' && instance !== 'B') {
          return res.status(400).json({ error: 'Invalid instance' });
        }

        // Delete from database
        const db = DatabaseService.getInstance();
        db.deleteMediaItem(itemId);

        // Broadcast to overlay
        const channel = getMediaChannel(instance);
        await this.channelManager.publish(channel, MediaEventType.REMOVE_ITEM, {
          id: itemId,
        });

        res.json({ success: true });
      } catch (error) {
        this.logger.error('Error deleting media item:', error);
        res.status(500).json({ error: String(error) });
      }
    });

    // Reorder media items
    this.app.post('/api/media/:instance/reorder', async (req, res) => {
      try {
        const instance = req.params.instance as MediaInstance;
        if (instance !== 'A' && instance !== 'B') {
          return res.status(400).json({ error: 'Invalid instance' });
        }

        const body = reorderMediaItemsRequestSchema.parse(req.body);
        const { order } = body;

        // Get playlist
        const db = DatabaseService.getInstance();
        const playlist = db.getMediaPlaylistByInstance(instance);
        if (!playlist) {
          return res.status(404).json({ error: 'Playlist not found' });
        }

        // Reorder in database
        db.reorderMediaItems(playlist.id, order);

        // Broadcast to overlay
        const channel = getMediaChannel(instance);
        await this.channelManager.publish(channel, MediaEventType.REORDER, { order });

        res.json({ success: true });
      } catch (error) {
        this.logger.error('Error reordering media items:', error);
        res.status(500).json({ error: String(error) });
      }
    });

    // Toggle media overlay on/off
    this.app.post('/api/media/:instance/toggle', async (req, res) => {
      try {
        const instance = req.params.instance as MediaInstance;
        if (instance !== 'A' && instance !== 'B') {
          return res.status(400).json({ error: 'Invalid instance' });
        }

        const body = toggleMediaRequestSchema.parse(req.body);
        const { on } = body;

        // Update in database
        const db = DatabaseService.getInstance();
        db.updateMediaPlaylist(instance, { on });

        // Broadcast to overlay
        const channel = getMediaChannel(instance);
        await this.channelManager.publish(channel, MediaEventType.TOGGLE, { on });

        res.json({ success: true });
      } catch (error) {
        this.logger.error('Error toggling media:', error);
        res.status(500).json({ error: String(error) });
      }
    });

    // Next media item
    this.app.post('/api/media/:instance/next', async (req, res) => {
      try {
        const instance = req.params.instance as MediaInstance;
        if (instance !== 'A' && instance !== 'B') {
          return res.status(400).json({ error: 'Invalid instance' });
        }

        // Get current playlist
        const db = DatabaseService.getInstance();
        const playlist = db.getMediaPlaylistByInstance(instance);
        if (!playlist) {
          return res.status(404).json({ error: 'Playlist not found' });
        }

        // Calculate next index (wrap around)
        const nextIndex = playlist.items.length > 0 ? (playlist.index + 1) % playlist.items.length : 0;

        // Update in database
        db.updateMediaPlaylist(instance, { index: nextIndex });

        // Broadcast to overlay
        const channel = getMediaChannel(instance);
        await this.channelManager.publish(channel, MediaEventType.NEXT, {});

        res.json({ success: true, nextIndex });
      } catch (error) {
        this.logger.error('Error moving to next media:', error);
        res.status(500).json({ error: String(error) });
      }
    });

    // Mute/unmute media
    this.app.post('/api/media/:instance/mute', async (req, res) => {
      try {
        const instance = req.params.instance as MediaInstance;
        if (instance !== 'A' && instance !== 'B') {
          return res.status(400).json({ error: 'Invalid instance' });
        }

        const body = muteMediaRequestSchema.parse(req.body);
        const { muted } = body;

        // Update in database
        const db = DatabaseService.getInstance();
        db.updateMediaPlaylist(instance, { muted });

        // Broadcast to overlay
        const channel = getMediaChannel(instance);
        await this.channelManager.publish(channel, MediaEventType.MUTE, { muted });

        res.json({ success: true });
      } catch (error) {
        this.logger.error('Error muting media:', error);
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

      // 2. Start WebSocket Hub
      this.wsHub.start();
      this.logger.info("✓ WebSocket hub started");

      // 3. Connect to OBS
      try {
        await this.obsManager.connect();
        const stateManager = OBSStateManager.getInstance();
        await stateManager.refreshState();
        this.logger.info("✓ OBS connected");
      } catch (error) {
        this.logger.warn("OBS connection failed (will retry)", error);
      }

      // 4. Start HTTP API server
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

