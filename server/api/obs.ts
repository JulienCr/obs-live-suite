/**
 * Backend API - OBS Control
 */
import { Router } from "express";
import { OBSConnectionManager } from "../../lib/adapters/obs/OBSConnectionManager";
import { OBSStateManager } from "../../lib/adapters/obs/OBSStateManager";
import { OBSSceneController } from "../../lib/adapters/obs/OBSSceneController";
import { OBSSourceController } from "../../lib/adapters/obs/OBSSourceController";

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
    console.error("[OBS] Status error:", error);
    res.status(500).json({ error: String(error) });
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
    console.error("[OBS] Reconnect error:", error);
    res.status(500).json({ error: String(error) });
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
      await connectionManager.call("StartStream");
    } else if (action === "stop") {
      await connectionManager.call("StopStream");
    } else {
      return res.status(400).json({ error: "Invalid action. Use 'start' or 'stop'" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[OBS] Stream control error:", error);
    res.status(500).json({ error: String(error) });
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
      await connectionManager.call("StartRecord");
    } else if (action === "stop") {
      await connectionManager.call("StopRecord");
    } else {
      return res.status(400).json({ error: "Invalid action. Use 'start' or 'stop'" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[OBS] Record control error:", error);
    res.status(500).json({ error: String(error) });
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
    console.error("[OBS] Scene switch error:", error);
    res.status(500).json({ error: String(error) });
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
    await connectionManager.call("SetSceneItemEnabled", {
      sceneName,
      sceneItemId: sourceName as any, // Will need scene item ID lookup
      sceneItemEnabled: visible
    });

    res.json({ success: true });
  } catch (error) {
    console.error("[OBS] Source visibility error:", error);
    res.status(500).json({ error: String(error) });
  }
});

export default router;

