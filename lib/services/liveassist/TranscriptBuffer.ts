import { LIVE_ASSIST } from "@/lib/config/Constants";
import type { TranscriptSegment } from "@/lib/models/LiveAssist";

/** Rolling, time-ordered buffer of finalized transcript segments. */
export class TranscriptBuffer {
  private segments: TranscriptSegment[] = [];
  private latest = 0;

  constructor(private readonly retentionMs: number = LIVE_ASSIST.BUFFER_RETENTION_MS) {}

  append(segment: TranscriptSegment): void {
    this.segments.push(segment);
    if (segment.t1 > this.latest) this.latest = segment.t1;
    this.evict();
  }

  latestT1(): number {
    return this.latest;
  }

  windowAround(tCenter: number, beforeMs: number, afterMs: number): { text: string; t0: number; t1: number } {
    const start = tCenter - beforeMs;
    const end = tCenter + afterMs;
    const inWindow = this.segments.filter((s) => s.t1 >= start && s.t0 <= end);
    return {
      text: inWindow.map((s) => s.text.trim()).filter(Boolean).join(" "),
      t0: start,
      t1: end,
    };
  }

  private evict(): void {
    const cutoff = this.latest - this.retentionMs;
    if (cutoff <= 0) return;
    this.segments = this.segments.filter((s) => s.t1 >= cutoff);
  }
}
