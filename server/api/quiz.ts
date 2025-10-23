import { Router } from "express";
import { QuizManager } from "../../lib/services/QuizManager";
import { QuizStore } from "../../lib/services/QuizStore";

const router = Router();
const manager = QuizManager.getInstance();
const store = QuizStore.getInstance();

router.post("/round/start", async (req, res) => {
  try {
    const { roundIndex } = req.body || {};
    await manager.startRound(Number(roundIndex || 0));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post("/round/end", async (_req, res) => {
  try {
    await manager.endRound();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post("/question/show", async (_req, res) => {
  try {
    await manager.showCurrentQuestion();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post("/question/lock", async (_req, res) => {
  try {
    await manager.lockAnswers();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post("/question/reveal", async (_req, res) => {
  try {
    await manager.reveal();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Manually apply winners (closest/open questions)
router.post("/question/winners", async (req, res) => {
  try {
    const { playerIds, points, remove } = req.body || {};
    await manager.applyWinners(Array.isArray(playerIds) ? playerIds : [], { points: Number(points ?? NaN), remove: Boolean(remove) });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post("/question/next", async (_req, res) => {
  try {
    await manager.nextQuestion();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post("/question/prev", async (_req, res) => {
  try {
    await manager.prevQuestion();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post("/question/reset", async (_req, res) => {
  try {
    await manager.resetQuestion();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post("/question/select", async (req, res) => {
  try {
    const { questionId } = req.body || {};
    await manager.selectQuestion(String(questionId));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post("/viewer-input/toggle", async (_req, res) => {
  try {
    const sess = store.getSession();
    if (sess) {
      // TODO: add viewerInputEnabled field to session
      // For now, just return success
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post("/scorepanel/toggle", async (_req, res) => {
  try {
    await manager.toggleScorePanel();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Zoom controls
router.post("/media/zoom/start", async (_req, res) => {
  try { await manager.zoomStart(); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/media/zoom/stop", async (_req, res) => {
  try { await manager.zoomStop(); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/media/zoom/resume", async (_req, res) => {
  try { await manager.zoomResume(); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/media/zoom/step", async (req, res) => {
  try { await manager.zoomStep(Number(req.body?.delta || 1)); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: String(e) }); }
});

// Mystery image controls
router.post("/media/mystery/start", async (req, res) => {
  try { 
    const { totalSquares } = req.body || {};
    await manager.mysteryStart(Number(totalSquares || 100)); 
    res.json({ success: true }); 
  }
  catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/media/mystery/stop", async (_req, res) => {
  try { await manager.mysteryStop(); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/media/mystery/resume", async (_req, res) => {
  try { await manager.mysteryResume(); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/media/mystery/step", async (req, res) => {
  try { await manager.mysteryStep(Number(req.body?.count || 1)); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/media/mystery/state", async (_req, res) => {
  try { res.json(manager.getMysteryState()); }
  catch (e) { res.status(500).json({ error: String(e) }); }
});

// Buzzer controls
router.post("/buzzer/hit", async (req, res) => {
  try { const { playerId } = req.body || {}; const r = manager.buzzerHit(String(playerId)); res.json({ success: true, ...r }); }
  catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/buzzer/lock", async (_req, res) => {
  try { await manager.buzzerLock(); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/buzzer/release", async (_req, res) => {
  try { await manager.buzzerRelease(); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/config", async (req, res) => {
  try {
    const sess = store.getSession() || store.createDefaultSession();
    sess.config = { ...sess.config, ...(req.body || {}) } as any;
    store.setSession(sess);
    res.json({ success: true, config: sess.config });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get("/state", async (_req, res) => {
  try {
    const timerState = manager.getTimerState();
    res.json({
      phase: manager.getPhase(),
      session: manager.getSession(),
      timer: timerState,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post("/player/answer", async (req, res) => {
  try {
    const { playerId, option, text, value } = req.body || {};
    await manager.submitPlayerAnswer(String(playerId), option, text, value);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Scores & timer
router.post("/score/update", async (req, res) => {
  try {
    const { target, id, delta } = req.body || {};
    const sess = store.getSession() || store.createDefaultSession();
    let total = 0;
    if (target === "player") total = store.addScorePlayer(String(id), Number(delta || 0));
    else total = store.addScoreViewer(String(id), Number(delta || 0));

    // Broadcast score update so host/overlay refresh without reload
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
      // Non-fatal: logging only
      console.error("Failed to broadcast score.update", e);
    }

    res.json({ success: true, total });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post("/timer/add", async (req, res) => {
  try { await manager.timerAdd(Number(req.body?.delta || 0)); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/timer/resume", async (_req, res) => {
  try { await manager.timerResume(); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/timer/stop", async (_req, res) => {
  try { await manager.timerStop(); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/session/save", async (req, res) => {
  try {
    const id = req.body?.id as string | undefined;
    const path = await store.saveToFile(id);
    res.json({ success: true, path });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post("/session/load", async (req, res) => {
  try {
    const fileId = req.body?.id as string;
    const session = await store.loadFromFile(fileId);
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post("/session/reset", async (_req, res) => {
  try {
    const session = store.createDefaultSession();
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post("/session/load-example", async (_req, res) => {
  try {
    const { createExampleSession } = await import("../../lib/services/QuizExamples");
    const example = createExampleSession();
    const session = store.createDefaultSession();
    Object.assign(session, example);
    store.setSession(session);
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// List all saved sessions
router.get("/sessions", async (_req, res) => {
  try {
    const sessions = await store.listSessions();
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Update session metadata (title, etc)
router.put("/session/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const session = await store.updateSessionMetadata(id, req.body);
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Delete a session
router.delete("/session/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await store.deleteSession(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Question CRUD
router.get("/questions", (_req, res) => {
  try {
    const questions = store.getAllQuestions();
    res.json({ questions });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post("/questions", (req, res) => {
  try {
    const question = store.createQuestion(req.body);
    res.json({ success: true, question });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.put("/questions/:id", (req, res) => {
  try {
    const { id } = req.params;
    const question = store.updateQuestion(id, req.body);
    res.json({ success: true, question });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.delete("/questions/:id", (req, res) => {
  try {
    const { id } = req.params;
    store.deleteQuestion(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Bulk import questions
router.post("/questions/bulk", (req, res) => {
  try {
    const { questions } = req.body;
    
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "Invalid request: 'questions' array is required" });
    }

    const imported: any[] = [];
    const errors: any[] = [];

    questions.forEach((q, idx) => {
      try {
        const question = store.createQuestion(q);
        imported.push(question);
      } catch (error) {
        errors.push({ row: idx + 1, error: String(error) });
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({ 
        error: "Some questions failed to import", 
        imported: imported.length,
        errors 
      });
    }

    res.json({ success: true, imported: imported.length, questions: imported });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Session creation from builder
router.post("/session/create", (req, res) => {
  try {
    const { name, players, rounds } = req.body;
    const session = store.createDefaultSession();
    session.id = req.body.id || session.id;
    session.title = name || "Quiz Session";
    // Note: phase is managed by QuizManager, not stored in session
    session.currentRoundIndex = 0;
    session.currentQuestionIndex = 0;
    session.rounds = rounds;
    
    // Set players array
    if (players && Array.isArray(players)) {
      session.players = players.map((p: any) => {
        const player: any = {
          id: p.id,
          displayName: p.name, // Map 'name' from builder to 'displayName' for schema
          buzzerId: p.buzzerId,
        };
        // Only include avatarUrl if it has a value (not null/undefined)
        if (p.avatar) {
          player.avatarUrl = p.avatar;
        }
        return player;
      });
      
      // Initialize scores for each player
      players.forEach((p: any) => {
        session.scores.players[p.id] = 0;
      });
    }
    
    store.setSession(session);
    res.json({ success: true, session });
  } catch (error) {
    console.error("Session create error:", error);
    res.status(500).json({ error: String(error) });
  }
});

// Update full session content (players, rounds, questions)
router.post("/session/:id/update", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, players, rounds } = req.body;
    
    // Load existing session from file
    const session = await store.loadFromFile(id);
    
    // Update fields
    if (name) session.title = name;
    if (rounds) session.rounds = rounds;
    
    if (players && Array.isArray(players)) {
      session.players = players.map((p: any) => {
        const player: any = {
          id: p.id,
          displayName: p.name || p.displayName,
          buzzerId: p.buzzerId,
        };
        if (p.avatar || p.avatarUrl) {
          player.avatarUrl = p.avatar || p.avatarUrl;
        }
        return player;
      });
      
      // Update scores - preserve existing scores, add zeros for new players
      const newScores: any = {};
      players.forEach((p: any) => {
        newScores[p.id] = session.scores?.players?.[p.id] || 0;
      });
      session.scores.players = newScores;
    }
    
    // Update in memory first (so saveToFile saves the updated version)
    store.setSession(session);
    
    // Save to disk
    await store.saveToFile(id);
    
    res.json({ success: true, session });
  } catch (error) {
    console.error("Session update error:", error);
    res.status(500).json({ error: String(error) });
  }
});

export default router;


