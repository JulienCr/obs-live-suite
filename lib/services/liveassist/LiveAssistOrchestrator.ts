// lib/services/liveassist/LiveAssistOrchestrator.ts
import { Logger } from "@/lib/utils/Logger";
import { LIVE_ASSIST } from "@/lib/config/Constants";
import type { TranscriptSegment } from "@/lib/models/LiveAssist";
import { TranscriptBuffer } from "./TranscriptBuffer";
import { KeywordDetector } from "./KeywordDetector";
import { WindowScheduler } from "./WindowScheduler";
import { SuggestionStore } from "./SuggestionStore";
import { ProviderRegistry } from "./providers/ActionProvider";
import type { IntentExtractor } from "./IntentExtractor";

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
  publishStatus?: (connected: boolean, device: string | null) => void;
  publishTranscript?: (text: string, t0: number, t1: number) => void;
  staleMs?: number;
}

export class LiveAssistOrchestrator {
  private status = { connected: false, device: null as string | null };
  private readonly now: () => number;
  private readonly isEnabled: () => boolean;
  private readonly publishStatus: (connected: boolean, device: string | null) => void;
  private readonly publishTranscript: (text: string, t0: number, t1: number) => void;
  private readonly staleMs: number;
  private lastSeenAt = 0;

  constructor(private readonly deps: Deps) {
    this.now = deps.now ?? Date.now;
    this.isEnabled = deps.isEnabled ?? (() => true);
    this.publishStatus = deps.publishStatus ?? (() => undefined);
    this.publishTranscript = deps.publishTranscript ?? (() => undefined);
    this.staleMs = deps.staleMs ?? LIVE_ASSIST.STT_STALE_MS;
  }

  setSttStatus(connected: boolean, device: string | null): void {
    this.status = { connected, device };
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
    if (device != null) this.status.device = device;
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
    this.publishTranscript(segment.text, segment.t0, segment.t1);
    this.deps.buffer.append(segment);
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

    if (!extraction.actionnable || extraction.confiance < confidenceThreshold) {
      logger.info(`→ dropped (actionnable=${extraction.actionnable}, confiance ${extraction.confiance} < threshold ${confidenceThreshold})`);
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
