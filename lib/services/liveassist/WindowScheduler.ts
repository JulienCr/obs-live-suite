import type { KeywordHit } from "./KeywordDetector";

export type ReadyWindow = { providerIds: string[]; tCenter: number };

type Pending = { tCenter: number; providerIds: Set<string>; registeredWall: number };

export class WindowScheduler {
  private pending: Pending[] = [];

  constructor(
    private afterMs: number,
    private readonly maxWaitMs: number,
  ) {}

  /** Updates the context window size (live Settings reload). */
  setAfterMs(afterMs: number): void {
    this.afterMs = afterMs;
  }

  register(hit: KeywordHit, wallNowMs: number): void {
    // Hits arrive in non-decreasing tHit order (sequential transcript segments),
    // so the symmetric distance check only ever coalesces a later hit forward
    // into a recent window — never a hit before an unrelated earlier center.
    // Coalesce into an existing pending window whose center is within afterMs.
    const near = this.pending.find((p) => Math.abs(p.tCenter - hit.tHit) <= this.afterMs);
    if (near) {
      near.providerIds.add(hit.providerId);
      return;
    }
    this.pending.push({
      tCenter: hit.tHit,
      providerIds: new Set([hit.providerId]),
      registeredWall: wallNowMs,
    });
  }

  collectReady(latestT1: number, wallNowMs: number): ReadyWindow[] {
    const ready: ReadyWindow[] = [];
    const still: Pending[] = [];
    for (const p of this.pending) {
      const contextArrived = latestT1 >= p.tCenter + this.afterMs;
      const maxWaitElapsed = wallNowMs - p.registeredWall >= this.maxWaitMs;
      if (contextArrived || maxWaitElapsed) {
        ready.push({ providerIds: [...p.providerIds], tCenter: p.tCenter });
      } else {
        still.push(p);
      }
    }
    this.pending = still;
    return ready;
  }
}
