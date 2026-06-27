// lib/services/liveassist/TranscriptRecorder.ts
import { appendFileSync, mkdirSync } from "fs";
import { join } from "path";
import { Logger } from "@/lib/utils/Logger";

const logger = new Logger("TranscriptRecorder");

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Collapse any line breaks (and surrounding whitespace) into a single space so one
 * record is always exactly one line. Without this, a `\n`/`\r` in STT text or an
 * LLM-derived title could inject extra lines / forge entries in the line-based log.
 */
const oneLine = (s: string) => s.replace(/\s*[\r\n]+\s*/g, " ").trim();

/**
 * Persists Live Assist transcripts (and the suggestions they trigger) to a plain-text
 * log file — one file per backend launch, named by the launch instant:
 * `liveassist-YYYY-MM-DD_HH-MM-SS.log`.
 *
 * Decoupled from the websocket re-broadcast: this records every finalized segment
 * whenever Live Assist is enabled, regardless of the `transcriptDebug` toggle (which
 * only gates the panel's live debug view). Writes are best-effort — a disk error
 * disables recording (logged once) rather than breaking the real-time pipeline.
 *
 * The filename stamp is frozen at construction (= launch); the file itself is created
 * lazily on the first write, so a backend reboot where Live Assist is never used does
 * not litter empty files.
 */
export class TranscriptRecorder {
  private readonly filePath: string;
  private ready = false; // dir ensured + safe to append
  private disabled = false; // a write failed → stop trying

  constructor(
    private readonly dir: string,
    private readonly now: () => Date = () => new Date(),
  ) {
    const d = this.now();
    const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
    this.filePath = join(this.dir, `liveassist-${stamp}.log`);
  }

  /** Append one finalized transcript segment (empty/whitespace text is ignored). */
  recordTranscript(text: string): void {
    const t = oneLine(text);
    if (!t) return;
    this.write(`[${this.timestamp()}] ${t}`);
  }

  /**
   * Append a marker for a suggestion created from the transcript. `label` is the
   * human-readable name (the card's `title`), not the opaque `entity` dedup key.
   */
  recordSuggestion(intent: string, label: string, confidence: number): void {
    this.write(`[${this.timestamp()}] >> SUGGESTION ${intent} « ${oneLine(label)} » (${confidence.toFixed(2)})`);
  }

  private timestamp(): string {
    const d = this.now();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  private write(line: string): void {
    if (this.disabled) return;
    try {
      if (!this.ready) {
        mkdirSync(this.dir, { recursive: true });
        this.ready = true;
      }
      appendFileSync(this.filePath, line + "\n", { encoding: "utf-8" });
    } catch (error) {
      this.disabled = true;
      logger.warn(
        `transcript recording disabled (write to ${this.filePath} failed): ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
