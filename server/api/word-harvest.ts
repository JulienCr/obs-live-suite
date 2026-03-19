import { Router } from "express";
import { WordHarvestManager } from "../../lib/services/WordHarvestManager";
import { startGamePayloadSchema } from "../../lib/models/WordHarvest";
import { createSyncContextHandler } from "../utils/expressRouteHandler";

const router = Router();
const h = createSyncContextHandler("[WordHarvestAPI]");

function getManager(): WordHarvestManager {
  return WordHarvestManager.getInstance();
}

/**
 * GET /api/word-harvest/state
 * Get current word harvest state
 */
router.get("/state", h((_req, res) => {
  res.json(getManager().getState());
}, "Failed to get word harvest state"));

/**
 * POST /api/word-harvest/start
 * Start a new word harvest game
 */
router.post("/start", h((req, res) => {
  const manager = getManager();
  const parsed = startGamePayloadSchema.parse(req.body || {});
  manager.startGame(parsed.targetCount);
  res.json(manager.getState());
}, "Failed to start word harvest"));

/**
 * POST /api/word-harvest/stop
 * Stop the current word harvest game
 */
router.post("/stop", h((_req, res) => {
  const manager = getManager();
  manager.stopGame();
  res.json(manager.getState());
}, "Failed to stop word harvest"));

/**
 * POST /api/word-harvest/start-performing
 * Start the improv performance phase (regie manual trigger)
 */
router.post("/start-performing", h((_req, res) => {
  const manager = getManager();
  manager.startPerforming();
  res.json(manager.getState());
}, "Failed to start performing"));

/**
 * POST /api/word-harvest/finale
 * Trigger the finale animation (regie manual trigger after all words used)
 */
router.post("/finale", h((_req, res) => {
  getManager().triggerFinale();
  res.json({ ok: true });
}, "Failed to trigger finale"));

/**
 * POST /api/word-harvest/reset
 * Reset the word harvest game
 */
router.post("/reset", h((_req, res) => {
  getManager().resetGame();
  res.json({ ok: true });
}, "Failed to reset word harvest"));

/**
 * POST /api/word-harvest/approve/:wordId
 * Approve a pending word
 */
router.post("/approve/:wordId", h((req, res) => {
  const manager = getManager();
  manager.approveWord(req.params.wordId as string);
  res.json(manager.getState());
}, "Failed to approve word"));

/**
 * POST /api/word-harvest/reject/:wordId
 * Reject a pending word
 */
router.post("/reject/:wordId", h((req, res) => {
  const manager = getManager();
  manager.rejectWord(req.params.wordId as string);
  res.json(manager.getState());
}, "Failed to reject word"));

/**
 * POST /api/word-harvest/use/:wordId
 * Mark a word as used in improv
 */
router.post("/use/:wordId", h((req, res) => {
  const manager = getManager();
  manager.markWordUsed(req.params.wordId as string);
  res.json(manager.getState());
}, "Failed to mark word as used"));

/**
 * POST /api/word-harvest/unuse/:wordId
 * Unmark a word as used
 */
router.post("/unuse/:wordId", h((req, res) => {
  const manager = getManager();
  manager.unmarkWordUsed(req.params.wordId as string);
  res.json(manager.getState());
}, "Failed to unmark word"));

/**
 * POST /api/word-harvest/show
 * Show the word harvest overlay
 */
router.post("/show", h((_req, res) => {
  getManager().showOverlay();
  res.json({ ok: true });
}, "Failed to show overlay"));

/**
 * POST /api/word-harvest/hide
 * Hide the word harvest overlay
 */
router.post("/hide", h((_req, res) => {
  getManager().hideOverlay();
  res.json({ ok: true });
}, "Failed to hide overlay"));

export default router;
