/**
 * Backend API - Media Player Control
 *
 * Routes commands to Chrome extension media player drivers via WebSocket.
 */
import { Router } from "express";
import { MediaPlayerManager } from "../../lib/services/MediaPlayerManager";
import { MediaPlayerDriverId, MediaPlayerAction } from "../../lib/models/MediaPlayer";
import { createContextHandler } from "../utils/expressRouteHandler";

const router = Router();
const handler = createContextHandler("[MediaPlayerAPI]");
const manager = MediaPlayerManager.getInstance();

/**
 * POST /api/media-player/:driverId/:action
 * Send a command to a specific media player driver.
 */
router.post("/:driverId/:action", handler(async (req, res) => {
  const { driverId, action } = req.params;

  // Validate driverId
  const driverResult = MediaPlayerDriverId.safeParse(driverId);
  if (!driverResult.success) {
    return res.status(400).json({ error: `Invalid driver: "${driverId}". Valid: ${MediaPlayerDriverId.options.join(", ")}` });
  }

  // Validate action
  const actionResult = MediaPlayerAction.safeParse(action);
  if (!actionResult.success) {
    return res.status(400).json({ error: `Invalid action: "${action}". Valid: ${MediaPlayerAction.options.join(", ")}` });
  }

  const result = await manager.sendCommand(driverResult.data, actionResult.data);

  if (!result.success) {
    return res.status(502).json({ ok: false, error: result.error });
  }

  res.json({ ok: true, data: result.data });
}, "Media player command failed"));

/**
 * GET /api/media-player/status
 * Get status of all registered drivers.
 */
router.get("/status", handler(async (_req, res) => {
  res.json({ ok: true, drivers: manager.getAllDriverStatus() });
}, "Failed to get media player status"));

/**
 * GET /api/media-player/:driverId/status
 * Get status of a specific driver.
 */
router.get("/:driverId/status", handler(async (req, res) => {
  const driverResult = MediaPlayerDriverId.safeParse(req.params.driverId);
  if (!driverResult.success) {
    return res.status(400).json({ error: `Invalid driver: "${req.params.driverId}"` });
  }

  const status = manager.getDriverStatus(driverResult.data);
  res.json({ ok: true, ...status });
}, "Failed to get driver status"));

export default router;
