import { ChannelManager } from "./ChannelManager";
import { OverlayChannel } from "../models/OverlayEvents";
import { Logger } from "../utils/Logger";
import { QuizScoringService } from "./QuizScoringService";
import { QuizStore } from "./QuizStore";
import { Session, Question } from "../models/Quiz";
import { QuizZoomController } from "./QuizZoomController";
import { QuizMysteryImageController } from "./QuizMysteryImageController";
import { QuizBuzzerService } from "./QuizBuzzerService";
import { QuizTimer } from "./QuizTimer";
import { QUIZ, BUZZER } from "../config/Constants";

export type QuizPhase =
  | "idle"
  | "show_question"
  | "accept_answers"
  | "lock"
  | "reveal"
  | "score_update"
  | "interstitial";

/**
 * Orchestrates quiz state transitions and broadcasts quiz events.
 */
export class QuizManager {
  private static instance: QuizManager;
  private logger: Logger;
  private channel: ChannelManager;
  private store: QuizStore;
  private scoring: QuizScoringService;
  private phase: QuizPhase = "idle";
  private timer = new QuizTimer();

  private constructor() {
    this.logger = new Logger("QuizManager");
    this.channel = ChannelManager.getInstance();
    this.store = QuizStore.getInstance();
    const cfg = this.store.getSession()?.config || this.store.createDefaultSession().config;
    this.scoring = new QuizScoringService(cfg.closest_k);
    
    // ===== ZOOM CONFIGURATION =====
    // Easy to adjust: just set duration and max zoom level
    // Steps and interval are auto-calculated for smooth animation
    this.zoom = new QuizZoomController({
      durationSeconds: QUIZ.ZOOM_DURATION_SECONDS,
      maxZoom: QUIZ.ZOOM_MAX_LEVEL,
      fps: QUIZ.ZOOM_FPS,
    });

    this.mystery = new QuizMysteryImageController({ intervalMs: QUIZ.MYSTERY_IMAGE_INTERVAL_MS });
    this.buzzer = new QuizBuzzerService({
      lockMs: BUZZER.LOCK_DELAY_MS,
      steal: false,
      stealWindowMs: BUZZER.STEAL_WINDOW_MS
    });
  }

  static getInstance(): QuizManager {
    if (!QuizManager.instance) QuizManager.instance = new QuizManager();
    return QuizManager.instance;
  }

  getPhase(): QuizPhase { return this.phase; }
  getSession(): Session | null { return this.store.getSession(); }

  async startRound(roundIndex: number): Promise<void> {
    const sess = this.requireSession();
    sess.currentRoundIndex = roundIndex;
    sess.currentQuestionIndex = 0;
    await this.channel.publish(OverlayChannel.QUIZ, "quiz.start_round", { round_id: sess.rounds[roundIndex]?.id });
  }

  async endRound(): Promise<void> {
    await this.channel.publish(OverlayChannel.QUIZ, "quiz.end_round", {});
  }

  async showCurrentQuestion(): Promise<void> {
    const q = this.getCurrentQuestion();
    const sess = this.requireSession();
    
    // Reset mystery reveal state
    this.mystery.reset();
    // Reset zoom state
    this.zoom.reset();
    
    // Clear player answers for new question
    sess.playerAnswers = {};
    this.store.setSession(sess);
    
    // Clear viewer votes for new question
    try {
      const { resetViewerInputs } = await import("../../server/api/quiz-bot");
      resetViewerInputs();
      // Emit empty vote counts to reset UI
      await this.channel.publish(OverlayChannel.QUIZ, "vote.update", {
        counts: { A: 0, B: 0, C: 0, D: 0 },
        percentages: { A: 0, B: 0, C: 0, D: 0 },
      });
    } catch (error) {
      this.logger.error("showCurrentQuestion: Failed to reset viewer inputs", error);
    }

    this.phase = "show_question";
    
    // Send zoom config with question so overlay can initialize with correct values
    const zoomConfig = this.zoom.getInternalConfig();
    await this.channel.publish(OverlayChannel.QUIZ, "question.show", { 
      question_id: q.id,
      zoom_steps: zoomConfig.steps,
      zoom_maxZoom: zoomConfig.maxZoom
    });
    
    this.phase = "accept_answers";
    await this.emitPhaseUpdate();
    await this.timer.start(q.time_s || QUIZ.DEFAULT_TIMER_SECONDS, this.phase);
  }

  async lockAnswers(): Promise<void> {
    const q = this.getCurrentQuestion();
    this.phase = "lock";
    await this.channel.publish(OverlayChannel.QUIZ, "question.lock", { question_id: q.id });
    await this.emitPhaseUpdate();
    await this.timer.pause();
  }

  async reveal(): Promise<void> {
    const q = this.getCurrentQuestion();
    const sess = this.requireSession();
    
    // Stop the timer if it's still running (in case lock was skipped)
    await this.timer.stop();
    
    // Stop any running mystery reveal
    if (q.mode === "mystery_image") {
      await this.mystery.stop();
    }
    
    // Stop zoom and fully reveal image
    if (q.mode === "image_zoombuzz" || (q.type === "closest" && q.media)) {
      await this.zoom.stop();
      // Send zoom completion event to set scale to 1x
      const zoomConfig = this.zoom.getInternalConfig();
      await this.channel.publish(OverlayChannel.QUIZ, "zoom.complete", { 
        total: zoomConfig.steps,
        maxZoom: zoomConfig.maxZoom
      });
    }
    
    // Transition to reveal phase
    this.phase = "reveal";
    await this.channel.publish(OverlayChannel.QUIZ, "question.reveal", { question_id: q.id, correct: q.correct });
    await this.emitPhaseUpdate();
    
    // Apply auto-scoring for studio players
    await this.applyScoring(q, sess);
    
    // Emit the revealed event after scoring
    await this.channel.publish(OverlayChannel.QUIZ, "question.revealed", {
      question_id: q.id,
      correct: q.correct!,
      scores_applied: true,
    });
    
    this.phase = "score_update";
    await this.emitPhaseUpdate();
    
    // Emit leaderboard update
    await this.updateLeaderboard(sess);
    
    // Mark question as finished
    await this.channel.publish(OverlayChannel.QUIZ, "question.finished", { question_id: q.id });
    
    // Check if there's a next question
    const round = sess.rounds[sess.currentRoundIndex];
    if (round && sess.currentQuestionIndex + 1 < round.questions.length) {
      const nextQ = round.questions[sess.currentQuestionIndex + 1];
      await this.channel.publish(OverlayChannel.QUIZ, "question.next_ready", { next_id: nextQ.id });
    }
  }

  async nextQuestion(): Promise<void> {
    const sess = this.requireSession();
    const round = sess.rounds[sess.currentRoundIndex];
    if (!round) return;
    if (sess.currentQuestionIndex + 1 < round.questions.length) {
      sess.currentQuestionIndex += 1;
      this.phase = "idle";
      await this.timer.stop();
      
      // Clear previous question's data
      sess.playerAnswers = {};
      this.store.setSession(sess);
      
      // Clear viewer votes
      try {
        const { resetViewerInputs } = await import("../../server/api/quiz-bot");
        resetViewerInputs();
      } catch (error) {
        this.logger.error("nextQuestion: Failed to reset viewer inputs", error);
      }

      // Emit question change to clear UI state
      const nextQ = round.questions[sess.currentQuestionIndex];
      await this.channel.publish(OverlayChannel.QUIZ, "question.change", { 
        question_id: nextQ.id,
        clear_assignments: true 
      });
    }
  }
  
  async prevQuestion(): Promise<void> {
    const sess = this.requireSession();
    const round = sess.rounds[sess.currentRoundIndex];
    if (!round) return;
    if (sess.currentQuestionIndex > 0) {
      sess.currentQuestionIndex -= 1;
      this.phase = "idle";
      await this.timer.stop();
      
      // Clear previous question's data
      sess.playerAnswers = {};
      this.store.setSession(sess);
      
      // Clear viewer votes
      try {
        const { resetViewerInputs } = await import("../../server/api/quiz-bot");
        resetViewerInputs();
      } catch (error) {
        this.logger.error("prevQuestion: Failed to reset viewer inputs", error);
      }

      // Emit question change to clear UI state
      const prevQ = round.questions[sess.currentQuestionIndex];
      await this.channel.publish(OverlayChannel.QUIZ, "question.change", { 
        question_id: prevQ.id,
        clear_assignments: true 
      });
    }
  }
  
  async selectQuestion(questionId: string): Promise<void> {
    const sess = this.requireSession();
    const round = sess.rounds[sess.currentRoundIndex];
    if (!round) return;
    
    const qIdx = round.questions.findIndex(q => q.id === questionId);
    if (qIdx >= 0) {
      sess.currentQuestionIndex = qIdx;
      this.phase = "idle";
      await this.timer.stop();
      
      // Clear previous question's data
      sess.playerAnswers = {};
      this.store.setSession(sess);
      
      // Clear viewer votes
      try {
        const { resetViewerInputs } = await import("../../server/api/quiz-bot");
        resetViewerInputs();
      } catch (error) {
        this.logger.error(`selectQuestion: Failed to reset viewer inputs for question ${questionId}`, error);
      }

      // Emit question change to clear UI state
      const selectedQ = round.questions[qIdx];
      await this.channel.publish(OverlayChannel.QUIZ, "question.change", { 
        question_id: selectedQ.id,
        clear_assignments: true 
      });
    }
  }
  
  async resetQuestion(): Promise<void> {
    const q = this.getCurrentQuestion();
    const sess = this.requireSession();
    
    // Clear player answers
    sess.playerAnswers = {};
    this.store.setSession(sess);
    
    // Clear viewer votes
    try {
      const { resetViewerInputs } = await import("../../server/api/quiz-bot");
      resetViewerInputs();
      // Emit empty vote counts to reset UI
      await this.channel.publish(OverlayChannel.QUIZ, "vote.update", {
        counts: { A: 0, B: 0, C: 0, D: 0 },
        percentages: { A: 0, B: 0, C: 0, D: 0 },
      });
    } catch (error) {
      this.logger.error("resetQuestion: Failed to reset viewer inputs", error);
    }

    // Stop timer
    await this.timer.stop();
    this.phase = "idle";
    await this.channel.publish(OverlayChannel.QUIZ, "question.reset", { question_id: q.id });
  }
  
  async submitPlayerAnswer(playerId: string, option?: string, text?: string, value?: number): Promise<void> {
    const q = this.getCurrentQuestion();
    const sess = this.requireSession();
    
    // Store player answer in session
    const answer = option || text || value?.toString() || "";
    if (!sess.playerAnswers) sess.playerAnswers = {};
    sess.playerAnswers[playerId] = answer;
    this.store.setSession(sess);
    
    // Broadcast assignment to overlay and host
    await this.channel.publish(OverlayChannel.QUIZ, "answer.assign", {
      question_id: q.id,
      player_id: playerId,
      option,
      text,
      value,
    });
  }

  // Zoom controls
  private zoom: QuizZoomController;
  async zoomStart(): Promise<void> { await this.zoom.start(); }
  async zoomStop(): Promise<void> { await this.zoom.stop(); }
  async zoomResume(): Promise<void> { await this.zoom.resume(); }
  async zoomStep(delta: number): Promise<void> { await this.zoom.step(delta); }

  // Mystery image controls
  private mystery: QuizMysteryImageController;
  async mysteryStart(totalSquares: number): Promise<void> { await this.mystery.start(totalSquares); }
  async mysteryStop(): Promise<void> { await this.mystery.stop(); }
  async mysteryResume(): Promise<void> { await this.mystery.resume(); }
  async mysteryStep(count: number): Promise<void> { await this.mystery.step(count); }
  getMysteryState(): { revealed: number; total: number; running: boolean } {
    return this.mystery.getState();
  }

  // Buzzer controls
  private buzzer: QuizBuzzerService;
  buzzerHit(playerId: string): { accepted: boolean; winner?: string } { return this.buzzer.hit(playerId); }
  buzzerLock(): void { this.buzzer.forceLock(); }
  buzzerRelease(): void { this.buzzer.release(); }

  // Timer controls
  async timerAdd(deltaSeconds: number): Promise<void> { await this.timer.addTime(deltaSeconds); }
  async timerResume(): Promise<void> { await this.timer.resume(this.phase); }
  async timerStop(): Promise<void> { await this.timer.stop(); }
  getTimerState(): { seconds: number; running: boolean; phase: string } {
    return {
      seconds: this.timer.getSeconds(),
      running: this.timer.isRunning(),
      phase: this.timer.getPhase(),
    };
  }

  // Helpers
  private requireSession(): Session {
    const sess = this.store.getSession();
    if (!sess) throw new Error("No active quiz session");
    return sess;
  }

  private getCurrentQuestion(): Question {
    const sess = this.requireSession();
    const round = sess.rounds[sess.currentRoundIndex];
    if (!round) throw new Error("No current round");
    const q = round.questions[sess.currentQuestionIndex];
    if (!q) throw new Error("No current question");
    return q;
  }

  private async emitPhaseUpdate(): Promise<void> {
    const q = this.getCurrentQuestion();
    await this.channel.publish(OverlayChannel.QUIZ, "phase.update", {
      phase: this.phase,
      question_id: q.id,
    });
  }

  private async applyScoring(q: Question, sess: Session): Promise<void> {
    // Auto-score studio players based on their answers
    if (!sess.playerAnswers) return;

    for (const player of sess.players) {
      const playerAnswer = sess.playerAnswers[player.id];
      if (!playerAnswer) continue;

      let isCorrect = false;
      let delta = 0;

      // Check if answer is correct based on question type
      if (q.type === "qcm" || q.type === "image") {
        // For QCM, compare option letter
        isCorrect = playerAnswer === String.fromCharCode(65 + (q.correct as number));
      } else if (q.type === "closest" && typeof q.correct === "number") {
        // For closest, check if within range (simplified)
        const playerValue = parseInt(playerAnswer);
        if (!isNaN(playerValue)) {
          isCorrect = playerValue === q.correct;
        }
      }
      // Open questions don't auto-score

      if (isCorrect) {
        delta = q.points || 1;
      }

      // Update score
      const newTotal = this.store.addScorePlayer(player.id, delta);

      // Emit score update
      await this.channel.publish(OverlayChannel.QUIZ, "score.update", {
        user_id: player.id,
        delta,
        total: newTotal,
      });
    }

    this.store.setSession(sess);
  }

  private async updateLeaderboard(sess: Session): Promise<void> {
    const topViewers = Object.entries(sess.scores.viewers || {})
      .map(([id, score]) => ({ id, name: id, score: score as number }))
      .sort((a, b) => b.score - a.score)
      .slice(0, sess.config.topN || 10);

    await this.channel.publish(OverlayChannel.QUIZ, "leaderboard.push", { topN: topViewers });
  }

  async toggleScorePanel(): Promise<void> {
    const sess = this.requireSession();
    const currentValue = sess.scorePanelVisible ?? true;
    const newValue = !currentValue;
    sess.scorePanelVisible = newValue;
    this.store.setSession(sess);
    await this.channel.publish(OverlayChannel.QUIZ, "scorepanel.toggle", { visible: newValue });
  }

  /**
   * Apply manual winners selection (closest/open questions)
   * Adds full points to each selected player and broadcasts score updates.
   */
  async applyWinners(
    playerIds: string[],
    options?: { points?: number; remove?: boolean }
  ): Promise<void> {
    const sess = this.requireSession();
    const q = this.getCurrentQuestion();
    const basePoints = Number.isFinite(options?.points as number)
      ? Number(options?.points)
      : (q.points || 1);
    const deltaPoints = options?.remove ? -basePoints : basePoints;

    for (const playerId of playerIds) {
      const newTotal = this.store.addScorePlayer(playerId, deltaPoints);
      await this.channel.publish(OverlayChannel.QUIZ, "score.update", {
        user_id: playerId,
        delta: deltaPoints,
        total: newTotal,
      });
    }

    await this.updateLeaderboard(sess);
  }
}


