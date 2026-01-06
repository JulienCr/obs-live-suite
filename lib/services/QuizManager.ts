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
 * Error thrown when a quiz operation fails
 */
export class QuizError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "QuizError";
  }
}

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
    try {
      const sess = this.requireSession();
      sess.currentRoundIndex = roundIndex;
      sess.currentQuestionIndex = 0;
      await this.channel.publish(OverlayChannel.QUIZ, "quiz.start_round", { round_id: sess.rounds[roundIndex]?.id });
      this.logger.info(`Started round ${roundIndex}`, { roundId: sess.rounds[roundIndex]?.id });
    } catch (error) {
      this.logger.error(`startRound failed for round ${roundIndex}`, error);
      throw new QuizError(`Failed to start round ${roundIndex}`, "startRound", error);
    }
  }

  async endRound(): Promise<void> {
    try {
      await this.channel.publish(OverlayChannel.QUIZ, "quiz.end_round", {});
      this.logger.info("Ended current round");
    } catch (error) {
      this.logger.error("endRound failed", error);
      throw new QuizError("Failed to end round", "endRound", error);
    }
  }

  async showCurrentQuestion(): Promise<void> {
    let q: Question;
    let sess: Session;

    try {
      q = this.getCurrentQuestion();
      sess = this.requireSession();
    } catch (error) {
      this.logger.error("showCurrentQuestion: Failed to get current question or session", error);
      throw new QuizError("Failed to get current question", "showCurrentQuestion", error);
    }

    // Reset mystery reveal state
    this.mystery.reset();
    // Reset zoom state
    this.zoom.reset();

    // Clear player answers for new question
    sess.playerAnswers = {};
    this.store.setSession(sess);

    // Clear viewer votes for new question (non-critical, log and continue)
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
      // Continue despite error - viewer vote reset is non-critical
    }

    try {
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

      this.logger.info(`Showing question ${q.id}`, { type: q.type, mode: q.mode });
    } catch (error) {
      this.logger.error(`showCurrentQuestion: Failed to show question ${q.id}`, error);
      // Reset phase on failure
      this.phase = "idle";
      throw new QuizError(`Failed to show question ${q.id}`, "showCurrentQuestion", error);
    }
  }

  async lockAnswers(): Promise<void> {
    const previousPhase = this.phase;
    try {
      const q = this.getCurrentQuestion();
      this.phase = "lock";
      await this.channel.publish(OverlayChannel.QUIZ, "question.lock", { question_id: q.id });
      await this.emitPhaseUpdate();
      await this.timer.pause();
      this.logger.info(`Locked answers for question ${q.id}`);
    } catch (error) {
      this.logger.error("lockAnswers failed", error);
      // Restore previous phase on failure
      this.phase = previousPhase;
      throw new QuizError("Failed to lock answers", "lockAnswers", error);
    }
  }

  async reveal(): Promise<void> {
    const previousPhase = this.phase;
    let q: Question;
    let sess: Session;

    try {
      q = this.getCurrentQuestion();
      sess = this.requireSession();
    } catch (error) {
      this.logger.error("reveal: Failed to get current question or session", error);
      throw new QuizError("Failed to reveal answer - no active question", "reveal", error);
    }

    try {
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

      this.logger.info(`Revealed answer for question ${q.id}`, { correct: q.correct });
    } catch (error) {
      this.logger.error(`reveal: Failed to reveal answer for question ${q.id}`, error);
      // Try to restore previous phase on failure
      this.phase = previousPhase;
      throw new QuizError(`Failed to reveal answer for question ${q.id}`, "reveal", error);
    }
  }

  async nextQuestion(): Promise<void> {
    try {
      const sess = this.requireSession();
      const round = sess.rounds[sess.currentRoundIndex];
      if (!round) {
        this.logger.warn("nextQuestion: No current round");
        return;
      }
      if (sess.currentQuestionIndex + 1 >= round.questions.length) {
        this.logger.warn("nextQuestion: Already at last question");
        return;
      }

      sess.currentQuestionIndex += 1;
      this.phase = "idle";
      await this.timer.stop();

      // Clear previous question's data
      sess.playerAnswers = {};
      this.store.setSession(sess);

      // Clear viewer votes (non-critical)
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

      this.logger.info(`Advanced to question ${sess.currentQuestionIndex + 1}/${round.questions.length}`, { questionId: nextQ.id });
    } catch (error) {
      this.logger.error("nextQuestion failed", error);
      throw new QuizError("Failed to advance to next question", "nextQuestion", error);
    }
  }
  
  async prevQuestion(): Promise<void> {
    try {
      const sess = this.requireSession();
      const round = sess.rounds[sess.currentRoundIndex];
      if (!round) {
        this.logger.warn("prevQuestion: No current round");
        return;
      }
      if (sess.currentQuestionIndex <= 0) {
        this.logger.warn("prevQuestion: Already at first question");
        return;
      }

      sess.currentQuestionIndex -= 1;
      this.phase = "idle";
      await this.timer.stop();

      // Clear previous question's data
      sess.playerAnswers = {};
      this.store.setSession(sess);

      // Clear viewer votes (non-critical)
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

      this.logger.info(`Moved back to question ${sess.currentQuestionIndex + 1}/${round.questions.length}`, { questionId: prevQ.id });
    } catch (error) {
      this.logger.error("prevQuestion failed", error);
      throw new QuizError("Failed to go to previous question", "prevQuestion", error);
    }
  }
  
  async selectQuestion(questionId: string): Promise<void> {
    try {
      const sess = this.requireSession();
      const round = sess.rounds[sess.currentRoundIndex];
      if (!round) {
        this.logger.warn(`selectQuestion: No current round for question ${questionId}`);
        return;
      }

      const qIdx = round.questions.findIndex(q => q.id === questionId);
      if (qIdx < 0) {
        this.logger.warn(`selectQuestion: Question ${questionId} not found in current round`);
        return;
      }

      sess.currentQuestionIndex = qIdx;
      this.phase = "idle";
      await this.timer.stop();

      // Clear previous question's data
      sess.playerAnswers = {};
      this.store.setSession(sess);

      // Clear viewer votes (non-critical)
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

      this.logger.info(`Selected question ${qIdx + 1}/${round.questions.length}`, { questionId });
    } catch (error) {
      this.logger.error(`selectQuestion failed for question ${questionId}`, error);
      throw new QuizError(`Failed to select question ${questionId}`, "selectQuestion", error);
    }
  }
  
  async resetQuestion(): Promise<void> {
    let q: Question;
    let sess: Session;

    try {
      q = this.getCurrentQuestion();
      sess = this.requireSession();
    } catch (error) {
      this.logger.error("resetQuestion: Failed to get current question or session", error);
      throw new QuizError("Failed to reset question - no active question", "resetQuestion", error);
    }

    try {
      // Clear player answers
      sess.playerAnswers = {};
      this.store.setSession(sess);

      // Clear viewer votes (non-critical)
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

      this.logger.info(`Reset question ${q.id}`);
    } catch (error) {
      this.logger.error(`resetQuestion: Failed to reset question ${q.id}`, error);
      throw new QuizError(`Failed to reset question ${q.id}`, "resetQuestion", error);
    }
  }
  
  async submitPlayerAnswer(playerId: string, option?: string, text?: string, value?: number): Promise<void> {
    try {
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

      this.logger.debug(`Player ${playerId} submitted answer for question ${q.id}`, { option, text, value });
    } catch (error) {
      this.logger.error(`submitPlayerAnswer failed for player ${playerId}`, error);
      throw new QuizError(`Failed to submit answer for player ${playerId}`, "submitPlayerAnswer", error);
    }
  }

  // Zoom controls
  private zoom: QuizZoomController;

  async zoomStart(): Promise<void> {
    try {
      await this.zoom.start();
      this.logger.debug("Zoom started");
    } catch (error) {
      this.logger.error("zoomStart failed", error);
      throw new QuizError("Failed to start zoom", "zoomStart", error);
    }
  }

  async zoomStop(): Promise<void> {
    try {
      await this.zoom.stop();
      this.logger.debug("Zoom stopped");
    } catch (error) {
      this.logger.error("zoomStop failed", error);
      throw new QuizError("Failed to stop zoom", "zoomStop", error);
    }
  }

  async zoomResume(): Promise<void> {
    try {
      await this.zoom.resume();
      this.logger.debug("Zoom resumed");
    } catch (error) {
      this.logger.error("zoomResume failed", error);
      throw new QuizError("Failed to resume zoom", "zoomResume", error);
    }
  }

  async zoomStep(delta: number): Promise<void> {
    try {
      await this.zoom.step(delta);
    } catch (error) {
      this.logger.error(`zoomStep failed with delta ${delta}`, error);
      throw new QuizError("Failed to step zoom", "zoomStep", error);
    }
  }

  // Mystery image controls
  private mystery: QuizMysteryImageController;

  async mysteryStart(totalSquares: number): Promise<void> {
    try {
      await this.mystery.start(totalSquares);
      this.logger.debug(`Mystery reveal started with ${totalSquares} squares`);
    } catch (error) {
      this.logger.error(`mysteryStart failed for ${totalSquares} squares`, error);
      throw new QuizError("Failed to start mystery reveal", "mysteryStart", error);
    }
  }

  async mysteryStop(): Promise<void> {
    try {
      await this.mystery.stop();
      this.logger.debug("Mystery reveal stopped");
    } catch (error) {
      this.logger.error("mysteryStop failed", error);
      throw new QuizError("Failed to stop mystery reveal", "mysteryStop", error);
    }
  }

  async mysteryResume(): Promise<void> {
    try {
      await this.mystery.resume();
      this.logger.debug("Mystery reveal resumed");
    } catch (error) {
      this.logger.error("mysteryResume failed", error);
      throw new QuizError("Failed to resume mystery reveal", "mysteryResume", error);
    }
  }

  async mysteryStep(count: number): Promise<void> {
    try {
      await this.mystery.step(count);
    } catch (error) {
      this.logger.error(`mysteryStep failed with count ${count}`, error);
      throw new QuizError("Failed to step mystery reveal", "mysteryStep", error);
    }
  }

  getMysteryState(): { revealed: number; total: number; running: boolean } {
    return this.mystery.getState();
  }

  // Buzzer controls
  private buzzer: QuizBuzzerService;
  buzzerHit(playerId: string): { accepted: boolean; winner?: string } { return this.buzzer.hit(playerId); }
  buzzerLock(): void { this.buzzer.forceLock(); }
  buzzerRelease(): void { this.buzzer.release(); }

  // Timer controls
  async timerAdd(deltaSeconds: number): Promise<void> {
    try {
      await this.timer.addTime(deltaSeconds);
      this.logger.debug(`Timer adjusted by ${deltaSeconds}s`);
    } catch (error) {
      this.logger.error(`timerAdd failed with delta ${deltaSeconds}`, error);
      throw new QuizError("Failed to adjust timer", "timerAdd", error);
    }
  }

  async timerResume(): Promise<void> {
    try {
      await this.timer.resume(this.phase);
      this.logger.debug("Timer resumed");
    } catch (error) {
      this.logger.error("timerResume failed", error);
      throw new QuizError("Failed to resume timer", "timerResume", error);
    }
  }

  async timerStop(): Promise<void> {
    try {
      await this.timer.stop();
      this.logger.debug("Timer stopped");
    } catch (error) {
      this.logger.error("timerStop failed", error);
      throw new QuizError("Failed to stop timer", "timerStop", error);
    }
  }

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
    try {
      const q = this.getCurrentQuestion();
      await this.channel.publish(OverlayChannel.QUIZ, "phase.update", {
        phase: this.phase,
        question_id: q.id,
      });
    } catch (error) {
      this.logger.error(`emitPhaseUpdate failed for phase ${this.phase}`, error);
      // Non-critical - log but don't throw
    }
  }

  private async applyScoring(q: Question, sess: Session): Promise<void> {
    // Auto-score studio players based on their answers
    if (!sess.playerAnswers) return;

    for (const player of sess.players) {
      try {
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
      } catch (error) {
        this.logger.error(`applyScoring: Failed to score player ${player.id}`, error);
        // Continue with other players
      }
    }

    this.store.setSession(sess);
  }

  private async updateLeaderboard(sess: Session): Promise<void> {
    try {
      const topViewers = Object.entries(sess.scores.viewers || {})
        .map(([id, score]) => ({ id, name: id, score: score as number }))
        .sort((a, b) => b.score - a.score)
        .slice(0, sess.config.topN || 10);

      await this.channel.publish(OverlayChannel.QUIZ, "leaderboard.push", { topN: topViewers });
    } catch (error) {
      this.logger.error("updateLeaderboard failed", error);
      // Non-critical - log but don't throw
    }
  }

  async toggleScorePanel(): Promise<void> {
    try {
      const sess = this.requireSession();
      const currentValue = sess.scorePanelVisible ?? true;
      const newValue = !currentValue;
      sess.scorePanelVisible = newValue;
      this.store.setSession(sess);
      await this.channel.publish(OverlayChannel.QUIZ, "scorepanel.toggle", { visible: newValue });
      this.logger.debug(`Score panel visibility toggled to ${newValue}`);
    } catch (error) {
      this.logger.error("toggleScorePanel failed", error);
      throw new QuizError("Failed to toggle score panel", "toggleScorePanel", error);
    }
  }

  /**
   * Apply manual winners selection (closest/open questions)
   * Adds full points to each selected player and broadcasts score updates.
   */
  async applyWinners(
    playerIds: string[],
    options?: { points?: number; remove?: boolean }
  ): Promise<void> {
    try {
      const sess = this.requireSession();
      const q = this.getCurrentQuestion();
      const basePoints = Number.isFinite(options?.points as number)
        ? Number(options?.points)
        : (q.points || 1);
      const deltaPoints = options?.remove ? -basePoints : basePoints;

      for (const playerId of playerIds) {
        try {
          const newTotal = this.store.addScorePlayer(playerId, deltaPoints);
          await this.channel.publish(OverlayChannel.QUIZ, "score.update", {
            user_id: playerId,
            delta: deltaPoints,
            total: newTotal,
          });
        } catch (error) {
          this.logger.error(`applyWinners: Failed to update score for player ${playerId}`, error);
          // Continue with other players
        }
      }

      await this.updateLeaderboard(sess);
      this.logger.info(`Applied winners: ${playerIds.join(", ")}`, { points: deltaPoints, remove: options?.remove });
    } catch (error) {
      this.logger.error("applyWinners failed", error);
      throw new QuizError("Failed to apply winners", "applyWinners", error);
    }
  }
}


