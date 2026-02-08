import { ChannelManager } from "./ChannelManager";
import { Logger } from "../utils/Logger";
import { QuizStore } from "./QuizStore";
import { Session } from "../models/Quiz";
import { QuizZoomController } from "./QuizZoomController";
import { QuizMysteryImageController } from "./QuizMysteryImageController";
import { QuizBuzzerService } from "./QuizBuzzerService";
import { QuizTimer } from "./QuizTimer";
import { QuizPhaseManager } from "./QuizPhaseManager";
import { QuizNavigationManager } from "./QuizNavigationManager";
import { QUIZ, BUZZER } from "../config/Constants";

// Re-export shared types so existing imports continue to work
export type { QuizPhase } from "./QuizTypes";
export { QuizError } from "./QuizTypes";
import type { QuizPhase } from "./QuizTypes";

export class QuizManager {
  private static instance: QuizManager;
  private logger: Logger;
  private phase: QuizPhase = "idle";
  private timer = new QuizTimer();

  // Sub-managers
  private phaseManager: QuizPhaseManager;
  private navigationManager: QuizNavigationManager;

  // Controllers (kept here for direct delegation)
  private zoom: QuizZoomController;
  private mystery: QuizMysteryImageController;
  private buzzer: QuizBuzzerService;

  private constructor() {
    this.logger = new Logger("QuizManager");
    const channel = ChannelManager.getInstance();
    const store = QuizStore.getInstance();
    // Ensure a session exists (createDefaultSession as fallback)
    if (!store.getSession()) store.createDefaultSession();

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

    // Phase accessors shared with sub-managers
    const getPhase = () => this.phase;
    const setPhase = (p: QuizPhase) => { this.phase = p; };

    this.phaseManager = new QuizPhaseManager({
      store,
      channel,
      timer: this.timer,
      zoom: this.zoom,
      mystery: this.mystery,
      getPhase,
      setPhase,
    });

    this.navigationManager = new QuizNavigationManager({
      store,
      channel,
      timer: this.timer,
      getPhase,
      setPhase,
    });
  }

  static getInstance(): QuizManager {
    if (!QuizManager.instance) QuizManager.instance = new QuizManager();
    return QuizManager.instance;
  }

  // --- Session / Phase accessors ---
  getPhase(): QuizPhase { return this.phase; }
  getSession(): Session | null { return QuizStore.getInstance().getSession(); }

  // --- Navigation (delegated) ---
  async startRound(roundIndex: number): Promise<void> { return this.navigationManager.startRound(roundIndex); }
  async endRound(): Promise<void> { return this.navigationManager.endRound(); }
  async nextQuestion(): Promise<void> { return this.navigationManager.nextQuestion(); }
  async prevQuestion(): Promise<void> { return this.navigationManager.prevQuestion(); }
  async selectQuestion(questionId: string): Promise<void> { return this.navigationManager.selectQuestion(questionId); }

  // --- Phase management (delegated) ---
  async showCurrentQuestion(): Promise<void> { return this.phaseManager.showCurrentQuestion(); }
  async lockAnswers(): Promise<void> { return this.phaseManager.lockAnswers(); }
  async reveal(): Promise<void> { return this.phaseManager.reveal(); }
  async resetQuestion(): Promise<void> { return this.phaseManager.resetQuestion(); }
  async submitPlayerAnswer(playerId: string, option?: string, text?: string, value?: number): Promise<void> {
    return this.phaseManager.submitPlayerAnswer(playerId, option, text, value);
  }
  async toggleScorePanel(): Promise<void> { return this.phaseManager.toggleScorePanel(); }
  async applyWinners(playerIds: string[], options?: { points?: number; remove?: boolean }): Promise<void> {
    return this.phaseManager.applyWinners(playerIds, options);
  }

  // --- Zoom controls (direct delegation to controller) ---
  async zoomStart(): Promise<void> {
    try {
      await this.zoom.start();
      this.logger.debug("Zoom started");
    } catch (error) {
      this.logger.error("zoomStart failed", error);
      throw error;
    }
  }

  async zoomStop(): Promise<void> {
    try {
      await this.zoom.stop();
      this.logger.debug("Zoom stopped");
    } catch (error) {
      this.logger.error("zoomStop failed", error);
      throw error;
    }
  }

  async zoomResume(): Promise<void> {
    try {
      await this.zoom.resume();
      this.logger.debug("Zoom resumed");
    } catch (error) {
      this.logger.error("zoomResume failed", error);
      throw error;
    }
  }

  async zoomStep(delta: number): Promise<void> {
    try {
      await this.zoom.step(delta);
    } catch (error) {
      this.logger.error(`zoomStep failed with delta ${delta}`, error);
      throw error;
    }
  }

  // --- Mystery image controls (direct delegation to controller) ---
  async mysteryStart(totalSquares: number): Promise<void> {
    try {
      await this.mystery.start(totalSquares);
      this.logger.debug(`Mystery reveal started with ${totalSquares} squares`);
    } catch (error) {
      this.logger.error(`mysteryStart failed for ${totalSquares} squares`, error);
      throw error;
    }
  }

  async mysteryStop(): Promise<void> {
    try {
      await this.mystery.stop();
      this.logger.debug("Mystery reveal stopped");
    } catch (error) {
      this.logger.error("mysteryStop failed", error);
      throw error;
    }
  }

  async mysteryResume(): Promise<void> {
    try {
      await this.mystery.resume();
      this.logger.debug("Mystery reveal resumed");
    } catch (error) {
      this.logger.error("mysteryResume failed", error);
      throw error;
    }
  }

  async mysteryStep(count: number): Promise<void> {
    try {
      await this.mystery.step(count);
    } catch (error) {
      this.logger.error(`mysteryStep failed with count ${count}`, error);
      throw error;
    }
  }

  getMysteryState(): { revealed: number; total: number; running: boolean } {
    return this.mystery.getState();
  }

  // --- Buzzer controls (direct delegation to service) ---
  buzzerHit(playerId: string): { accepted: boolean; winner?: string } { return this.buzzer.hit(playerId); }
  buzzerLock(): void { this.buzzer.forceLock(); }
  buzzerRelease(): void { this.buzzer.release(); }

  // --- Timer controls (direct delegation) ---
  async timerAdd(deltaSeconds: number): Promise<void> {
    try {
      await this.timer.addTime(deltaSeconds);
      this.logger.debug(`Timer adjusted by ${deltaSeconds}s`);
    } catch (error) {
      this.logger.error(`timerAdd failed with delta ${deltaSeconds}`, error);
      throw error;
    }
  }

  async timerResume(): Promise<void> {
    try {
      await this.timer.resume(this.phase);
      this.logger.debug("Timer resumed");
    } catch (error) {
      this.logger.error("timerResume failed", error);
      throw error;
    }
  }

  async timerStop(): Promise<void> {
    try {
      await this.timer.stop();
      this.logger.debug("Timer stopped");
    } catch (error) {
      this.logger.error("timerStop failed", error);
      throw error;
    }
  }

  getTimerState(): { seconds: number; running: boolean; phase: string } {
    return {
      seconds: this.timer.getSeconds(),
      running: this.timer.isRunning(),
      phase: this.timer.getPhase(),
    };
  }
}
