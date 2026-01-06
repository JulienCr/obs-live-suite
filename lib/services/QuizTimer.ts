import { ChannelManager } from "./ChannelManager";
import { OverlayChannel } from "../models/OverlayEvents";
import { Logger } from "../utils/Logger";

export class QuizTimer {
  private interval?: NodeJS.Timeout;
  private seconds = 0;
  private running = false;
  private logger = new Logger("QuizTimer");

  constructor(private readonly channel = ChannelManager.getInstance()) {}

  async start(seconds: number, phase: string): Promise<void> {
    try {
      await this.stop();
      this.seconds = Math.max(0, seconds);
      this.running = true;
      this.phase = phase;
      this.tickCount = 0;
      // Emit initial tick immediately
      await this.channel.publish(OverlayChannel.QUIZ, "timer.tick", { s: this.seconds, phase: this.phase });
      // Then tick every 500ms for responsive UI updates
      this.interval = setInterval(async () => {
        if (!this.running) return;

        // Increment tick counter
        this.tickCount++;

        // Only decrement seconds every 1000ms (every 2 ticks at 500ms interval)
        if (this.tickCount >= 2) {
          this.tickCount = 0;
          if (this.seconds > 0) this.seconds -= 1;
        }

        try {
          await this.channel.publish(OverlayChannel.QUIZ, "timer.tick", { s: this.seconds, phase: this.phase });
        } catch (error) {
          this.logger.error("Failed to publish timer tick", error);
        }

        if (this.seconds === 0 && this.tickCount === 0) {
          await this.stop();
        }
      }, 500);
      this.logger.debug(`Timer started: ${seconds}s, phase: ${phase}`);
    } catch (error) {
      this.logger.error(`Failed to start timer with ${seconds}s`, error);
      throw error;
    }
  }
  
  private phase = "idle";
  private tickCount = 0;

  async stop(): Promise<void> {
    if (this.interval) clearInterval(this.interval);
    this.interval = undefined;
    this.running = false;
  }

  async pause(): Promise<void> {
    this.running = false;
  }

  async resume(phase: string): Promise<void> {
    try {
      this.phase = phase;
      if (this.interval && !this.running) {
        this.running = true;
        await this.channel.publish(OverlayChannel.QUIZ, "timer.tick", { s: this.seconds, phase: this.phase });
        this.logger.debug(`Timer resumed at ${this.seconds}s`);
      } else if (!this.interval) {
        await this.start(this.seconds, phase);
      }
    } catch (error) {
      this.logger.error("Failed to resume timer", error);
      throw error;
    }
  }

  async addTime(delta: number): Promise<void> {
    try {
      this.seconds = Math.max(0, this.seconds + delta);
      await this.channel.publish(OverlayChannel.QUIZ, "timer.tick", { s: this.seconds, phase: this.phase });
      this.logger.debug(`Timer adjusted by ${delta}s, now at ${this.seconds}s`);
    } catch (error) {
      this.logger.error(`Failed to add ${delta}s to timer`, error);
      throw error;
    }
  }

  getSeconds(): number { return this.seconds; }
  
  getPhase(): string { return this.phase; }
  
  isRunning(): boolean { return this.running; }
}


