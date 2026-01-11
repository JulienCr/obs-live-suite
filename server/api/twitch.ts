/**
 * Backend API - Twitch Integration
 *
 * Provides endpoints for Twitch stream info and management:
 * - GET /status - Current stream info (viewers, title, category, live status)
 * - POST /update - Update stream title and/or category
 * - GET /provider - Provider status (Streamer.bot vs Twitch API)
 * - GET /categories - Search for game categories
 * - POST /polling/start - Start polling
 * - POST /polling/stop - Stop polling
 * - DELETE /moderation/message - Delete a chat message
 * - POST /moderation/timeout - Timeout a user
 * - POST /moderation/ban - Ban a user
 */

import { Router } from "express";
import { TwitchService } from "../../lib/services/TwitchService";
import { TwitchUpdateParamsSchema } from "../../lib/models/Twitch";
import { expressError } from "../../lib/utils/apiError";

const router = Router();

/**
 * GET /api/twitch/status
 * Get current Twitch stream information
 */
router.get("/status", async (req, res) => {
  try {
    const service = TwitchService.getInstance();
    const streamInfo = await service.getStreamInfo();

    res.json({
      success: true,
      data: streamInfo,
      provider: service.getProviderStatus().activeProvider,
    });
  } catch (error) {
    expressError(res, error, "Failed to get Twitch stream info", { context: "[TwitchAPI]" });
  }
});

/**
 * POST /api/twitch/update
 * Update stream title and/or category
 */
router.post("/update", async (req, res) => {
  try {
    const parseResult = TwitchUpdateParamsSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request body",
        details: parseResult.error.flatten(),
      });
    }

    const params = parseResult.data;

    if (!params.title && !params.categoryId && !params.categoryName) {
      return res.status(400).json({
        success: false,
        error: "At least one of title, categoryId, or categoryName is required",
      });
    }

    const service = TwitchService.getInstance();
    await service.updateStreamInfo(params);

    // Return updated stream info
    const streamInfo = await service.getStreamInfo();

    res.json({
      success: true,
      message: "Stream info updated",
      data: streamInfo,
    });
  } catch (error) {
    expressError(res, error, "Failed to update stream info", { context: "[TwitchAPI]" });
  }
});

/**
 * GET /api/twitch/provider
 * Get current provider status
 */
router.get("/provider", async (req, res) => {
  try {
    const service = TwitchService.getInstance();
    const status = service.getProviderStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    expressError(res, error, "Failed to get provider status", { context: "[TwitchAPI]" });
  }
});

/**
 * GET /api/twitch/categories
 * Search for game/category by name
 */
router.get("/categories", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== "string") {
      return res.status(400).json({
        success: false,
        error: "Query parameter is required",
      });
    }

    const service = TwitchService.getInstance();
    const categories = await service.searchCategories(query);

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    expressError(res, error, "Failed to search categories", { context: "[TwitchAPI]" });
  }
});

/**
 * POST /api/twitch/polling/start
 * Start polling for stream info
 */
router.post("/polling/start", async (req, res) => {
  try {
    const service = TwitchService.getInstance();
    service.startPolling();

    res.json({
      success: true,
      message: "Polling started",
      data: service.getProviderStatus(),
    });
  } catch (error) {
    expressError(res, error, "Failed to start polling", { context: "[TwitchAPI]" });
  }
});

/**
 * POST /api/twitch/polling/stop
 * Stop polling for stream info
 */
router.post("/polling/stop", async (req, res) => {
  try {
    const service = TwitchService.getInstance();
    service.stopPolling();

    res.json({
      success: true,
      message: "Polling stopped",
      data: service.getProviderStatus(),
    });
  } catch (error) {
    expressError(res, error, "Failed to stop polling", { context: "[TwitchAPI]" });
  }
});

/**
 * POST /api/twitch/refresh
 * Force refresh of stream info and provider selection
 */
router.post("/refresh", async (req, res) => {
  try {
    const service = TwitchService.getInstance();
    service.refreshProviders();
    const streamInfo = await service.getStreamInfo();

    res.json({
      success: true,
      data: streamInfo,
      provider: service.getProviderStatus(),
    });
  } catch (error) {
    expressError(res, error, "Failed to refresh stream info", { context: "[TwitchAPI]" });
  }
});

/**
 * POST /api/twitch/auth/reload
 * Reload OAuth tokens from database
 * Call this after OAuth callback in Next.js to sync backend with new tokens
 */
router.post("/auth/reload", async (req, res) => {
  try {
    const service = TwitchService.getInstance();
    await service.reloadOAuth();

    const authStatus = service.getAuthStatus();

    res.json({
      success: true,
      message: "OAuth tokens reloaded from database",
      data: {
        isAuthenticated: authStatus.state === "authorized",
        user: authStatus.user?.login,
      },
    });
  } catch (error) {
    expressError(res, error, "Failed to reload OAuth tokens", { context: "[TwitchAPI]" });
  }
});

/**
 * DELETE /api/twitch/moderation/message
 * Delete a chat message by ID
 */
router.delete("/moderation/message", async (req, res) => {
  try {
    const { messageId } = req.query;

    console.log(`[TwitchAPI:Moderation] DELETE /moderation/message called`, {
      messageId,
      messageIdType: typeof messageId,
    });

    if (!messageId || typeof messageId !== "string") {
      return res.status(400).json({
        success: false,
        error: "messageId query parameter is required",
      });
    }

    const service = TwitchService.getInstance();
    const result = await service.deleteMessage(messageId);

    console.log(`[TwitchAPI:Moderation] Delete result:`, { messageId, result });

    res.json({
      success: result,
    });
  } catch (error) {
    console.error(`[TwitchAPI:Moderation] Delete error:`, error);
    expressError(res, error, "Failed to delete message", { context: "[TwitchAPI]" });
  }
});

/**
 * POST /api/twitch/moderation/timeout
 * Timeout a user in chat
 */
router.post("/moderation/timeout", async (req, res) => {
  try {
    const { userId, duration = 600, reason } = req.body;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({
        success: false,
        error: "userId is required in request body",
      });
    }

    const service = TwitchService.getInstance();
    await service.timeoutUser(userId, duration, reason);

    res.json({
      success: true,
    });
  } catch (error) {
    expressError(res, error, "Failed to timeout user", { context: "[TwitchAPI]" });
  }
});

/**
 * POST /api/twitch/moderation/ban
 * Ban a user from chat
 */
router.post("/moderation/ban", async (req, res) => {
  try {
    const { userId, reason } = req.body;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({
        success: false,
        error: "userId is required in request body",
      });
    }

    const service = TwitchService.getInstance();
    await service.banUser(userId, reason);

    res.json({
      success: true,
    });
  } catch (error) {
    expressError(res, error, "Failed to ban user", { context: "[TwitchAPI]" });
  }
});

export default router;
