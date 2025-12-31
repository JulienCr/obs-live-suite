/**
 * Backend API - Streamerbot Chat Gateway
 */
import { Router } from "express";
import { StreamerbotGateway } from "../../lib/adapters/streamerbot/StreamerbotGateway";
import { SettingsService } from "../../lib/services/SettingsService";
import { chatPlatformSchema } from "../../lib/models/StreamerbotChat";

const router = Router();

/**
 * GET /api/streamerbot-chat/status
 * Get Streamerbot gateway connection status
 */
router.get("/status", async (req, res) => {
  try {
    const gateway = StreamerbotGateway.getInstance();
    const status = gateway.getStatus();

    res.json(status);
  } catch (error) {
    console.error("[StreamerbotGateway] Status error:", error);
    res.status(500).json({ error: String(error) });
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
    console.error("[StreamerbotGateway] Connect error:", error);
    res.status(500).json({ error: String(error) });
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
    console.error("[StreamerbotGateway] Disconnect error:", error);
    res.status(500).json({ error: String(error) });
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
    console.error("[StreamerbotGateway] Send error:", error);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * PUT /api/streamerbot-chat/settings
 * Update Streamerbot connection settings
 */
router.put("/settings", async (req, res) => {
  try {
    const { host, port, endpoint, scheme, password } = req.body;
    const settingsService = SettingsService.getInstance();
    const gateway = StreamerbotGateway.getInstance();

    // Build settings object
    const settings: any = {};
    if (host !== undefined) settings.host = host;
    if (port !== undefined) settings.port = port;
    if (endpoint !== undefined) settings.endpoint = endpoint;
    if (scheme !== undefined) settings.scheme = scheme;
    if (password !== undefined) settings.password = password;

    // Save to database
    settingsService.saveStreamerbotSettings(settings);

    // If currently connected, reconnect with new settings
    if (gateway.isConnected()) {
      await gateway.disconnect();
      await gateway.connect();
    }

    res.json({ success: true, message: "Settings updated" });
  } catch (error) {
    console.error("[StreamerbotGateway] Settings update error:", error);
    res.status(500).json({ error: String(error) });
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
    console.error("[StreamerbotGateway] Get settings error:", error);
    res.status(500).json({ error: String(error) });
  }
});

export default router;
