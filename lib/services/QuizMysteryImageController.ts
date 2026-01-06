import { ChannelManager } from "./ChannelManager";
import { OverlayChannel } from "../models/OverlayEvents";
import { Logger } from "../utils/Logger";

export interface MysteryImageConfig {
  intervalMs: number; // Time between revealing each square
  totalSquares?: number; // Total number of squares (calculated from image)
}

/**
 * Controls progressive square reveal for mystery image questions
 */
export class QuizMysteryImageController {
  private logger: Logger;
  private channel: ChannelManager;
  private interval: NodeJS.Timeout | null = null;
  private revealedSquares = 0;
  private totalSquares = 0;
  private config: MysteryImageConfig;

  constructor(config: MysteryImageConfig = { intervalMs: 1000 }) {
    this.logger = new Logger("QuizMysteryImageController");
    this.channel = ChannelManager.getInstance();
    this.config = config;
  }

  /**
   * Start revealing squares progressively
   */
  async start(totalSquares: number): Promise<void> {
    try {
      // Stop any existing interval
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }

      this.totalSquares = totalSquares;
      this.revealedSquares = 0;

      this.logger.info(`Mystery image reveal started: ${totalSquares} squares, interval: ${this.config.intervalMs}ms`);

      await this.channel.publish(OverlayChannel.QUIZ, "mystery.start", {
        total_squares: this.totalSquares,
      });

      this.interval = setInterval(async () => {
        // Check if we should continue
        if (this.revealedSquares >= this.totalSquares) {
          // All squares revealed, stop automatically
          this.logger.info("All squares revealed, stopping automatically");
          await this.stop();
          return;
        }

        // Reveal next square
        this.revealedSquares++;

        this.logger.debug(`Revealing square ${this.revealedSquares}/${this.totalSquares}`);

        try {
          await this.channel.publish(OverlayChannel.QUIZ, "mystery.step", {
            revealed_squares: this.revealedSquares,
            total_squares: this.totalSquares,
          });
        } catch (error) {
          this.logger.error("Failed to publish mystery step", error);
        }
      }, this.config.intervalMs);
    } catch (error) {
      this.logger.error(`Failed to start mystery reveal with ${totalSquares} squares`, error);
      throw error;
    }
  }

  /**
   * Stop revealing squares (pause)
   */
  async stop(): Promise<void> {
    try {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }

      await this.channel.publish(OverlayChannel.QUIZ, "mystery.stop", {
        revealed_squares: this.revealedSquares,
        total_squares: this.totalSquares,
      });

      this.logger.info(`Mystery image reveal paused at ${this.revealedSquares}/${this.totalSquares}`);
    } catch (error) {
      this.logger.error("Failed to stop mystery reveal", error);
      throw error;
    }
  }

  /**
   * Resume revealing squares from current position
   */
  async resume(): Promise<void> {
    // Don't resume if already running or completed
    if (this.interval || this.revealedSquares >= this.totalSquares) {
      return;
    }

    try {
      this.logger.info(`Mystery image reveal resumed from ${this.revealedSquares}/${this.totalSquares}`);

      this.interval = setInterval(async () => {
        // Check if we should continue
        if (this.revealedSquares >= this.totalSquares) {
          // All squares revealed, stop automatically
          this.logger.info("All squares revealed, stopping automatically");
          await this.stop();
          return;
        }

        // Reveal next square
        this.revealedSquares++;

        this.logger.debug(`Revealing square ${this.revealedSquares}/${this.totalSquares}`);

        try {
          await this.channel.publish(OverlayChannel.QUIZ, "mystery.step", {
            revealed_squares: this.revealedSquares,
            total_squares: this.totalSquares,
          });
        } catch (error) {
          this.logger.error("Failed to publish mystery step", error);
        }
      }, this.config.intervalMs);
    } catch (error) {
      this.logger.error("Failed to resume mystery reveal", error);
      throw error;
    }
  }

  /**
   * Manually reveal N additional squares
   */
  async step(count: number = 1): Promise<void> {
    try {
      if (this.revealedSquares + count <= this.totalSquares) {
        this.revealedSquares += count;
        await this.channel.publish(OverlayChannel.QUIZ, "mystery.step", {
          revealed_squares: this.revealedSquares,
          total_squares: this.totalSquares,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to step mystery reveal by ${count}`, error);
      throw error;
    }
  }

  /**
   * Get current state
   */
  getState(): { revealed: number; total: number; running: boolean } {
    return {
      revealed: this.revealedSquares,
      total: this.totalSquares,
      running: this.interval !== null,
    };
  }

  /**
   * Reset for new question
   */
  reset(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.revealedSquares = 0;
    this.totalSquares = 0;
  }
}

