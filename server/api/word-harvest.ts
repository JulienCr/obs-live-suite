import { Router } from "express";
import { WordHarvestManager } from "../../lib/services/WordHarvestManager";
import { expressError } from "../../lib/utils/apiError";
import { startGamePayloadSchema } from "../../lib/models/WordHarvest";

const router = Router();
const LOG_CONTEXT = "[WordHarvestAPI]";

function getManager(): WordHarvestManager {
  return WordHarvestManager.getInstance();
}

/**
 * GET /api/word-harvest/state
 * Get current word harvest state
 */
router.get("/state", (_req, res) => {
  try {
    res.json(getManager().getState());
  } catch (error) {
    expressError(res, error, "Failed to get word harvest state", { context: LOG_CONTEXT });
  }
});

/**
 * POST /api/word-harvest/start
 * Start a new word harvest game
 */
router.post("/start", (req, res) => {
  try {
    const manager = getManager();
    const parsed = startGamePayloadSchema.parse(req.body || {});
    manager.startGame(parsed.targetCount);
    res.json(manager.getState());
  } catch (error) {
    expressError(res, error, "Failed to start word harvest", { context: LOG_CONTEXT });
  }
});

/**
 * POST /api/word-harvest/stop
 * Stop the current word harvest game
 */
router.post("/stop", (_req, res) => {
  try {
    const manager = getManager();
    manager.stopGame();
    res.json(manager.getState());
  } catch (error) {
    expressError(res, error, "Failed to stop word harvest", { context: LOG_CONTEXT });
  }
});

/**
 * POST /api/word-harvest/start-performing
 * Start the improv performance phase (regie manual trigger)
 */
router.post("/start-performing", (_req, res) => {
  try {
    const manager = getManager();
    manager.startPerforming();
    res.json(manager.getState());
  } catch (error) {
    expressError(res, error, "Failed to start performing", { context: LOG_CONTEXT });
  }
});

/**
 * POST /api/word-harvest/finale
 * Trigger the finale animation (regie manual trigger after all words used)
 */
router.post("/finale", (_req, res) => {
  try {
    getManager().triggerFinale();
    res.json({ ok: true });
  } catch (error) {
    expressError(res, error, "Failed to trigger finale", { context: LOG_CONTEXT });
  }
});

/**
 * POST /api/word-harvest/reset
 * Reset the word harvest game
 */
router.post("/reset", (_req, res) => {
  try {
    getManager().resetGame();
    res.json({ ok: true });
  } catch (error) {
    expressError(res, error, "Failed to reset word harvest", { context: LOG_CONTEXT });
  }
});

/**
 * POST /api/word-harvest/approve/:wordId
 * Approve a pending word
 */
router.post("/approve/:wordId", (req, res) => {
  try {
    const manager = getManager();
    manager.approveWord(req.params.wordId);
    res.json(manager.getState());
  } catch (error) {
    expressError(res, error, "Failed to approve word", { context: LOG_CONTEXT });
  }
});

/**
 * POST /api/word-harvest/reject/:wordId
 * Reject a pending word
 */
router.post("/reject/:wordId", (req, res) => {
  try {
    const manager = getManager();
    manager.rejectWord(req.params.wordId);
    res.json(manager.getState());
  } catch (error) {
    expressError(res, error, "Failed to reject word", { context: LOG_CONTEXT });
  }
});

/**
 * POST /api/word-harvest/use/:wordId
 * Mark a word as used in improv
 */
router.post("/use/:wordId", (req, res) => {
  try {
    const manager = getManager();
    manager.markWordUsed(req.params.wordId);
    res.json(manager.getState());
  } catch (error) {
    expressError(res, error, "Failed to mark word as used", { context: LOG_CONTEXT });
  }
});

/**
 * POST /api/word-harvest/unuse/:wordId
 * Unmark a word as used
 */
router.post("/unuse/:wordId", (req, res) => {
  try {
    const manager = getManager();
    manager.unmarkWordUsed(req.params.wordId);
    res.json(manager.getState());
  } catch (error) {
    expressError(res, error, "Failed to unmark word", { context: LOG_CONTEXT });
  }
});

/**
 * POST /api/word-harvest/show
 * Show the word harvest overlay
 */
router.post("/show", (_req, res) => {
  try {
    getManager().showOverlay();
    res.json({ ok: true });
  } catch (error) {
    expressError(res, error, "Failed to show overlay", { context: LOG_CONTEXT });
  }
});

/**
 * POST /api/word-harvest/hide
 * Hide the word harvest overlay
 */
router.post("/hide", (_req, res) => {
  try {
    getManager().hideOverlay();
    res.json({ ok: true });
  } catch (error) {
    expressError(res, error, "Failed to hide overlay", { context: LOG_CONTEXT });
  }
});

export default router;
