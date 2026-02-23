import { Router } from "express";
import { QuizManager } from "../../lib/services/QuizManager";
import { QuizStore } from "../../lib/services/QuizStore";
import { quizConfigSchema } from "../../lib/models/Quiz";
import { createContextHandler, createSyncContextHandler } from "../utils/expressRouteHandler";

const router = Router();
const manager = QuizManager.getInstance();
const store = QuizStore.getInstance();

// Create contextualized handlers for this API
const quizHandler = createContextHandler("[QuizAPI]");
const quizSyncHandler = createSyncContextHandler("[QuizAPI]");

// Round controls
router.post("/round/start", quizHandler(async (req, _res) => {
  const { roundIndex } = req.body || {};
  await manager.startRound(Number(roundIndex || 0));
  _res.json({ success: true });
}, "Failed to start round"));

router.post("/round/end", quizHandler(async (_req, res) => {
  await manager.endRound();
  res.json({ success: true });
}, "Failed to end round"));

// Question controls
router.post("/question/show", quizHandler(async (_req, res) => {
  await manager.showCurrentQuestion();
  res.json({ success: true });
}, "Failed to show question"));

router.post("/question/lock", quizHandler(async (_req, res) => {
  await manager.lockAnswers();
  res.json({ success: true });
}, "Failed to lock answers"));

router.post("/question/reveal", quizHandler(async (_req, res) => {
  await manager.reveal();
  res.json({ success: true });
}, "Failed to reveal answer"));

router.post("/question/winners", quizHandler(async (req, res) => {
  const { playerIds, points, remove } = req.body || {};
  await manager.applyWinners(
    Array.isArray(playerIds) ? playerIds : [],
    { points: Number(points ?? NaN), remove: Boolean(remove) }
  );
  res.json({ success: true });
}, "Failed to apply winners"));

router.post("/question/next", quizHandler(async (_req, res) => {
  await manager.nextQuestion();
  res.json({ success: true });
}, "Failed to go to next question"));

router.post("/question/prev", quizHandler(async (_req, res) => {
  await manager.prevQuestion();
  res.json({ success: true });
}, "Failed to go to previous question"));

router.post("/question/reset", quizHandler(async (_req, res) => {
  await manager.resetQuestion();
  res.json({ success: true });
}, "Failed to reset question"));

router.post("/question/select", quizHandler(async (req, res) => {
  const { questionId } = req.body || {};
  await manager.selectQuestion(String(questionId));
  res.json({ success: true });
}, "Failed to select question"));

// Viewer input & score panel
router.post("/viewer-input/toggle", quizHandler(async (_req, res) => {
  const sess = store.getSession();
  if (sess) {
    // TODO: add viewerInputEnabled field to session
  }
  res.json({ success: true });
}, "Failed to toggle viewer input"));

router.post("/scorepanel/toggle", quizHandler(async (_req, res) => {
  await manager.toggleScorePanel();
  res.json({ success: true });
}, "Failed to toggle score panel"));

// Zoom controls
router.post("/media/zoom/start", quizHandler(async (_req, res) => {
  await manager.zoomStart();
  res.json({ success: true });
}, "Failed to start zoom"));

router.post("/media/zoom/stop", quizHandler(async (_req, res) => {
  await manager.zoomStop();
  res.json({ success: true });
}, "Failed to stop zoom"));

router.post("/media/zoom/resume", quizHandler(async (_req, res) => {
  await manager.zoomResume();
  res.json({ success: true });
}, "Failed to resume zoom"));

router.post("/media/zoom/step", quizHandler(async (req, res) => {
  await manager.zoomStep(Number(req.body?.delta || 1));
  res.json({ success: true });
}, "Failed to step zoom"));

// Mystery image controls
router.post("/media/mystery/start", quizHandler(async (req, res) => {
  const { totalSquares } = req.body || {};
  await manager.mysteryStart(Number(totalSquares || 100));
  res.json({ success: true });
}, "Failed to start mystery"));

router.post("/media/mystery/stop", quizHandler(async (_req, res) => {
  await manager.mysteryStop();
  res.json({ success: true });
}, "Failed to stop mystery"));

router.post("/media/mystery/resume", quizHandler(async (_req, res) => {
  await manager.mysteryResume();
  res.json({ success: true });
}, "Failed to resume mystery"));

router.post("/media/mystery/step", quizHandler(async (req, res) => {
  await manager.mysteryStep(Number(req.body?.count || 1));
  res.json({ success: true });
}, "Failed to step mystery"));

router.get("/media/mystery/state", quizHandler(async (_req, res) => {
  res.json(manager.getMysteryState());
}, "Failed to get mystery state"));

// Buzzer controls
router.post("/buzzer/hit", quizHandler(async (req, res) => {
  const { playerId } = req.body || {};
  const r = manager.buzzerHit(String(playerId));
  res.json({ success: true, ...r });
}, "Failed to register buzzer hit"));

router.post("/buzzer/lock", quizHandler(async (_req, res) => {
  await manager.buzzerLock();
  res.json({ success: true });
}, "Failed to lock buzzer"));

router.post("/buzzer/release", quizHandler(async (_req, res) => {
  await manager.buzzerRelease();
  res.json({ success: true });
}, "Failed to release buzzer"));

// Config
router.post("/config", quizHandler(async (req, res) => {
  // Validate partial config update using quizConfigSchema.partial()
  const partialConfigSchema = quizConfigSchema.partial();
  const parseResult = partialConfigSchema.safeParse(req.body || {});

  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid config data",
      details: parseResult.error.flatten().fieldErrors,
    });
  }

  const sess = store.getSession() || store.createDefaultSession();
  // Deep merge for nested objects like time_defaults and viewers
  const validatedData = parseResult.data;
  sess.config = {
    ...sess.config,
    ...validatedData,
    time_defaults: {
      ...sess.config.time_defaults,
      ...(validatedData.time_defaults || {}),
    },
    viewers: {
      ...sess.config.viewers,
      ...(validatedData.viewers || {}),
    },
  };
  store.setSession(sess);
  res.json({ success: true, config: sess.config });
}, "Failed to update config"));

// State
router.get("/state", quizHandler(async (_req, res) => {
  const timerState = manager.getTimerState();
  res.json({
    phase: manager.getPhase(),
    session: manager.getSession(),
    timer: timerState,
  });
}, "Failed to get state"));

// Player answer
router.post("/player/answer", quizHandler(async (req, res) => {
  const { playerId, option, text, value } = req.body || {};
  await manager.submitPlayerAnswer(String(playerId), option, text, value);
  res.json({ success: true });
}, "Failed to submit player answer"));

// Score & timer
router.post("/score/update", quizHandler(async (req, res) => {
  const { target, id, delta } = req.body || {};
  let total = 0;
  if (target === "player") {
    total = store.addScorePlayer(String(id), Number(delta || 0));
  } else {
    total = store.addScoreViewer(String(id), Number(delta || 0));
  }

  // Broadcast score update so host/overlay refresh without reload
  let broadcastSuccess = true;
  try {
    const { ChannelManager } = await import("../../lib/services/ChannelManager");
    const { OverlayChannel } = await import("../../lib/models/OverlayEvents");
    const channel = ChannelManager.getInstance();
    await channel.publish(OverlayChannel.QUIZ, "score.update", {
      user_id: String(id),
      delta: Number(delta || 0),
      total,
    });
  } catch (e) {
    console.error("[QuizAPI] Failed to broadcast score.update", e);
    broadcastSuccess = false;
  }

  res.json({
    success: true,
    total,
    warning: broadcastSuccess ? undefined : "Score updated but overlay notification failed",
  });
}, "Failed to update score"));

router.post("/timer/add", quizHandler(async (req, res) => {
  await manager.timerAdd(Number(req.body?.delta || 0));
  res.json({ success: true });
}, "Failed to add timer time"));

router.post("/timer/resume", quizHandler(async (_req, res) => {
  await manager.timerResume();
  res.json({ success: true });
}, "Failed to resume timer"));

router.post("/timer/stop", quizHandler(async (_req, res) => {
  await manager.timerStop();
  res.json({ success: true });
}, "Failed to stop timer"));

// Session management
router.post("/session/save", quizHandler(async (req, res) => {
  const id = req.body?.id as string | undefined;
  const path = await store.saveToFile(id);
  res.json({ success: true, path });
}, "Failed to save session"));

router.post("/session/load", quizHandler(async (req, res) => {
  const fileId = req.body?.id as string;
  const session = await store.loadFromFile(fileId);
  res.json({ success: true, session });
}, "Failed to load session"));

router.post("/session/reset", quizHandler(async (_req, res) => {
  const session = store.createDefaultSession();
  res.json({ success: true, session });
}, "Failed to reset session"));

router.post("/session/load-example", quizHandler(async (_req, res) => {
  const { createExampleSession } = await import("../../lib/services/QuizExamples");
  const example = createExampleSession();
  const session = store.createDefaultSession();
  Object.assign(session, example);
  store.setSession(session);
  res.json({ success: true, session });
}, "Failed to load example session"));

router.get("/sessions", quizHandler(async (_req, res) => {
  const sessions = await store.listSessions();
  res.json({ sessions });
}, "Failed to list sessions"));

router.put("/session/:id", quizHandler(async (req, res) => {
  const id = req.params.id as string;
  const session = await store.updateSessionMetadata(id, req.body);
  res.json({ success: true, session });
}, "Failed to update session metadata"));

router.delete("/session/:id", quizHandler(async (req, res) => {
  const id = req.params.id as string;
  await store.deleteSession(id);
  res.json({ success: true });
}, "Failed to delete session"));

// Question CRUD (async handlers - saves are awaited)
router.get("/questions", quizSyncHandler((_req, res) => {
  const questions = store.getAllQuestions();
  res.json({ questions });
}, "Failed to get questions"));

router.post("/questions", quizHandler(async (req, res) => {
  const question = await store.createQuestion(req.body);
  res.json({ success: true, question });
}, "Failed to create question"));

router.put("/questions/:id", quizHandler(async (req, res) => {
  const id = req.params.id as string;
  const question = await store.updateQuestion(id, req.body);
  res.json({ success: true, question });
}, "Failed to update question"));

router.delete("/questions/:id", quizHandler(async (req, res) => {
  const id = req.params.id as string;
  await store.deleteQuestion(id);
  res.json({ success: true });
}, "Failed to delete question"));

// Bulk import (uses batch method for single save)
router.post("/questions/bulk", quizHandler(async (req, res) => {
  const { questions } = req.body;

  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: "Invalid request: 'questions' array is required" });
  }

  const imported = await store.createQuestions(questions);
  res.json({ success: true, imported: imported.length, questions: imported });
}, "Failed to bulk import questions"));

// Session creation from builder
router.post("/session/create", quizSyncHandler((req, res) => {
  const { name, players, rounds } = req.body;
  const session = store.createDefaultSession();
  session.id = req.body.id || session.id;
  session.title = name || "Quiz Session";
  session.currentRoundIndex = 0;
  session.currentQuestionIndex = 0;
  session.rounds = rounds;

  if (players && Array.isArray(players)) {
    session.players = players.map((p: { id: string; name?: string; displayName?: string; buzzerId?: string; avatar?: string; avatarUrl?: string }) => {
      const player: { id: string; displayName: string; buzzerId?: string; avatarUrl?: string } = {
        id: p.id,
        displayName: p.name || p.displayName || "",
        buzzerId: p.buzzerId,
      };
      if (p.avatar || p.avatarUrl) {
        player.avatarUrl = p.avatar || p.avatarUrl;
      }
      return player;
    });

    players.forEach((p: { id: string }) => {
      session.scores.players[p.id] = 0;
    });
  }

  store.setSession(session);
  res.json({ success: true, session });
}, "Failed to create session"));

// Update session content
router.post("/session/:id/update", quizHandler(async (req, res) => {
  const id = req.params.id as string;
  const { name, players, rounds } = req.body;

  const session = await store.loadFromFile(id);

  if (name) session.title = name;
  if (rounds) session.rounds = rounds;

  if (players && Array.isArray(players)) {
    session.players = players.map((p: { id: string; name?: string; displayName?: string; buzzerId?: string; avatar?: string; avatarUrl?: string }) => {
      const player: { id: string; displayName: string; buzzerId?: string; avatarUrl?: string } = {
        id: p.id,
        displayName: p.name || p.displayName || "",
        buzzerId: p.buzzerId,
      };
      if (p.avatar || p.avatarUrl) {
        player.avatarUrl = p.avatar || p.avatarUrl;
      }
      return player;
    });

    const newScores: Record<string, number> = {};
    players.forEach((p: { id: string }) => {
      newScores[p.id] = session.scores?.players?.[p.id] || 0;
    });
    session.scores.players = newScores;
  }

  store.setSession(session);
  await store.saveToFile(id);

  res.json({ success: true, session });
}, "Failed to update session"));

export default router;
