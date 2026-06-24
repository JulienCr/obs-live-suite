// lib/services/liveassist/LiveAssistOrchestrator.ts
import { Logger } from "@/lib/utils/Logger";
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
  settings: { windowBeforeSec: number; windowAfterSec: number; confidenceThreshold: number };
  now?: () => number;
}

export class LiveAssistOrchestrator {
  private status = { connected: false, device: null as string | null };
  private readonly now: () => number;

  constructor(private readonly deps: Deps) {
    this.now = deps.now ?? Date.now;
  }

  setSttStatus(connected: boolean, device: string | null): void {
    this.status = { connected, device };
  }
  getStatus() {
    return { ...this.status };
  }

  async ingestSegment(segment: TranscriptSegment): Promise<void> {
    if (!segment.final) return;
    this.deps.buffer.append(segment);
    for (const hit of this.deps.detector.scan(segment)) {
      this.deps.scheduler.register(hit, this.now());
    }
    const ready = this.deps.scheduler.collectReady(this.deps.buffer.latestT1(), this.now());
    for (const win of ready) {
      await this.processWindow(win.providerIds, win.tCenter);
    }
  }

  private async processWindow(providerIds: string[], tCenter: number): Promise<void> {
    const { windowBeforeSec, windowAfterSec, confidenceThreshold } = this.deps.settings;
    const window = this.deps.buffer.windowAround(tCenter, windowBeforeSec * 1000, windowAfterSec * 1000);
    if (!window.text.trim()) return;

    let extraction;
    try {
      extraction = await this.deps.extractor.extract(window.text, providerIds);
    } catch (error) {
      logger.warn(`extractor error: ${error instanceof Error ? error.message : error}`);
      return;
    }
    if (!extraction.actionnable || extraction.confiance < confidenceThreshold) return;

    const provider = this.deps.registry.get(extraction.intent);
    if (!provider) return;

    let built;
    try {
      built = await provider.build(extraction.entite, window);
    } catch (error) {
      logger.warn(`provider ${provider.id} build error: ${error instanceof Error ? error.message : error}`);
      return;
    }
    if (!built) return;

    this.deps.store.add({ ...built, confidence: extraction.confiance });
  }
}

// ---- Singleton built from real services (used by the backend) ----
let instance: LiveAssistOrchestrator | null = null;

export function getLiveAssistOrchestrator(): LiveAssistOrchestrator {
  if (instance) return instance;
  // Real wiring is assembled in Task 12 (backend) where settings + services
  // are available; see server/api/live-assist.ts buildOrchestrator().
  throw new Error("LiveAssistOrchestrator not initialized — call setLiveAssistOrchestrator() first");
}

export function setLiveAssistOrchestrator(orch: LiveAssistOrchestrator): void {
  instance = orch;
}
