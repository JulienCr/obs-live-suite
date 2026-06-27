import { Router } from "express";
import { z } from "zod";
import { TranscriptSegmentSchema, SttDeviceSchema } from "@/lib/models/LiveAssist";
import { SettingsService } from "@/lib/services/SettingsService";
import type { ApplyResult } from "@/lib/services/liveassist/providers/ActionProvider";
import type { LiveAssistOrchestrator } from "@/lib/services/liveassist/LiveAssistOrchestrator";

// ---------------------------------------------------------------------------
// Router
//
// This module is imported by the router test, so it must stay light: only
// type-imports for the service layer. The heavy service wiring lives in
// server/api/liveAssistBoot.ts (buildOrchestrator).
// ---------------------------------------------------------------------------

interface RouterDeps {
  orchestrator: Pick<LiveAssistOrchestrator, "ingestSegment" | "getStatus" | "markSttAlive">;
  store: {
    list: () => unknown[];
    get: (id: string) => { intent: string; applyPayload: Record<string, unknown> } | undefined;
    setStatus: (id: string, status: "applied" | "dismissed") => unknown;
  };
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
    // The STT client polls this every ~2s (even when disabled) — treat it as the
    // liveness heartbeat so the status bar reflects "service running", not just
    // "segments flowing".
    deps.orchestrator.markSttAlive(s.inputDevice ?? null);
    return res.json({ enabled: s.enabled, inputDevice: s.inputDevice, whisperModel: s.whisperModel });
  });

  router.get("/api/stt/status", (_req, res) => {
    return res.json(deps.orchestrator.getStatus());
  });

  router.get("/api/live-assist/suggestions", (_req, res) => {
    return res.json({ suggestions: deps.store.list(), sttStatus: deps.orchestrator.getStatus() });
  });

  router.post("/api/live-assist/suggestions/:id/apply", async (req, res) => {
    // Server-authoritative: load the STORED suggestion by id and act on its own
    // intent + applyPayload. The client is trusted only for `target` (the runtime
    // pin-vs-on-air choice for definitions) — a forged intent/payload is ignored.
    const suggestion = deps.store.get(req.params.id);
    if (!suggestion) return res.status(404).json({ error: "unknown suggestion" });
    const provider = deps.registry.get(suggestion.intent);
    if (!provider) return res.status(404).json({ error: "unknown provider" });

    // `target` is the only client-trusted field: the runtime pin/on-air choice for
    // definitions, or the left/right side for a local poster. Anything else is ignored.
    const rawTarget = req.body?.target;
    const target = ["pin", "on-air", "left", "right"].includes(rawTarget) ? rawTarget : undefined;
    const payload: Record<string, unknown> = {
      ...suggestion.applyPayload,
      ...(target ? { target } : {}),
    };

    let result;
    try {
      result = await provider.apply(payload);
    } catch (error) {
      // apply() does network I/O (poster create / lower-third show); a rejection
      // must surface as a clean error, not an unhandled 500 that leaves the
      // suggestion stuck "pending".
      return res.status(502).json({ error: error instanceof Error ? error.message : "apply error" });
    }
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
