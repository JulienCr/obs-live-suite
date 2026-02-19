/**
 * Backend API - Streamerbot Chat Gateway
 */
import { Router } from "express";
import { StreamerbotGateway } from "../../lib/adapters/streamerbot/StreamerbotGateway";
import { SettingsService } from "../../lib/services/SettingsService";
import { ChatMessageRepository } from "../../lib/repositories/ChatMessageRepository";
import { chatPlatformSchema } from "../../lib/models/StreamerbotChat";
import { expressError } from "../../lib/utils/apiError";

const router = Router();

/**
 * GET /api/streamerbot-chat/status
 * Get Streamerbot gateway connection status
 */
router.get("/status", async (req, res) => {
  try {
    const gateway = StreamerbotGateway.getInstance();
    const status = gateway.getStreamerbotStatus();

    res.json(status);
  } catch (error) {
    expressError(res, error, "Failed to get Streamerbot status", { context: "[StreamerbotAPI]" });
  }
});

/**
 * GET /api/streamerbot-chat/history
 * Get recent chat messages from database (rolling buffer of 200 messages)
 */
router.get("/history", async (req, res) => {
  try {
    const chatRepo = ChatMessageRepository.getInstance();
    const messages = chatRepo.getStreamerbotChatMessages(200);

    // Return in chronological order (oldest first) for frontend consumption
    res.json({
      messages: messages.reverse(),
      count: messages.length,
    });
  } catch (error) {
    expressError(res, error, "Failed to fetch chat history", { context: "[StreamerbotAPI]" });
  }
});

/**
 * POST /api/streamerbot-chat/connect
 * Connect to Streamerbot and enable auto-reconnect
 */
router.post("/connect", async (req, res) => {
  try {
    const gateway = StreamerbotGateway.getInstance();
    const settingsService = SettingsService.getInstance();

    // Enable auto-connect for future restarts
    settingsService.setStreamerbotAutoConnect(true);

    // Connect now
    await gateway.connect();

    res.json({ success: true, message: "Connected to Streamer.bot" });
  } catch (error) {
    expressError(res, error, "Failed to connect to Streamer.bot", { context: "[StreamerbotAPI]" });
  }
});

/**
 * POST /api/streamerbot-chat/disconnect
 * Disconnect from Streamerbot and disable auto-reconnect
 */
router.post("/disconnect", async (req, res) => {
  try {
    const gateway = StreamerbotGateway.getInstance();

    // This also disables auto-connect
    await gateway.disconnect();

    res.json({ success: true, message: "Disconnected from Streamer.bot" });
  } catch (error) {
    expressError(res, error, "Failed to disconnect from Streamer.bot", { context: "[StreamerbotAPI]" });
  }
});

/**
 * POST /api/streamerbot-chat/send
 * Send a chat message via Streamerbot
 */
router.post("/send", async (req, res) => {
  try {
    const { platform, message } = req.body;

    // Validate platform
    const platformResult = chatPlatformSchema.safeParse(platform);
    if (!platformResult.success) {
      return res.status(400).json({ error: "Invalid platform. Must be 'twitch', 'youtube', or 'trovo'" });
    }

    // Validate message
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required and must be a string" });
    }

    const gateway = StreamerbotGateway.getInstance();

    if (!gateway.isConnected()) {
      return res.status(503).json({ error: "Not connected to Streamer.bot" });
    }

    await gateway.sendMessage(platformResult.data, message);

    res.json({ success: true, message: "Message sent" });
  } catch (error) {
    expressError(res, error, "Failed to send message", { context: "[StreamerbotAPI]" });
  }
});

/**
 * PUT /api/streamerbot-chat/settings
 * Update Streamerbot connection settings
 */
router.put("/settings", async (req, res) => {
  try {
    const { host, port, endpoint, scheme, password, autoConnect, autoReconnect } = req.body;
    const settingsService = SettingsService.getInstance();
    const gateway = StreamerbotGateway.getInstance();

    // Build settings object
    const settings: any = {};
    if (host !== undefined) settings.host = host;
    if (port !== undefined) settings.port = port;
    if (endpoint !== undefined) settings.endpoint = endpoint;
    if (scheme !== undefined) settings.scheme = scheme;
    if (password !== undefined) settings.password = password;
    if (autoConnect !== undefined) settings.autoConnect = autoConnect;
    if (autoReconnect !== undefined) settings.autoReconnect = autoReconnect;

    // Save to database
    settingsService.saveStreamerbotSettings(settings);

    // If currently connected, reconnect with new settings
    if (gateway.isConnected()) {
      await gateway.disconnect();
      await gateway.connect();
    }

    res.json({ success: true, message: "Settings updated" });
  } catch (error) {
    expressError(res, error, "Failed to update settings", { context: "[StreamerbotAPI]" });
  }
});

/**
 * DELETE /api/streamerbot-chat/settings
 * Clear Streamerbot settings and reset to defaults
 */
router.delete("/settings", async (req, res) => {
  try {
    const settingsService = SettingsService.getInstance();
    const gateway = StreamerbotGateway.getInstance();

    // Disconnect if connected
    if (gateway.isConnected()) {
      await gateway.disconnect();
    }

    settingsService.clearStreamerbotSettings();

    res.json({ success: true, message: "Settings cleared" });
  } catch (error) {
    expressError(res, error, "Failed to clear settings", { context: "[StreamerbotAPI]" });
  }
});

/**
 * GET /api/streamerbot-chat/settings
 * Get current Streamerbot connection settings
 */
router.get("/settings", async (req, res) => {
  try {
    const settingsService = SettingsService.getInstance();
    const settings = settingsService.getStreamerbotSettings();

    // Don't send password to client
    const { password, ...safeSettings } = settings;

    res.json({
      ...safeSettings,
      hasPassword: !!password,
    });
  } catch (error) {
    expressError(res, error, "Failed to get settings", { context: "[StreamerbotAPI]" });
  }
});

export default router;
