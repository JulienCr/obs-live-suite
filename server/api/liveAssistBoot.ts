import { SettingsService } from "@/lib/services/SettingsService";
import { ChannelManager } from "@/lib/services/ChannelManager";
import { WikipediaResolverService } from "@/lib/services/WikipediaResolverService";
import {
  LiveAssistOrchestrator,
  setLiveAssistOrchestrator,
} from "@/lib/services/liveassist/LiveAssistOrchestrator";
import { TranscriptBuffer } from "@/lib/services/liveassist/TranscriptBuffer";
import { KeywordDetector } from "@/lib/services/liveassist/KeywordDetector";
import { WindowScheduler } from "@/lib/services/liveassist/WindowScheduler";
import { IntentExtractor } from "@/lib/services/liveassist/IntentExtractor";
import { SuggestionStore } from "@/lib/services/liveassist/SuggestionStore";
import { ProviderRegistry } from "@/lib/services/liveassist/providers/ActionProvider";
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

/**
 * Assembles real services, registers providers, and wires the singleton.
 * Called from server/backend.ts setupApiRoutes().
 */
export function buildOrchestrator(): {
  orchestrator: LiveAssistOrchestrator;
  store: SuggestionStore;
  registry: ProviderRegistry;
} {
  const liveAssistSettings = SettingsService.getInstance().getLiveAssistSettings();
  const cm = ChannelManager.getInstance();
  const resolver = WikipediaResolverService.getInstance();

  const registry = new ProviderRegistry();

  // Poster provider: creates a poster from a Wikipedia thumbnail via the frontend API.
  registry.register(
    new PosterActionProvider(resolver, async ({ title, fileUrl }) => {
      const r = await fetch(`${APP_URL}/api/assets/posters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, fileUrl, type: "image", downloadToLocal: true }),
      });
      return r.ok
        ? { ok: true }
        : { ok: false, message: `poster create failed (${r.status})` };
    }),
  );

  // Definition provider: shows a brief Wikipedia extract on the lower-third overlay.
  // Endpoint mirrored from mcp-server/src/tools/lower-third.ts (show-lower-third-text):
  //   POST /api/overlays/lower  { action: 'show', payload: { contentType: 'text', body } }
  registry.register(
    new DefinitionActionProvider(resolver, async (text) => {
      const r = await fetch(`${APP_URL}/api/overlays/lower`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "show",
          payload: { contentType: "text", body: text },
        }),
      });
      return r.ok
        ? { ok: true }
        : { ok: false, message: `lower-third failed (${r.status})` };
    }),
  );

  const store = new SuggestionStore((event: LiveAssistEvent) => cm.publishLiveAssist(event));
  const extractor = new IntentExtractor(registry.ids(), registry.descriptions());

  // Merge each provider's defaultKeywords as fallback when settings is empty.
  const keywords: Record<string, string[]> = {};
  for (const p of registry.all()) {
    const configured = liveAssistSettings.keywordsByProvider[p.id];
    keywords[p.id] = configured && configured.length ? configured : p.defaultKeywords;
  }

  const orchestrator = new LiveAssistOrchestrator({
    buffer: new TranscriptBuffer(),
    detector: new KeywordDetector(keywords),
    scheduler: new WindowScheduler(
      liveAssistSettings.windowAfterSec * 1000,
      LIVE_ASSIST.WINDOW_MAX_WAIT_MS,
    ),
    extractor,
    registry,
    store,
    settings: {
      windowBeforeSec: liveAssistSettings.windowBeforeSec,
      windowAfterSec: liveAssistSettings.windowAfterSec,
      confidenceThreshold: liveAssistSettings.confidenceThreshold,
    },
    // Gate ingest on the live settings flag (re-read each call).
    isEnabled: () => SettingsService.getInstance().getLiveAssistSettings().enabled,
    // Publish STT connected/disconnected state to overlay subscribers.
    publishStatus: (connected, device) =>
      cm.publishLiveAssist({ type: "stt:status", payload: { connected, device } }),
    // Publish each finalized transcript segment (live debug view in the panel).
    publishTranscript: (text, t0, t1) =>
      cm.publishLiveAssist({ type: "transcript", payload: { text, t0, t1 } }),
  });

  // Seed the device label so status reports include the configured device name.
  orchestrator.setSttStatus(false, liveAssistSettings.inputDevice ?? null);

  // Staleness ticker — fires twice per stale window to keep latency low.
  setInterval(
    () => orchestrator.checkStaleness(Date.now()),
    Math.floor(LIVE_ASSIST.STT_STALE_MS / 2),
  );

  setLiveAssistOrchestrator(orchestrator);
  return { orchestrator, store, registry };
}
