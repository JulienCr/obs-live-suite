// lib/services/liveassist/LiveAssistOrchestrator.ts
import { Logger } from "@/lib/utils/Logger";
import { LIVE_ASSIST } from "@/lib/config/Constants";
import type { TranscriptSegment } from "@/lib/models/LiveAssist";
import { TranscriptBuffer } from "./TranscriptBuffer";
import { KeywordDetector } from "./KeywordDetector";
import { WindowScheduler } from "./WindowScheduler";
import { SuggestionStore } from "./SuggestionStore";
import { ProviderRegistry } from "./providers/ActionProvider";
import type { BuiltSuggestion } from "./providers/ActionProvider";
import type { IntentExtractor } from "./IntentExtractor";
import { isHallucination as defaultIsHallucination } from "./hallucinationFilter";

const logger = new Logger("LiveAssistOrchestrator");

interface Deps {
  buffer: TranscriptBuffer;
  detector: KeywordDetector;
  scheduler: WindowScheduler;
  extractor: Pick<IntentExtractor, "extract">;
  registry: ProviderRegistry;
  store: SuggestionStore;
  /**
   * Read live each window so Settings > Live Assist saves take effect without a
   * backend restart (keywords + window size are refreshed separately, on tick).
   */
  getSettings: () => { windowBeforeSec: number; windowAfterSec: number; confidenceThreshold: number };
  now?: () => number;
  isEnabled?: () => boolean;
  /**
   * Gate the live transcript re-broadcast (the panel's "Transcription (debug)"
   * view). Read live so Settings saves take effect without a backend restart.
   * When off, no `transcript` event is published — the websocket isn't loaded
   * for a view nobody is watching.
   */
  isTranscriptDebugEnabled?: () => boolean;
  publishStatus?: (connected: boolean, device: string | null) => void;
  publishTranscript?: (text: string, t0: number, t1: number) => void;
  /**
   * Persist each finalized segment to the per-launch transcript file. Unlike
   * `publishTranscript`, this is NOT gated by `isTranscriptDebugEnabled` — the file
   * recording is always on while Live Assist is enabled (the debug flag only controls
   * the live websocket re-broadcast). No-op by default.
   */
  recordTranscript?: (text: string) => void;
  /** Map a device id (e.g. "1") to its human label (e.g. "USB Mic") for status display. */
  resolveDeviceLabel?: (id: string) => string;
  /**
   * Non-LLM fast-path: fuzzy-match a finalized segment against existing poster
   * titles and return ready-to-store suggestions. Runs per segment (no window,
   * no extractor). `contextText` is the recent look-back transcript, scanned for
   * show-domain keywords that let an everyday-word title fire. Returns [] when disabled.
   */
  matchLocalPosters?: (text: string, contextText: string) => BuiltSuggestion[];
  /**
   * Drop a finalized segment that is a known Whisper "silence hallucination"
   * (subtitle credits / boilerplate emitted during non-speech). Defaults to the
   * shared `isHallucination` filter; injectable for tests.
   */
  isHallucination?: (text: string) => boolean;
  staleMs?: number;
}

export class LiveAssistOrchestrator {
  private status = { connected: false, device: null as string | null };
  private readonly now: () => number;
  private readonly isEnabled: () => boolean;
  private readonly isTranscriptDebugEnabled: () => boolean;
  private readonly publishStatus: (connected: boolean, device: string | null) => void;
  private readonly publishTranscript: (text: string, t0: number, t1: number) => void;
  private readonly recordTranscript: (text: string) => void;
  private readonly resolveDeviceLabel: (id: string) => string;
  private readonly isHallucination: (text: string) => boolean;
  private readonly staleMs: number;
  private lastSeenAt = 0;

  constructor(private readonly deps: Deps) {
    this.now = deps.now ?? Date.now;
    this.isEnabled = deps.isEnabled ?? (() => true);
    this.isTranscriptDebugEnabled = deps.isTranscriptDebugEnabled ?? (() => true);
    this.publishStatus = deps.publishStatus ?? (() => undefined);
    this.publishTranscript = deps.publishTranscript ?? (() => undefined);
    this.recordTranscript = deps.recordTranscript ?? (() => undefined);
    this.resolveDeviceLabel = deps.resolveDeviceLabel ?? ((id) => id);
    this.isHallucination = deps.isHallucination ?? defaultIsHallucination;
    this.staleMs = deps.staleMs ?? LIVE_ASSIST.STT_STALE_MS;
  }

  /** Resolve a device id to its label; null/empty stays null. */
  private labelFor(device: string | null): string | null {
    return device ? this.resolveDeviceLabel(device) : null;
  }

  setSttStatus(connected: boolean, device: string | null): void {
    this.status = { connected, device: this.labelFor(device) };
  }
  getStatus() {
    return { ...this.status };
  }

  /**
   * Liveness signal from the STT service (a segment OR a config poll). The STT
   * client polls /api/stt/config every ~2s even when disabled, so this is the
   * heartbeat that keeps the status "connected" while the service runs — not
   * just while segments happen to be flowing.
   */
  markSttAlive(device?: string | null): void {
    this.lastSeenAt = this.now();
    if (device != null) this.status.device = this.labelFor(device);
    if (!this.status.connected) {
      this.status.connected = true;
      this.publishStatus(true, this.status.device);
    }
  }

  checkStaleness(nowMs: number): void {
    if (this.status.connected && nowMs - this.lastSeenAt > this.staleMs) {
      this.status.connected = false;
      this.publishStatus(false, this.status.device);
    }
  }

  /**
   * Periodic tick from the backend ticker. Flags STT staleness AND drains any
   * pending window whose max-wait elapsed. Without the drain, a keyword followed
   * by silence (no further finalized segment to carry the +Ns context) would
   * never fire, because collectReady() is otherwise only reached from ingest.
   */
  async tick(nowMs: number): Promise<void> {
    this.checkStaleness(nowMs);
    if (this.isEnabled()) await this.drainReady();
  }

  async ingestSegment(segment: TranscriptSegment): Promise<void> {
    if (!segment.final) return;
    if (!this.isEnabled()) return;
    this.markSttAlive();
    // Drop known Whisper "silence hallucinations" (subtitle credits / boilerplate
    // emitted during non-speech) BEFORE anything else — so they never reach the
    // transcript file, the buffer, keyword detection, the debug view, or a
    // suggestion. markSttAlive() above already ran: a hallucination still proves the
    // STT service is producing output.
    if (this.isHallucination(segment.text)) return;
    // Always persist to the transcript file (gated only by enabled/final above);
    // the debug flag below only governs the live websocket re-broadcast.
    this.recordTranscript(segment.text);
    if (this.isTranscriptDebugEnabled()) this.publishTranscript(segment.text, segment.t0, segment.t1);
    this.deps.buffer.append(segment);
    // Non-LLM fast-path: a directly-named local poster fires immediately, no window.
    // Pass the recent look-back transcript (≈ windowBeforeSec, ending at this segment) as
    // context, so a show-domain keyword spoken in a nearby earlier segment can corroborate
    // an everyday-word title (the matcher's `context` rule).
    const { windowBeforeSec } = this.deps.getSettings();
    const contextText = this.deps.buffer.windowAround(segment.t1, windowBeforeSec * 1000, 0).text;
    for (const built of this.deps.matchLocalPosters?.(segment.text, contextText) ?? []) {
      this.deps.store.add(built);
    }
    for (const hit of this.deps.detector.scan(segment)) {
      this.deps.scheduler.register(hit, this.now());
    }
    await this.drainReady();
  }

  /** Fires every pending window the scheduler now considers ready. */
  private async drainReady(): Promise<void> {
    const ready = this.deps.scheduler.collectReady(this.deps.buffer.latestT1(), this.now());
    for (const win of ready) {
      await this.processWindow(win.providerIds, win.tCenter);
    }
  }

  private async processWindow(providerIds: string[], tCenter: number): Promise<void> {
    const { windowBeforeSec, windowAfterSec, confidenceThreshold } = this.deps.getSettings();
    const window = this.deps.buffer.windowAround(tCenter, windowBeforeSec * 1000, windowAfterSec * 1000);
    if (!window.text.trim()) return;

    logger.info(`window fired (providers=${providerIds.join(",")}): "${window.text.slice(0, 140)}"`);

    let extraction;
    try {
      extraction = await this.deps.extractor.extract(window.text, providerIds);
    } catch (error) {
      logger.warn(`extractor FAILED (is an AI provider configured in Settings > AI?): ${error instanceof Error ? error.message : error}`);
      return;
    }
    logger.info(
      `extraction: actionnable=${extraction.actionnable} intent=${extraction.intent} entite="${extraction.entite}" confiance=${extraction.confiance}`,
    );

    // Report the ACTUAL drop reason — these are two distinct gates, and lumping
    // them together printed a nonsense "confiance 0.9 < threshold 0.6".
    if (!extraction.actionnable) {
      logger.info(`→ dropped (non actionnable; confiance ${extraction.confiance})`);
      return;
    }
    // A DEDUCED entity (the title wasn't named, the LLM guessed it) is gated behind a
    // stricter bar to limit wrong guesses; an explicitly-cited entity uses the normal seuil.
    const minConfiance = extraction.infere
      ? Math.max(confidenceThreshold, LIVE_ASSIST.INFERRED_CONFIDENCE_THRESHOLD)
      : confidenceThreshold;
    if (extraction.confiance < minConfiance) {
      logger.info(
        `→ dropped (confiance ${extraction.confiance} < seuil ${minConfiance}${extraction.infere ? " [déduit]" : ""})`,
      );
      return;
    }

    const provider = this.deps.registry.get(extraction.intent);
    if (!provider) {
      logger.warn(`→ no provider registered for intent "${extraction.intent}"`);
      return;
    }

    let built;
    try {
      built = await provider.build(extraction.entite, window);
    } catch (error) {
      logger.warn(`provider ${provider.id} build error: ${error instanceof Error ? error.message : error}`);
      return;
    }
    if (!built) {
      logger.info(`→ provider ${provider.id} found nothing for "${extraction.entite}"`);
      return;
    }

    this.deps.store.add({ ...built, confidence: extraction.confiance });
    logger.info(`✓ suggestion created: ${provider.id} "${extraction.entite}"`);
  }
}
