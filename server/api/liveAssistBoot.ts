import { SettingsService } from "@/lib/services/SettingsService";
import { ChannelManager } from "@/lib/services/ChannelManager";
import { WikipediaResolverService } from "@/lib/services/WikipediaResolverService";
import { Logger } from "@/lib/utils/Logger";
import { LiveAssistOrchestrator } from "@/lib/services/liveassist/LiveAssistOrchestrator";
import { TranscriptBuffer } from "@/lib/services/liveassist/TranscriptBuffer";
import { KeywordDetector } from "@/lib/services/liveassist/KeywordDetector";
import { WindowScheduler } from "@/lib/services/liveassist/WindowScheduler";
import { IntentExtractor } from "@/lib/services/liveassist/IntentExtractor";
import { SuggestionStore } from "@/lib/services/liveassist/SuggestionStore";
import { ProviderRegistry, type ApplyResult } from "@/lib/services/liveassist/providers/ActionProvider";
import { PosterActionProvider } from "@/lib/services/liveassist/providers/PosterActionProvider";
import { DefinitionActionProvider } from "@/lib/services/liveassist/providers/DefinitionActionProvider";
import { LIVE_ASSIST } from "@/lib/config/Constants";
import { APP_URL } from "@/lib/config/urls";
import type { LiveAssistEvent } from "@/lib/models/LiveAssist";

// ---------------------------------------------------------------------------
// Orchestrator factory — wires real services at backend boot time.
//
// This lives in its OWN module (not server/api/live-assist.ts) on purpose:
// the heavy service chain it imports (ChannelManager → WebSocketHub →
// CertificateManager → tlsContext.mjs) must NOT be pulled in when the router
// test imports createLiveAssistRouter. The backend runs as ESM, so this uses
// normal top-level imports (an earlier inline-require() workaround crashed at
// runtime with "require is not defined").
// ---------------------------------------------------------------------------

const logger = new Logger("LiveAssistBoot");

/**
 * Assembles real services and registers providers.
 * Called from server/backend.ts setupApiRoutes().
 */
export function buildOrchestrator(): {
  orchestrator: LiveAssistOrchestrator;
  store: SuggestionStore;
  registry: ProviderRegistry;
} {
  const settingsService = SettingsService.getInstance();
  const getSettings = () => settingsService.getLiveAssistSettings();
  const liveAssistSettings = getSettings();
  const cm = ChannelManager.getInstance();
  const resolver = WikipediaResolverService.getInstance();

  const registry = new ProviderRegistry();

  // Shared POST→ApplyResult helper for provider apply callbacks (one fetch shape).
  const postJson = async (path: string, body: unknown, failLabel: string): Promise<ApplyResult> => {
    const r = await fetch(`${APP_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return r.ok ? { ok: true } : { ok: false, message: `${failLabel} (${r.status})` };
  };

  // Poster provider: creates a poster from a Wikipedia thumbnail via the frontend API.
  registry.register(
    new PosterActionProvider(resolver, ({ title, fileUrl }) =>
      postJson("/api/assets/posters", { title, fileUrl, type: "image", downloadToLocal: true }, "poster create failed"),
    ),
  );

  // Definition provider: shows a brief Wikipedia extract on the lower-third overlay.
  // Endpoint mirrored from mcp-server/src/tools/lower-third.ts (show-lower-third-text):
  //   POST /api/overlays/lower  { action: 'show', payload: { contentType: 'text', body } }
  registry.register(
    new DefinitionActionProvider(resolver, (text) =>
      postJson("/api/overlays/lower", { action: "show", payload: { contentType: "text", body: text } }, "lower-third failed"),
    ),
  );

  const store = new SuggestionStore((event: LiveAssistEvent) => cm.publishLiveAssist(event));
  const extractor = new IntentExtractor(registry.ids(), registry.descriptions());

  // Merge each provider's defaultKeywords as fallback when settings is empty.
  const buildKeywords = (s: ReturnType<typeof getSettings>): Record<string, string[]> => {
    const keywords: Record<string, string[]> = {};
    for (const p of registry.all()) {
      const configured = s.keywordsByProvider[p.id];
      keywords[p.id] = configured && configured.length ? configured : p.defaultKeywords;
    }
    return keywords;
  };

  const detector = new KeywordDetector(buildKeywords(liveAssistSettings));
  const scheduler = new WindowScheduler(
    liveAssistSettings.windowAfterSec * 1000,
    LIVE_ASSIST.WINDOW_MAX_WAIT_MS,
  );

  const orchestrator = new LiveAssistOrchestrator({
    buffer: new TranscriptBuffer(),
    detector,
    scheduler,
    extractor,
    registry,
    store,
    // Read live so Settings > Live Assist saves apply without a backend restart.
    getSettings: () => {
      const s = getSettings();
      return {
        windowBeforeSec: s.windowBeforeSec,
        windowAfterSec: s.windowAfterSec,
        confidenceThreshold: s.confidenceThreshold,
      };
    },
    // Gate ingest on the live settings flag (re-read each call).
    isEnabled: () => getSettings().enabled,
    // Publish STT connected/disconnected state to overlay subscribers.
    publishStatus: (connected, device) =>
      cm.publishLiveAssist({ type: "stt:status", payload: { connected, device } }),
    // Publish each finalized transcript segment (live debug view in the panel).
    publishTranscript: (text, t0, t1) =>
      cm.publishLiveAssist({ type: "transcript", payload: { text, t0, t1 } }),
  });

  // Seed the device label so status reports include the configured device name.
  orchestrator.setSttStatus(false, liveAssistSettings.inputDevice ?? null);

  // Periodic ticker — fires twice per stale window to keep latency low. Besides
  // flagging STT staleness it (a) re-syncs keyword list + window size from live
  // settings so Settings saves apply without a restart, and (b) drains pending
  // windows whose max-wait elapsed (a keyword followed by silence still fires).
  setInterval(() => {
    const s = getSettings();
    detector.setKeywords(buildKeywords(s));
    scheduler.setAfterMs(s.windowAfterSec * 1000);
    orchestrator.tick(Date.now()).catch((error) => {
      logger.warn(`tick failed: ${error instanceof Error ? error.message : error}`);
    });
  }, Math.floor(LIVE_ASSIST.STT_STALE_MS / 2));

  return { orchestrator, store, registry };
}
