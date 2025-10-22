interface AttemptState {
  lastAt: number;
  attempts: number;
  value?: unknown;
}

export interface ViewerLimitsConfig {
  perUserCooldownMs: number;
  perUserMaxAttempts: number;
  globalRps: number;
  firstOrLastWins: "first" | "last";
}

export class QuizViewerInputService {
  private userMap = new Map<string, AttemptState>();
  private windowCount = 0;
  private windowStart = Date.now();

  constructor(private readonly cfg: ViewerLimitsConfig) {}

  private withinRps(): boolean {
    const now = Date.now();
    if (now - this.windowStart >= 1000) {
      this.windowStart = now;
      this.windowCount = 0;
    }
    if (this.windowCount >= this.cfg.globalRps) return false;
    this.windowCount++;
    return true;
  }

  tryRecord(userId: string, value: unknown): boolean {
    if (!this.withinRps()) return false;
    const now = Date.now();
    const state = this.userMap.get(userId) || { lastAt: 0, attempts: 0 };

    if (now - state.lastAt < this.cfg.perUserCooldownMs) return false;
    if (state.attempts >= this.cfg.perUserMaxAttempts) return false;

    state.lastAt = now;
    state.attempts++;

    if (this.cfg.firstOrLastWins === "first" && state.value !== undefined) {
      // keep first
    } else {
      state.value = value;
    }

    this.userMap.set(userId, state);
    return true;
  }

  getValue(userId: string): unknown {
    return this.userMap.get(userId)?.value;
  }

  getQcmCounts(): Record<string, number> {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const [, s] of this.userMap) {
      const v = typeof s.value === "string" ? s.value.toUpperCase() : "";
      if (v in counts) counts[v]++;
    }
    return counts;
  }

  getQcmPercentages(): Record<string, number> {
    const counts = this.getQcmCounts();
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return Object.fromEntries(Object.entries(counts).map(([k, c]) => [k, Math.round((c * 100) / total)]));
  }

  getAllClosestValues(): number[] {
    const values: number[] = [];
    for (const [, s] of this.userMap) {
      if (typeof s.value === "number" && Number.isFinite(s.value)) values.push(s.value);
    }
    return values;
  }

  reset(): void {
    this.userMap.clear();
    this.windowCount = 0;
    this.windowStart = Date.now();
  }
}


