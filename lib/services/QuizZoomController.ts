import { ChannelManager } from "./ChannelManager";
import { OverlayChannel } from "../models/OverlayEvents";

export interface ZoomConfig {
  steps: number;
  intervalMs: number;
}

/**
 * Emits zoom.start/zoom.step/zoom.stop events on QUIZ channel.
 */
export class QuizZoomController {
  private timer?: NodeJS.Timeout;
  private current = 0;
  private running = false;

  constructor(private readonly cfg: ZoomConfig, private readonly channel: ChannelManager = ChannelManager.getInstance()) {}

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.current = 0;
    await this.channel.publish(OverlayChannel.QUIZ, "zoom.start", {});
    this.timer = setInterval(async () => {
      if (!this.running) return;
      this.current++;
      await this.channel.publish(OverlayChannel.QUIZ, "zoom.step", { cur_step: this.current, total: this.cfg.steps });
      if (this.current >= this.cfg.steps) {
        await this.stop();
      }
    }, this.cfg.intervalMs);
  }

  async step(delta: number): Promise<void> {
    if (!this.running) return;
    this.current = Math.max(0, Math.min(this.cfg.steps, this.current + delta));
    await this.channel.publish(OverlayChannel.QUIZ, "zoom.step", { cur_step: this.current, total: this.cfg.steps });
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    await this.channel.publish(OverlayChannel.QUIZ, "zoom.stop", {});
  }
}


