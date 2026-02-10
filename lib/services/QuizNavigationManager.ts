import { ChannelManager } from "./ChannelManager";
import { OverlayChannel } from "../models/OverlayEvents";
import { Logger } from "../utils/Logger";
import { QuizStore } from "./QuizStore";
import { QuizTimer } from "./QuizTimer";
import { QuizError, requireSession, type QuizPhase } from "./QuizTypes";
import type { Session } from "../models/Quiz";

export interface QuizNavigationDeps {
  store: QuizStore;
  channel: ChannelManager;
  timer: QuizTimer;
  getPhase: () => QuizPhase;
  setPhase: (phase: QuizPhase) => void;
}

/**
 * Handles question/round navigation: next, prev, select, startRound, endRound.
 * Owned by QuizManager (not a singleton).
 */
export class QuizNavigationManager {
  private logger = new Logger("QuizNavigationManager");
  private store: QuizStore;
  private channel: ChannelManager;
  private timer: QuizTimer;
  private getPhase: () => QuizPhase;
  private setPhase: (phase: QuizPhase) => void;

  constructor(deps: QuizNavigationDeps) {
    this.store = deps.store;
    this.channel = deps.channel;
    this.timer = deps.timer;
    this.getPhase = deps.getPhase;
    this.setPhase = deps.setPhase;
  }

  async startRound(roundIndex: number): Promise<void> {
    try {
      const sess = requireSession(this.store);
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

  async nextQuestion(): Promise<void> {
    try {
      const sess = requireSession(this.store);
      const round = sess.rounds[sess.currentRoundIndex];
      if (!round) {
        this.logger.warn("nextQuestion: No current round");
        return;
      }
      if (sess.currentQuestionIndex + 1 >= round.questions.length) {
        this.logger.warn("nextQuestion: Already at last question");
        return;
      }

      await this.navigateToQuestion(sess, round, sess.currentQuestionIndex + 1);
      this.logger.info(`Advanced to question ${sess.currentQuestionIndex + 1}/${round.questions.length}`);
    } catch (error) {
      this.logger.error("nextQuestion failed", error);
      throw new QuizError("Failed to advance to next question", "nextQuestion", error);
    }
  }

  async prevQuestion(): Promise<void> {
    try {
      const sess = requireSession(this.store);
      const round = sess.rounds[sess.currentRoundIndex];
      if (!round) {
        this.logger.warn("prevQuestion: No current round");
        return;
      }
      if (sess.currentQuestionIndex <= 0) {
        this.logger.warn("prevQuestion: Already at first question");
        return;
      }

      await this.navigateToQuestion(sess, round, sess.currentQuestionIndex - 1);
      this.logger.info(`Moved back to question ${sess.currentQuestionIndex + 1}/${round.questions.length}`);
    } catch (error) {
      this.logger.error("prevQuestion failed", error);
      throw new QuizError("Failed to go to previous question", "prevQuestion", error);
    }
  }

  async selectQuestion(questionId: string): Promise<void> {
    try {
      const sess = requireSession(this.store);
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

      await this.navigateToQuestion(sess, round, qIdx);
      this.logger.info(`Selected question ${qIdx + 1}/${round.questions.length}`, { questionId });
    } catch (error) {
      this.logger.error(`selectQuestion failed for question ${questionId}`, error);
      throw new QuizError(`Failed to select question ${questionId}`, "selectQuestion", error);
    }
  }

  /**
   * Shared navigation logic: update index, reset state, clear inputs, emit change.
   */
  private async navigateToQuestion(sess: Session, round: Session["rounds"][number], targetIndex: number): Promise<void> {
    sess.currentQuestionIndex = targetIndex;
    this.setPhase("idle");
    await this.timer.stop();

    // Clear previous question's data
    sess.playerAnswers = {};
    this.store.setSession(sess);

    // Clear viewer votes (non-critical)
    try {
      const { resetViewerInputs } = await import("../../server/api/quiz-bot");
      resetViewerInputs();
    } catch (error) {
      this.logger.error("navigateToQuestion: Failed to reset viewer inputs", error);
    }

    // Emit question change to clear UI state
    const question = round.questions[targetIndex];
    await this.channel.publish(OverlayChannel.QUIZ, "question.change", {
      question_id: question.id,
      clear_assignments: true,
    });
  }

}
