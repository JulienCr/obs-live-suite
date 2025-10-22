export interface BuzzerConfig {
  lockMs: number;
  steal: boolean;
  stealWindowMs: number;
}

interface Hit {
  playerId: string;
  at: number;
}

/**
 * Tracks first buzz and optional steal window.
 */
export class QuizBuzzerService {
  private locked = false;
  private winner: Hit | null = null;
  private lastBuzzAt = 0;
  private stealUntil = 0;

  constructor(private readonly cfg: BuzzerConfig) {}

  reset(): void {
    this.locked = false;
    this.winner = null;
    this.lastBuzzAt = 0;
    this.stealUntil = 0;
  }

  hit(playerId: string, now = Date.now()): { accepted: boolean; winner?: string } {
    if (this.locked) return { accepted: false, winner: this.winner?.playerId };

    // debounce
    if (now - this.lastBuzzAt < this.cfg.lockMs) return { accepted: false, winner: this.winner?.playerId };
    this.lastBuzzAt = now;

    if (!this.winner) {
      this.winner = { playerId, at: now };
      if (this.cfg.steal) this.stealUntil = now + this.cfg.stealWindowMs;
      else this.locked = true;
      return { accepted: true, winner: playerId };
    }

    if (this.cfg.steal && now <= this.stealUntil) {
      this.winner = { playerId, at: now };
      return { accepted: true, winner: playerId };
    }

    // outside steal window
    this.locked = true;
    return { accepted: false, winner: this.winner.playerId };
  }

  forceLock(): void {
    this.locked = true;
  }

  release(): void {
    this.reset();
  }

  getWinner(): string | null {
    return this.winner?.playerId || null;
  }
}


