import { Router } from "express";
import { z } from "zod";
import { TranscriptSegmentSchema, SttDeviceSchema } from "@/lib/models/LiveAssist";
import { SettingsService } from "@/lib/services/SettingsService";
import type { ApplyResult } from "@/lib/services/liveassist/providers/ActionProvider";
import type { LiveAssistOrchestrator } from "@/lib/services/liveassist/LiveAssistOrchestrator";
import type { SuggestionStore } from "@/lib/services/liveassist/SuggestionStore";
import type { ProviderRegistry } from "@/lib/services/liveassist/providers/ActionProvider";

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

interface RouterDeps {
  orchestrator: Pick<LiveAssistOrchestrator, "ingestSegment" | "getStatus">;
  store: { list: () => unknown[]; setStatus: (id: string, status: "applied" | "dismissed") => unknown };
  registry: { get: (id: string) => { apply: (p: Record<string, unknown>) => Promise<ApplyResult> } | undefined };
}

export function createLiveAssistRouter(deps: RouterDeps): Router {
  const router = Router();

  router.post("/api/stt/segment", async (req, res) => {
    const parsed = TranscriptSegmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid segment" });
    await deps.orchestrator.ingestSegment(parsed.data);
    return res.json({ ok: true });
  });

  router.post("/api/stt/devices", (req, res) => {
    const parsed = z.array(SttDeviceSchema).safeParse(req.body?.devices);
    if (!parsed.success) return res.status(400).json({ error: "invalid devices" });
    SettingsService.getInstance().saveSttDevices(parsed.data);
    return res.json({ ok: true });
  });

  router.get("/api/stt/config", (_req, res) => {
    const s = SettingsService.getInstance().getLiveAssistSettings();
    return res.json({ enabled: s.enabled, inputDevice: s.inputDevice, whisperModel: s.whisperModel });
  });

  router.get("/api/stt/status", (_req, res) => {
    return res.json(deps.orchestrator.getStatus());
  });

  router.get("/api/live-assist/suggestions", (_req, res) => {
    return res.json({ suggestions: deps.store.list() });
  });

  router.post("/api/live-assist/suggestions/:id/apply", async (req, res) => {
    const intent = String(req.body?.intent ?? "");
    const provider = deps.registry.get(intent);
    if (!provider) return res.status(404).json({ error: "unknown provider" });
    const result = await provider.apply(req.body?.payload ?? {});
    if (!result.ok) return res.status(422).json({ error: result.message ?? "apply failed" });
    deps.store.setStatus(req.params.id, "applied");
    return res.json({ ok: true });
  });

  router.post("/api/live-assist/suggestions/:id/dismiss", (req, res) => {
    deps.store.setStatus(req.params.id, "dismissed");
    return res.json({ ok: true });
  });

  return router;
}

// ---------------------------------------------------------------------------
// Orchestrator factory — wires real services at backend boot time.
// Heavy imports are inline here so they don't affect test bundle loading of
// createLiveAssistRouter (which uses only type-imports for the service layer).
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
  // Inline requires to avoid pulling in WebSocketHub/CertificateManager at
  // module load time (which breaks Jest due to the tlsContext.mjs __dirname clash).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ChannelManager } = require("@/lib/services/ChannelManager");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { WikipediaResolverService } = require("@/lib/services/WikipediaResolverService");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { LiveAssistOrchestrator: OrchestratorClass, setLiveAssistOrchestrator } = require("@/lib/services/liveassist/LiveAssistOrchestrator");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TranscriptBuffer } = require("@/lib/services/liveassist/TranscriptBuffer");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { KeywordDetector } = require("@/lib/services/liveassist/KeywordDetector");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { WindowScheduler } = require("@/lib/services/liveassist/WindowScheduler");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { IntentExtractor } = require("@/lib/services/liveassist/IntentExtractor");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SuggestionStore: SuggestionStoreClass } = require("@/lib/services/liveassist/SuggestionStore");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ProviderRegistry: RegistryClass } = require("@/lib/services/liveassist/providers/ActionProvider");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PosterActionProvider } = require("@/lib/services/liveassist/providers/PosterActionProvider");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DefinitionActionProvider } = require("@/lib/services/liveassist/providers/DefinitionActionProvider");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { LIVE_ASSIST } = require("@/lib/config/Constants");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { APP_URL } = require("@/lib/config/urls");

  const liveAssistSettings = SettingsService.getInstance().getLiveAssistSettings();
  const cm = ChannelManager.getInstance();
  const resolver = WikipediaResolverService.getInstance();

  const registry = new RegistryClass();

  // Poster provider: creates a poster from a Wikipedia thumbnail via the frontend API.
  registry.register(
    new PosterActionProvider(resolver, async ({ title, fileUrl }: { title: string; fileUrl: string }) => {
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
    new DefinitionActionProvider(resolver, async (text: string) => {
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

  const store = new SuggestionStoreClass((event: unknown) => cm.publishLiveAssist(event));
  const extractor = new IntentExtractor(registry.ids(), registry.descriptions());

  // Fix C: merge each provider's defaultKeywords as fallback when settings is empty.
  const keywords: Record<string, string[]> = {};
  for (const p of registry.all()) {
    const configured = liveAssistSettings.keywordsByProvider[p.id];
    keywords[p.id] = configured && configured.length ? configured : p.defaultKeywords;
  }

  const orchestrator = new OrchestratorClass({
    buffer: new TranscriptBuffer(),
    detector: new KeywordDetector(keywords),
    scheduler: new WindowScheduler(liveAssistSettings.windowAfterSec * 1000, LIVE_ASSIST.WINDOW_MAX_WAIT_MS),
    extractor,
    registry,
    store,
    settings: {
      windowBeforeSec: liveAssistSettings.windowBeforeSec,
      windowAfterSec: liveAssistSettings.windowAfterSec,
      confidenceThreshold: liveAssistSettings.confidenceThreshold,
    },
    // Fix A: gate ingest on the live settings flag (re-read each call).
    isEnabled: () => SettingsService.getInstance().getLiveAssistSettings().enabled,
    // Fix B: publish STT connected/disconnected state to overlay subscribers.
    publishStatus: (connected: boolean, device: string | null) =>
      cm.publishLiveAssist({ type: "stt:status", payload: { connected, device } }),
  });

  // Seed the device label so status reports include the configured device name.
  orchestrator.setSttStatus(false, liveAssistSettings.inputDevice ?? null);

  // Fix B: staleness ticker — fires twice per stale window to keep latency low.
  setInterval(() => orchestrator.checkStaleness(Date.now()), Math.floor(LIVE_ASSIST.STT_STALE_MS / 2));

  setLiveAssistOrchestrator(orchestrator);
  return { orchestrator, store, registry };
}
