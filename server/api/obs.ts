/**
 * Backend API - OBS Control
 */
import { Router } from "express";
import { OBSConnectionManager } from "../../lib/adapters/obs/OBSConnectionManager";
import { OBSStateManager } from "../../lib/adapters/obs/OBSStateManager";
import { OBSSceneController } from "../../lib/adapters/obs/OBSSceneController";
import { createContextHandler } from "../utils/expressRouteHandler";

const router = Router();
const obsHandler = createContextHandler("[OBSAPI]");

/**
 * GET /api/obs/status
 * Get OBS connection status and current state
 */
router.get("/status", obsHandler(async (req, res) => {
  const obsManager = OBSConnectionManager.getInstance();
  const stateManager = OBSStateManager.getInstance();
  const state = stateManager.getState();

  res.json({
    connected: obsManager.isConnected(),
    ...state,
  });
}, "Failed to get OBS status"));

/**
 * POST /api/obs/connect
 * Connect to OBS
 */
router.post("/connect", obsHandler(async (req, res) => {
  const obsManager = OBSConnectionManager.getInstance();
  await obsManager.connect();

  const stateManager = OBSStateManager.getInstance();
  await stateManager.refreshState();

  res.json({ success: true, message: "Connected to OBS" });
}, "OBS connect failed"));

/**
 * POST /api/obs/disconnect
 * Disconnect from OBS
 */
router.post("/disconnect", obsHandler(async (req, res) => {
  const obsManager = OBSConnectionManager.getInstance();
  await obsManager.disconnect();

  res.json({ success: true, message: "Disconnected from OBS" });
}, "OBS disconnect failed"));

/**
 * POST /api/obs/reconnect
 * Manually trigger OBS reconnection
 */
router.post("/reconnect", obsHandler(async (req, res) => {
  const obsManager = OBSConnectionManager.getInstance();
  await obsManager.disconnect();
  await obsManager.connect();

  res.json({ success: true, message: "Reconnecting to OBS..." });
}, "OBS reconnect failed"));

const OBS_START_STOP_COMMANDS = {
  stream: { start: "StartStream", stop: "StopStream" },
  record: { start: "StartRecord", stop: "StopRecord" },
} as const;

function createStartStopHandler(type: keyof typeof OBS_START_STOP_COMMANDS) {
  const commands = OBS_START_STOP_COMMANDS[type];
  return obsHandler(async (req, res) => {
    const action: string | undefined = req.body.action;

    if (action !== "start" && action !== "stop") {
      return res.status(400).json({ error: "Invalid action. Use 'start' or 'stop'" });
    }

    const obs = OBSConnectionManager.getInstance().getOBS();
    await obs.call(commands[action]);

    res.json({ success: true });
  }, `${type} control failed`);
}

router.post("/stream", createStartStopHandler("stream"));
router.post("/record", createStartStopHandler("record"));

/**
 * POST /api/obs/scene
 * Switch to a different scene
 */
router.post("/scene", obsHandler(async (req, res) => {
  const { sceneName } = req.body;

  if (!sceneName) {
    return res.status(400).json({ error: "sceneName is required" });
  }

  const sceneController = OBSSceneController.getInstance();
  await sceneController.switchScene(sceneName);

  res.json({ success: true });
}, "Scene switch failed"));

/**
 * POST /api/obs/source/visibility
 * Toggle source visibility
 */
router.post("/source/visibility", obsHandler(async (req, res) => {
  const { sceneName, sourceName, visible } = req.body;

  if (!sceneName || !sourceName || visible === undefined) {
    return res.status(400).json({
      error: "sceneName, sourceName, and visible are required"
    });
  }

  const sceneController = OBSSceneController.getInstance();
  await sceneController.toggleSceneItemVisibility(sceneName, sourceName, visible);

  res.json({ success: true });
}, "Source visibility update failed"));

export default router;
