/**
 * Backend API - OBS Control
 */
import { Router } from "express";
import { OBSConnectionManager } from "../../lib/adapters/obs/OBSConnectionManager";
import { OBSStateManager } from "../../lib/adapters/obs/OBSStateManager";
import { OBSSceneController } from "../../lib/adapters/obs/OBSSceneController";
import { OBSSourceController } from "../../lib/adapters/obs/OBSSourceController";
import { expressError } from "../../lib/utils/apiError";

const router = Router();

/**
 * GET /api/obs/status
 * Get OBS connection status and current state
 */
router.get("/status", async (req, res) => {
  try {
    const obsManager = OBSConnectionManager.getInstance();
    const stateManager = OBSStateManager.getInstance();
    const state = stateManager.getState();

    res.json({
      connected: obsManager.isConnected(),
      ...state,
    });
  } catch (error) {
    expressError(res, error, "Failed to get OBS status", { context: "[OBSAPI]" });
  }
});

/**
 * POST /api/obs/reconnect
 * Manually trigger OBS reconnection
 */
router.post("/reconnect", async (req, res) => {
  try {
    const obsManager = OBSConnectionManager.getInstance();
    await obsManager.disconnect();
    await obsManager.connect();
    
    res.json({ success: true, message: "Reconnecting to OBS..." });
  } catch (error) {
    expressError(res, error, "OBS reconnect failed", { context: "[OBSAPI]" });
  }
});

/**
 * POST /api/obs/stream
 * Start/stop streaming
 */
router.post("/stream", async (req, res) => {
  try {
    const { action } = req.body;
    const connectionManager = OBSConnectionManager.getInstance();

    if (action === "start") {
      await connectionManager.getOBS().call("StartStream");
    } else if (action === "stop") {
      await connectionManager.getOBS().call("StopStream");
    } else {
      return res.status(400).json({ error: "Invalid action. Use 'start' or 'stop'" });
    }

    res.json({ success: true });
  } catch (error) {
    expressError(res, error, "Stream control failed", { context: "[OBSAPI]" });
  }
});

/**
 * POST /api/obs/record
 * Start/stop recording
 */
router.post("/record", async (req, res) => {
  try {
    const { action } = req.body;
    const connectionManager = OBSConnectionManager.getInstance();

    if (action === "start") {
      await connectionManager.getOBS().call("StartRecord");
    } else if (action === "stop") {
      await connectionManager.getOBS().call("StopRecord");
    } else {
      return res.status(400).json({ error: "Invalid action. Use 'start' or 'stop'" });
    }

    res.json({ success: true });
  } catch (error) {
    expressError(res, error, "Record control failed", { context: "[OBSAPI]" });
  }
});

/**
 * POST /api/obs/scene
 * Switch to a different scene
 */
router.post("/scene", async (req, res) => {
  try {
    const { sceneName } = req.body;
    
    if (!sceneName) {
      return res.status(400).json({ error: "sceneName is required" });
    }

    const sceneController = OBSSceneController.getInstance();
    await sceneController.switchScene(sceneName);

    res.json({ success: true });
  } catch (error) {
    expressError(res, error, "Scene switch failed", { context: "[OBSAPI]" });
  }
});

/**
 * POST /api/obs/source/visibility
 * Toggle source visibility
 */
router.post("/source/visibility", async (req, res) => {
  try {
    const { sceneName, sourceName, visible } = req.body;
    
    if (!sceneName || !sourceName || visible === undefined) {
      return res.status(400).json({ 
        error: "sceneName, sourceName, and visible are required" 
      });
    }

    const connectionManager = OBSConnectionManager.getInstance();
    await connectionManager.getOBS().call("SetSceneItemEnabled", {
      sceneName,
      sceneItemId: sourceName as any, // Will need scene item ID lookup
      sceneItemEnabled: visible
    });

    res.json({ success: true });
  } catch (error) {
    expressError(res, error, "Source visibility update failed", { context: "[OBSAPI]" });
  }
});

export default router;

