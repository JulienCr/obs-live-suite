import { ChannelManager } from "./ChannelManager";
import { OverlayChannel } from "../models/OverlayEvents";
import { Logger } from "../utils/Logger";
import { QuizStore } from "./QuizStore";
import { QuizTimer } from "./QuizTimer";
import { QuizZoomController } from "./QuizZoomController";
import { QuizMysteryImageController } from "./QuizMysteryImageController";
import { QuizError, type QuizPhase } from "./QuizTypes";
import type { Session, Question } from "../models/Quiz";
import { QUIZ } from "../config/Constants";

export interface QuizPhaseDeps {
  store: QuizStore;
  channel: ChannelManager;
  timer: QuizTimer;
  zoom: QuizZoomController;
  mystery: QuizMysteryImageController;
  getPhase: () => QuizPhase;
  setPhase: (phase: QuizPhase) => void;
}

/**
 * Handles quiz phase transitions: show, lock, reveal, reset.
 * Owned by QuizManager (not a singleton).
 */
export class QuizPhaseManager {
  private logger = new Logger("QuizPhaseManager");
  private store: QuizStore;
  private channel: ChannelManager;
  private timer: QuizTimer;
  private zoom: QuizZoomController;
  private mystery: QuizMysteryImageController;
  private getPhase: () => QuizPhase;
  private setPhase: (phase: QuizPhase) => void;

  constructor(deps: QuizPhaseDeps) {
    this.store = deps.store;
    this.channel = deps.channel;
    this.timer = deps.timer;
    this.zoom = deps.zoom;
    this.mystery = deps.mystery;
    this.getPhase = deps.getPhase;
    this.setPhase = deps.setPhase;
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
      this.setPhase("show_question");

      // Send zoom config with question so overlay can initialize with correct values
      const zoomConfig = this.zoom.getInternalConfig();
      await this.channel.publish(OverlayChannel.QUIZ, "question.show", {
        question_id: q.id,
        zoom_steps: zoomConfig.steps,
        zoom_maxZoom: zoomConfig.maxZoom
      });

      this.setPhase("accept_answers");
      await this.emitPhaseUpdate();
      await this.timer.start(q.time_s || QUIZ.DEFAULT_TIMER_SECONDS, this.getPhase());

      this.logger.info(`Showing question ${q.id}`, { type: q.type, mode: q.mode });
    } catch (error) {
      this.logger.error(`showCurrentQuestion: Failed to show question ${q.id}`, error);
      // Reset phase on failure
      this.setPhase("idle");
      throw new QuizError(`Failed to show question ${q.id}`, "showCurrentQuestion", error);
    }
  }

  async lockAnswers(): Promise<void> {
    const previousPhase = this.getPhase();
    try {
      const q = this.getCurrentQuestion();
      this.setPhase("lock");
      await this.channel.publish(OverlayChannel.QUIZ, "question.lock", { question_id: q.id });
      await this.emitPhaseUpdate();
      await this.timer.pause();
      this.logger.info(`Locked answers for question ${q.id}`);
    } catch (error) {
      this.logger.error("lockAnswers failed", error);
      // Restore previous phase on failure
      this.setPhase(previousPhase);
      throw new QuizError("Failed to lock answers", "lockAnswers", error);
    }
  }

  async reveal(): Promise<void> {
    const previousPhase = this.getPhase();
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
      this.setPhase("reveal");
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

      this.setPhase("score_update");
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
      this.setPhase(previousPhase);
      throw new QuizError(`Failed to reveal answer for question ${q.id}`, "reveal", error);
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
      this.setPhase("idle");
      await this.channel.publish(OverlayChannel.QUIZ, "question.reset", { question_id: q.id });

      this.logger.info(`Reset question ${q.id}`);
    } catch (error) {
      this.logger.error(`resetQuestion: Failed to reset question ${q.id}`, error);
      throw new QuizError(`Failed to reset question ${q.id}`, "resetQuestion", error);
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

  // --- Private helpers ---

  private async emitPhaseUpdate(): Promise<void> {
    try {
      const q = this.getCurrentQuestion();
      await this.channel.publish(OverlayChannel.QUIZ, "phase.update", {
        phase: this.getPhase(),
        question_id: q.id,
      });
    } catch (error) {
      this.logger.error(`emitPhaseUpdate failed for phase ${this.getPhase()}`, error);
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
}
