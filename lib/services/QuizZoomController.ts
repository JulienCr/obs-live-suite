import { ChannelManager } from "./ChannelManager";
import { OverlayChannel } from "../models/OverlayEvents";

export interface ZoomConfig {
  durationSeconds: number;  // Total duration of the zoom animation
  maxZoom: number;          // Maximum zoom level (e.g., 26 for 26x zoom)
  fps?: number;             // Frames per second (default: 30)
}

export interface ZoomInternalConfig {
  steps: number;            // Calculated: durationSeconds * fps
  intervalMs: number;       // Calculated: 1000 / fps
  maxZoom: number;
}

/**
 * Emits zoom.start/zoom.step/zoom.stop events on QUIZ channel.
 */
export class QuizZoomController {
  private timer?: NodeJS.Timeout;
  private current = 0;
  private running = false;
  private internalCfg: ZoomInternalConfig;

  constructor(private readonly cfg: ZoomConfig, private readonly channel: ChannelManager = ChannelManager.getInstance()) {
    const fps = cfg.fps || 30;
    this.internalCfg = {
      steps: Math.round(cfg.durationSeconds * fps),
      intervalMs: Math.round(1000 / fps),
      maxZoom: cfg.maxZoom,
    };
  }

  getConfig(): ZoomConfig {
    return this.cfg;
  }

  getInternalConfig(): ZoomInternalConfig {
    return this.internalCfg;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.current = 0;
    await this.channel.publish(OverlayChannel.QUIZ, "zoom.start", { 
      steps: this.internalCfg.steps, 
      maxZoom: this.internalCfg.maxZoom 
    });
    this.timer = setInterval(async () => {
      if (!this.running) return;
      this.current++;
      await this.channel.publish(OverlayChannel.QUIZ, "zoom.step", { 
        cur_step: this.current, 
        total: this.internalCfg.steps,
        maxZoom: this.internalCfg.maxZoom
      });
      if (this.current >= this.internalCfg.steps) {
        await this.stop();
      }
    }, this.internalCfg.intervalMs);
  }

  async step(delta: number): Promise<void> {
    if (!this.running) return;
    this.current = Math.max(0, Math.min(this.internalCfg.steps, this.current + delta));
    await this.channel.publish(OverlayChannel.QUIZ, "zoom.step", { 
      cur_step: this.current, 
      total: this.internalCfg.steps,
      maxZoom: this.internalCfg.maxZoom
    });
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    await this.channel.publish(OverlayChannel.QUIZ, "zoom.stop", {});
  }

  async resume(): Promise<void> {
    if (this.running || this.current >= this.internalCfg.steps) return;
    this.running = true;
    this.timer = setInterval(async () => {
      if (!this.running) return;
      this.current++;
      await this.channel.publish(OverlayChannel.QUIZ, "zoom.step", { 
        cur_step: this.current, 
        total: this.internalCfg.steps,
        maxZoom: this.internalCfg.maxZoom
      });
      if (this.current >= this.internalCfg.steps) {
        await this.stop();
      }
    }, this.internalCfg.intervalMs);
  }

  reset(): void {
    this.running = false;
    this.current = 0;
    if (this.timer) clearInterval(this.timer);
  }
}


