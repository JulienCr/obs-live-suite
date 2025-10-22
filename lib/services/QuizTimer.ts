import { ChannelManager } from "./ChannelManager";
import { OverlayChannel } from "../models/OverlayEvents";

export class QuizTimer {
  private interval?: NodeJS.Timeout;
  private seconds = 0;
  private running = false;

  constructor(private readonly channel = ChannelManager.getInstance()) {}

  async start(seconds: number, phase: string): Promise<void> {
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
      
      await this.channel.publish(OverlayChannel.QUIZ, "timer.tick", { s: this.seconds, phase: this.phase });
      
      if (this.seconds === 0 && this.tickCount === 0) {
        await this.stop();
      }
    }, 500);
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
    this.phase = phase;
    if (this.interval && !this.running) {
      this.running = true;
      await this.channel.publish(OverlayChannel.QUIZ, "timer.tick", { s: this.seconds, phase: this.phase });
    } else if (!this.interval) {
      await this.start(this.seconds, phase);
    }
  }

  async addTime(delta: number): Promise<void> {
    this.seconds = Math.max(0, this.seconds + delta);
    await this.channel.publish(OverlayChannel.QUIZ, "timer.tick", { s: this.seconds, phase: this.phase });
  }

  getSeconds(): number { return this.seconds; }
  
  getPhase(): string { return this.phase; }
  
  isRunning(): boolean { return this.running; }
}


