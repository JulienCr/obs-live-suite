# Assistant Live — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Écoute temps réel du plateau (micro → faster-whisper) qui détecte des mots-clés, fait analyser une fenêtre −15s/+15s par un LLM, et propose à l'opérateur des cartes d'action (ajouter une affiche, afficher une définition) validables dans un panel dédié.

**Architecture:** Service Python (capture + STT, isolé derrière `POST /api/stt/segment`) → pipeline backend Express persistant (buffer → détecteurs → fenêtre → extracteur LLM → providers d'action → store) → diffusion WebSocket sur le canal `live-assist` → panel Dockview Next.js. Le LLM est cloud par défaut via `createAiModel()` (Settings > AI), basculable en local. Toute la moitié « actions » réutilise l'existant (`WikipediaResolverService`, endpoints posters, `ChannelManager`/`WebSocketHub`, `PANEL_REGISTRY`, `useSettings`).

**Tech Stack:** TypeScript (Node 20+), Express, Zod, Vercel AI SDK v6 (`generateObject`), Jest (node env services, jsdom + React Testing Library components), zustand, Dockview, next-intl ; Python 3.10+ (`sounddevice`, `faster-whisper`, `silero-vad`/`webrtcvad`, `httpx`), pytest.

## Global Constraints

- Package manager: **pnpm** (jamais npm/yarn). Node **20+**.
- **Ne jamais lancer `pnpm build`** sans autorisation explicite (dev mode watch).
- TypeScript strict. Réutiliser systématiquement l'existant (DRY) — voir la table §7 du spec.
- Constantes/config dans **un seul endroit** : `lib/config/Constants.ts` (bloc `LIVE_ASSIST`).
- i18n : français défaut + anglais ; toute string UI passe par `next-intl` (`messages/fr.json`, `messages/en.json`).
- Tests services : `__tests__/` miroir de l'arbo, env **node**. Tests composants : `@testing-library/react` + jsdom.
- LLM via **`createAiModel()`** uniquement (lit Settings > AI). Aucun appel direct à un provider en dur.
- Canal WebSocket dédié : **`live-assist`**, diffusé via une méthode **sans ack** (modèle `publishToPresenter`).
- `pnpm type-check` échoue déjà projet-wide (~28 erreurs préexistantes) : juger sur les fichiers touchés, pas sur le code de sortie.
- Spec de référence : `docs/superpowers/specs/2026-06-24-assistant-live-design.md`.

---

## File structure (créé / modifié)

**Créés (logique backend) :**
- `lib/models/LiveAssist.ts` — schémas Zod + types
- `lib/services/liveassist/TranscriptBuffer.ts`
- `lib/services/liveassist/KeywordDetector.ts`
- `lib/services/liveassist/WindowScheduler.ts`
- `lib/services/liveassist/IntentExtractor.ts`
- `lib/services/liveassist/SuggestionStore.ts`
- `lib/services/liveassist/LiveAssistOrchestrator.ts`
- `lib/services/liveassist/providers/ActionProvider.ts`
- `lib/services/liveassist/providers/PosterActionProvider.ts`
- `lib/services/liveassist/providers/DefinitionActionProvider.ts`
- `server/api/live-assist.ts` — routeur Express

**Créés (Next.js / UI) :**
- `app/api/live-assist/suggestions/route.ts`
- `app/api/live-assist/suggestions/[id]/apply/route.ts`
- `app/api/live-assist/suggestions/[id]/dismiss/route.ts`
- `app/api/settings/live-assist/route.ts`
- `app/[locale]/settings/live-assist/page.tsx`
- `lib/stores/liveAssistStore.ts`
- `components/dashboard/panels/LiveAssistPanel.tsx`
- `components/live-assist/SuggestionCard.tsx`
- `components/live-assist/SttStatusBar.tsx`
- `components/settings/LiveAssistSettings.tsx`

**Créés (Python) :**
- `realtime-stt/main.py`, `realtime-stt/requirements.txt`, `realtime-stt/config.example.json`, `realtime-stt/README.md`
- `realtime-stt/stt/segmenter.py` (logique pure testable), `realtime-stt/tests/test_segmenter.py`

**Modifiés :**
- `lib/config/Constants.ts` — ajout bloc `LIVE_ASSIST`
- `lib/services/ChannelManager.ts` — ajout `publishLiveAssist()`
- `lib/services/SettingsService.ts` — getters/setters STT devices + live-assist settings
- `server/backend.ts` — register router + boot orchestrator
- `lib/panels/registry.ts` — ajout panel `liveAssist`
- `components/shell/DashboardShell.tsx` (ou le map de composants panels) — branchement `LiveAssistPanel`
- `package.json` — script `dev:stt` + concurrently
- `ecosystem.config.cjs` — app `obs-stt`
- `messages/fr.json`, `messages/en.json` — clés i18n

---

### Task 1: Modèles Zod + constantes

**Files:**
- Create: `lib/models/LiveAssist.ts`
- Modify: `lib/config/Constants.ts` (ajouter le bloc `LIVE_ASSIST` après le bloc `AI_CHAT`, ~ligne 680)
- Test: `__tests__/models/LiveAssist.test.ts`

**Interfaces:**
- Produces:
  - `TranscriptSegmentSchema`, type `TranscriptSegment = { text: string; t0: number; t1: number; final: boolean; confidence?: number }`
  - `SuggestionPreview = { kind: 'image' | 'text'; imageUrl?: string; text?: string }`
  - `Suggestion = { id: string; intent: string; entity: string; title: string; preview: SuggestionPreview; triggerExcerpt: string; applyPayload: Record<string, unknown>; status: 'pending' | 'applied' | 'dismissed'; confidence: number; createdAt: number }`
  - `LiveAssistSettings = { enabled: boolean; inputDevice: string | null; whisperModel: string; keywordsByProvider: Record<string, string[]>; windowBeforeSec: number; windowAfterSec: number; confidenceThreshold: number }`
  - `SttDeviceSchema`, type `SttDevice = { id: string; label: string }`
  - `LIVE_ASSIST` const (Constants.ts)

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/models/LiveAssist.test.ts
import {
  TranscriptSegmentSchema,
  SuggestionSchema,
  LiveAssistSettingsSchema,
} from "@/lib/models/LiveAssist";

describe("LiveAssist models", () => {
  it("parses a valid transcript segment", () => {
    const seg = TranscriptSegmentSchema.parse({ text: "le spectacle Le Cid", t0: 1000, t1: 2500, final: true });
    expect(seg.final).toBe(true);
    expect(seg.confidence).toBeUndefined();
  });

  it("rejects a segment with t1 < t0", () => {
    expect(() => TranscriptSegmentSchema.parse({ text: "x", t0: 5000, t1: 1000, final: true })).toThrow();
  });

  it("defaults suggestion status to pending", () => {
    const s = SuggestionSchema.parse({
      id: "a", intent: "poster", entity: "Le Cid", title: "Le Cid",
      preview: { kind: "image", imageUrl: "http://x/p.jpg" },
      triggerExcerpt: "…le spectacle Le Cid…", applyPayload: {}, confidence: 0.8, createdAt: 1,
    });
    expect(s.status).toBe("pending");
  });

  it("applies settings defaults", () => {
    const cfg = LiveAssistSettingsSchema.parse({});
    expect(cfg.windowBeforeSec).toBe(15);
    expect(cfg.windowAfterSec).toBe(15);
    expect(cfg.confidenceThreshold).toBeCloseTo(0.6);
    expect(cfg.enabled).toBe(false);
    expect(cfg.keywordsByProvider.poster).toContain("spectacle");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- LiveAssist.test.ts`
Expected: FAIL — cannot find module `@/lib/models/LiveAssist`.

- [ ] **Step 3: Write the model file**

```ts
// lib/models/LiveAssist.ts
import { z } from "zod";
import { LIVE_ASSIST } from "@/lib/config/Constants";

export const TranscriptSegmentSchema = z
  .object({
    text: z.string(),
    t0: z.number(),
    t1: z.number(),
    final: z.boolean(),
    confidence: z.number().min(0).max(1).optional(),
  })
  .refine((s) => s.t1 >= s.t0, { message: "t1 must be >= t0" });
export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;

export const SuggestionPreviewSchema = z.object({
  kind: z.enum(["image", "text"]),
  imageUrl: z.string().optional(),
  text: z.string().optional(),
});
export type SuggestionPreview = z.infer<typeof SuggestionPreviewSchema>;

export const SuggestionStatusSchema = z.enum(["pending", "applied", "dismissed"]);

export const SuggestionSchema = z.object({
  id: z.string(),
  intent: z.string(),
  entity: z.string(),
  title: z.string(),
  preview: SuggestionPreviewSchema,
  triggerExcerpt: z.string(),
  applyPayload: z.record(z.string(), z.unknown()).default({}),
  status: SuggestionStatusSchema.default("pending"),
  confidence: z.number().min(0).max(1),
  createdAt: z.number(),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;

export const SttDeviceSchema = z.object({ id: z.string(), label: z.string() });
export type SttDevice = z.infer<typeof SttDeviceSchema>;

export const LiveAssistSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  inputDevice: z.string().nullable().default(null),
  whisperModel: z.string().default(LIVE_ASSIST.DEFAULT_WHISPER_MODEL),
  keywordsByProvider: z
    .record(z.string(), z.array(z.string()))
    .default(LIVE_ASSIST.DEFAULT_KEYWORDS),
  windowBeforeSec: z.number().int().positive().default(LIVE_ASSIST.WINDOW_BEFORE_SEC),
  windowAfterSec: z.number().int().positive().default(LIVE_ASSIST.WINDOW_AFTER_SEC),
  confidenceThreshold: z.number().min(0).max(1).default(LIVE_ASSIST.CONFIDENCE_THRESHOLD),
});
export type LiveAssistSettings = z.infer<typeof LiveAssistSettingsSchema>;

/** WebSocket event payloads on the `live-assist` channel. */
export type LiveAssistEvent =
  | { type: "suggestion:new"; payload: { suggestion: Suggestion } }
  | { type: "suggestion:update"; payload: { id: string; status: Suggestion["status"] } }
  | { type: "stt:status"; payload: { connected: boolean; device: string | null } };
```

- [ ] **Step 4: Add the constants block**

In `lib/config/Constants.ts`, after the `AI_CHAT` block (around line 680) add:

```ts
// ============================================================================
// LIVE ASSIST CONSTANTS
// ============================================================================

/** Real-time listening assistant configuration. */
export const LIVE_ASSIST = {
  /** WebSocket channel for suggestions + STT status. */
  CHANNEL: "live-assist",
  /** Transcript buffer retention (ms). */
  BUFFER_RETENTION_MS: 120_000,
  /** Default context window before/after a keyword hit (seconds). */
  WINDOW_BEFORE_SEC: 15,
  WINDOW_AFTER_SEC: 15,
  /** Minimum extractor confidence to surface a suggestion. */
  CONFIDENCE_THRESHOLD: 0.6,
  /** Dedup window: same (intent, entity) ignored within this span (ms). */
  DEDUP_WINDOW_MS: 600_000,
  /** Max wall-clock wait before firing a window even if no +15s audio arrived (ms). */
  WINDOW_MAX_WAIT_MS: 20_000,
  /** Default faster-whisper model. */
  DEFAULT_WHISPER_MODEL: "large-v3",
  /** Default keyword list per provider id. */
  DEFAULT_KEYWORDS: {
    poster: ["spectacle", "affiche", "pièce", "film", "concert"],
    definition: ["définition", "c'est quoi", "qu'est-ce que", "ça veut dire"],
  } as Record<string, string[]>,
} as const;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test -- LiveAssist.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/models/LiveAssist.ts lib/config/Constants.ts __tests__/models/LiveAssist.test.ts
git commit -m "feat(live-assist): models + constants"
```

---

### Task 2: TranscriptBuffer

**Files:**
- Create: `lib/services/liveassist/TranscriptBuffer.ts`
- Test: `__tests__/services/liveassist/TranscriptBuffer.test.ts`

**Interfaces:**
- Consumes: `TranscriptSegment` (Task 1)
- Produces: class `TranscriptBuffer`
  - `constructor(retentionMs?: number)`
  - `append(segment: TranscriptSegment): void`
  - `latestT1(): number` — largest `t1` seen (0 if empty)
  - `windowAround(tCenter: number, beforeMs: number, afterMs: number): { text: string; t0: number; t1: number }`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/services/liveassist/TranscriptBuffer.test.ts
import { TranscriptBuffer } from "@/lib/services/liveassist/TranscriptBuffer";

const seg = (text: string, t0: number, t1: number) => ({ text, t0, t1, final: true });

describe("TranscriptBuffer", () => {
  it("returns concatenated text within a window", () => {
    const b = new TranscriptBuffer();
    b.append(seg("avant", 0, 1000));
    b.append(seg("le spectacle Le Cid", 9000, 11000));
    b.append(seg("après contexte", 20000, 22000));
    const w = b.windowAround(10000, 15000, 15000); // [-5000, 25000]
    expect(w.text).toBe("avant le spectacle Le Cid après contexte");
  });

  it("excludes segments outside the window", () => {
    const b = new TranscriptBuffer();
    b.append(seg("trop tôt", 0, 1000));
    b.append(seg("au centre", 30000, 31000));
    const w = b.windowAround(30000, 5000, 5000); // [25000, 35000]
    expect(w.text).toBe("au centre");
  });

  it("evicts segments older than retention", () => {
    const b = new TranscriptBuffer(10000);
    b.append(seg("vieux", 0, 1000));
    b.append(seg("récent", 100000, 101000));
    const w = b.windowAround(0, 5000, 5000);
    expect(w.text).toBe(""); // "vieux" evicted once latest jumped to 101000
  });

  it("tracks latestT1", () => {
    const b = new TranscriptBuffer();
    expect(b.latestT1()).toBe(0);
    b.append(seg("a", 0, 500));
    b.append(seg("b", 1000, 2000));
    expect(b.latestT1()).toBe(2000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- TranscriptBuffer.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/services/liveassist/TranscriptBuffer.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- TranscriptBuffer.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/services/liveassist/TranscriptBuffer.ts __tests__/services/liveassist/TranscriptBuffer.test.ts
git commit -m "feat(live-assist): rolling transcript buffer"
```

---

### Task 3: KeywordDetector

**Files:**
- Create: `lib/services/liveassist/KeywordDetector.ts`
- Test: `__tests__/services/liveassist/KeywordDetector.test.ts`

**Interfaces:**
- Consumes: `TranscriptSegment` (Task 1)
- Produces:
  - type `KeywordHit = { providerId: string; keyword: string; tHit: number }`
  - class `KeywordDetector`
    - `constructor(keywordsByProvider: Record<string, string[]>)`
    - `scan(segment: TranscriptSegment): KeywordHit[]`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/services/liveassist/KeywordDetector.test.ts
import { KeywordDetector } from "@/lib/services/liveassist/KeywordDetector";

const seg = (text: string, t0 = 5000, t1 = 6000) => ({ text, t0, t1, final: true });

describe("KeywordDetector", () => {
  const detector = new KeywordDetector({
    poster: ["spectacle", "affiche"],
    definition: ["définition", "c'est quoi"],
  });

  it("matches a whole-word keyword, case/accent-insensitive", () => {
    const hits = detector.scan(seg("On parle du SPECTACLE de ce soir"));
    expect(hits).toEqual([{ providerId: "poster", keyword: "spectacle", tHit: 5000 }]);
  });

  it("does not match a keyword embedded in another word", () => {
    expect(detector.scan(seg("c'est de l'affichage urbain"))).toEqual([]);
  });

  it("matches a multi-word keyword", () => {
    const hits = detector.scan(seg("alors c'est quoi exactement"));
    expect(hits.map((h) => h.providerId)).toContain("definition");
  });

  it("returns one hit per matched keyword across providers", () => {
    const hits = detector.scan(seg("définition du spectacle"));
    expect(hits).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- KeywordDetector.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/services/liveassist/KeywordDetector.ts
import type { TranscriptSegment } from "@/lib/models/LiveAssist";

export type KeywordHit = { providerId: string; keyword: string; tHit: number };

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Escapes regex special chars in a literal keyword. */
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class KeywordDetector {
  private readonly entries: { providerId: string; keyword: string; re: RegExp }[] = [];

  constructor(keywordsByProvider: Record<string, string[]>) {
    for (const [providerId, keywords] of Object.entries(keywordsByProvider)) {
      for (const keyword of keywords) {
        // Whole-word match on normalized text (no accents). \b is unreliable
        // around apostrophes, so we anchor on non-letter boundaries.
        this.entries.push({
          providerId,
          keyword,
          re: new RegExp(`(^|[^a-z0-9])${escape(norm(keyword))}([^a-z0-9]|$)`, "i"),
        });
      }
    }
  }

  scan(segment: TranscriptSegment): KeywordHit[] {
    const text = norm(segment.text);
    const hits: KeywordHit[] = [];
    for (const { providerId, keyword, re } of this.entries) {
      if (re.test(text)) hits.push({ providerId, keyword, tHit: segment.t0 });
    }
    return hits;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- KeywordDetector.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/services/liveassist/KeywordDetector.ts __tests__/services/liveassist/KeywordDetector.test.ts
git commit -m "feat(live-assist): keyword detector (accent/whole-word)"
```

---

### Task 4: WindowScheduler

**Files:**
- Create: `lib/services/liveassist/WindowScheduler.ts`
- Test: `__tests__/services/liveassist/WindowScheduler.test.ts`

**Design note:** Time is driven by transcript timestamps, not wall-clock — a pending hit fires as soon as the buffer's `latestT1` reaches `tHit + afterMs` (i.e. the +15s of context has arrived). This makes it deterministic and timer-free. A separate wall-clock `flush(nowMs)` handles the case where speech stops (no further segments) after `WINDOW_MAX_WAIT_MS`.

**Interfaces:**
- Consumes: `KeywordHit` (Task 3)
- Produces:
  - type `ReadyWindow = { providerIds: string[]; tCenter: number }`
  - class `WindowScheduler`
    - `constructor(afterMs: number, maxWaitMs: number)`
    - `register(hit: KeywordHit, wallNowMs: number): void`
    - `collectReady(latestT1: number, wallNowMs: number): ReadyWindow[]` — returns + removes fired windows; coalesces hits within `afterMs` into one window keyed by `tCenter` (first hit time), merging providerIds.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/services/liveassist/WindowScheduler.test.ts
import { WindowScheduler } from "@/lib/services/liveassist/WindowScheduler";

describe("WindowScheduler", () => {
  it("does not fire before +afterMs of context arrives", () => {
    const s = new WindowScheduler(15000, 20000);
    s.register({ providerId: "poster", keyword: "spectacle", tHit: 10000 }, 0);
    expect(s.collectReady(20000, 1000)).toEqual([]); // latestT1=20000 < 25000
  });

  it("fires once context reaches tHit + afterMs", () => {
    const s = new WindowScheduler(15000, 20000);
    s.register({ providerId: "poster", keyword: "spectacle", tHit: 10000 }, 0);
    const ready = s.collectReady(25000, 1000);
    expect(ready).toEqual([{ providerIds: ["poster"], tCenter: 10000 }]);
  });

  it("coalesces nearby hits into one window, merging providerIds", () => {
    const s = new WindowScheduler(15000, 20000);
    s.register({ providerId: "poster", keyword: "spectacle", tHit: 10000 }, 0);
    s.register({ providerId: "definition", keyword: "définition", tHit: 12000 }, 0);
    const ready = s.collectReady(30000, 1000);
    expect(ready).toHaveLength(1);
    expect(ready[0].providerIds.sort()).toEqual(["definition", "poster"]);
  });

  it("fires by wall-clock max-wait when audio stops", () => {
    const s = new WindowScheduler(15000, 20000);
    s.register({ providerId: "poster", keyword: "spectacle", tHit: 10000 }, 1000);
    // latestT1 stuck at 12000 (<25000) but wall clock advanced past maxWait
    expect(s.collectReady(12000, 1000 + 20001)).toHaveLength(1);
  });

  it("each window fires only once", () => {
    const s = new WindowScheduler(15000, 20000);
    s.register({ providerId: "poster", keyword: "spectacle", tHit: 10000 }, 0);
    expect(s.collectReady(25000, 1000)).toHaveLength(1);
    expect(s.collectReady(25000, 1000)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- WindowScheduler.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/services/liveassist/WindowScheduler.ts
import type { KeywordHit } from "./KeywordDetector";

export type ReadyWindow = { providerIds: string[]; tCenter: number };

type Pending = { tCenter: number; providerIds: Set<string>; registeredWall: number };

export class WindowScheduler {
  private pending: Pending[] = [];

  constructor(
    private readonly afterMs: number,
    private readonly maxWaitMs: number,
  ) {}

  register(hit: KeywordHit, wallNowMs: number): void {
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- WindowScheduler.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/services/liveassist/WindowScheduler.ts __tests__/services/liveassist/WindowScheduler.test.ts
git commit -m "feat(live-assist): window scheduler (timestamp-driven + wall-clock flush)"
```

---

### Task 5: IntentExtractor

**Files:**
- Create: `lib/services/liveassist/IntentExtractor.ts`
- Test: `__tests__/services/liveassist/IntentExtractor.test.ts`

**Design note:** `generateObject` is injected (default = the real AI SDK call wired to `createAiModel()`), so tests pass a fake without hitting a model.

**Interfaces:**
- Produces:
  - type `IntentExtraction = { actionnable: boolean; intent: string; entite: string; confiance: number; raison?: string }`
  - type `GenerateObjectFn = (args: { schema: z.ZodTypeAny; prompt: string }) => Promise<{ object: unknown }>`
  - class `IntentExtractor`
    - `constructor(providerIds: string[], descriptions: Record<string, string>, generate?: GenerateObjectFn)`
    - `extract(windowText: string, candidateProviderIds: string[]): Promise<IntentExtraction>`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/services/liveassist/IntentExtractor.test.ts
import { IntentExtractor } from "@/lib/services/liveassist/IntentExtractor";

describe("IntentExtractor", () => {
  const descriptions = { poster: "Trouver l'affiche d'un spectacle/film", definition: "Définir un sujet" };

  it("returns the model's structured object", async () => {
    const fake = async () => ({ object: { actionnable: true, intent: "poster", entite: "Le Cid", confiance: 0.9 } });
    const x = new IntentExtractor(["poster", "definition"], descriptions, fake);
    const out = await x.extract("…le spectacle Le Cid…", ["poster"]);
    expect(out).toEqual({ actionnable: true, intent: "poster", entite: "Le Cid", confiance: 0.9 });
  });

  it("includes candidate providers and window text in the prompt", async () => {
    let seenPrompt = "";
    const fake = async ({ prompt }: { prompt: string }) => {
      seenPrompt = prompt;
      return { object: { actionnable: false, intent: "none", entite: "", confiance: 0 } };
    };
    const x = new IntentExtractor(["poster", "definition"], descriptions, fake);
    await x.extract("blabla contexte", ["definition"]);
    expect(seenPrompt).toContain("blabla contexte");
    expect(seenPrompt).toContain("definition");
  });

  it("coerces an invalid model object to non-actionnable", async () => {
    const fake = async () => ({ object: { garbage: true } });
    const x = new IntentExtractor(["poster"], descriptions, fake);
    const out = await x.extract("x", ["poster"]);
    expect(out.actionnable).toBe(false);
    expect(out.intent).toBe("none");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- IntentExtractor.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/services/liveassist/IntentExtractor.ts
import { z } from "zod";
import { generateObject } from "ai";
import { createAiModel } from "@/lib/services/ai/AiProviderFactory";
import { Logger } from "@/lib/utils/Logger";

const logger = new Logger("IntentExtractor");

export type IntentExtraction = {
  actionnable: boolean;
  intent: string;
  entite: string;
  confiance: number;
  raison?: string;
};

export type GenerateObjectFn = (args: {
  schema: z.ZodTypeAny;
  prompt: string;
}) => Promise<{ object: unknown }>;

const defaultGenerate: GenerateObjectFn = ({ schema, prompt }) =>
  generateObject({ model: createAiModel(), schema, prompt });

export class IntentExtractor {
  private readonly schema: z.ZodTypeAny;

  constructor(
    private readonly providerIds: string[],
    private readonly descriptions: Record<string, string>,
    private readonly generate: GenerateObjectFn = defaultGenerate,
  ) {
    this.schema = z.object({
      actionnable: z.boolean(),
      intent: z.enum([...providerIds, "none"] as [string, ...string[]]),
      entite: z.string(),
      confiance: z.number().min(0).max(1),
      raison: z.string().optional(),
    });
  }

  async extract(windowText: string, candidateProviderIds: string[]): Promise<IntentExtraction> {
    const catalogue = candidateProviderIds
      .map((id) => `- ${id} : ${this.descriptions[id] ?? id}`)
      .join("\n");

    const prompt = [
      "Tu analyses une transcription de plateau TV en français (parole, donc bruitée).",
      "Détermine s'il y a UNE action concrète à proposer parmi les intents candidats ci-dessous.",
      "Extrais l'entité concernée (titre de spectacle/film, sujet à définir). Si rien de clair, renvoie actionnable=false et intent='none'.",
      "",
      `Intents candidats :\n${catalogue}`,
      "",
      `Transcription (fenêtre) :\n"""${windowText}"""`,
    ].join("\n");

    try {
      const { object } = await this.generate({ schema: this.schema, prompt });
      return object as IntentExtraction;
    } catch (error) {
      logger.warn(`extraction failed, treating as non-actionnable: ${error instanceof Error ? error.message : error}`);
      return { actionnable: false, intent: "none", entite: "", confiance: 0 };
    }
  }
}
```

**Note:** the third test ("coerces an invalid model object") passes because the fake returns `{ garbage: true }`, which is returned as-is by the fake (no schema validation in the fake path) — so add a defensive parse. Update `extract` to validate the object and fall back:

```ts
      const parsed = this.schema.safeParse(object);
      if (!parsed.success) return { actionnable: false, intent: "none", entite: "", confiance: 0 };
      return parsed.data as IntentExtraction;
```

Replace `return object as IntentExtraction;` with the two lines above.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- IntentExtractor.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/services/liveassist/IntentExtractor.ts __tests__/services/liveassist/IntentExtractor.test.ts
git commit -m "feat(live-assist): LLM intent extractor (generateObject, injectable)"
```

---

### Task 6: ActionProvider interface + registry

**Files:**
- Create: `lib/services/liveassist/providers/ActionProvider.ts`
- Test: `__tests__/services/liveassist/providers/registry.test.ts`

**Interfaces:**
- Consumes: `Suggestion` (Task 1)
- Produces:
  - type `TranscriptWindow = { text: string; t0: number; t1: number }`
  - type `ApplyResult = { ok: boolean; message?: string }`
  - interface `ActionProvider { id: string; description: string; defaultKeywords: string[]; build(entity: string, window: TranscriptWindow): Promise<Omit<Suggestion, "id" | "status" | "createdAt"> | null>; apply(payload: Record<string, unknown>): Promise<ApplyResult>; }`
  - `class ProviderRegistry { register(p: ActionProvider): void; get(id: string): ActionProvider | undefined; all(): ActionProvider[]; ids(): string[]; descriptions(): Record<string,string>; }`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/services/liveassist/providers/registry.test.ts
import { ProviderRegistry, type ActionProvider } from "@/lib/services/liveassist/providers/ActionProvider";

const stub = (id: string): ActionProvider => ({
  id, description: `desc ${id}`, defaultKeywords: [id],
  build: async () => null,
  apply: async () => ({ ok: true }),
});

describe("ProviderRegistry", () => {
  it("registers and retrieves providers", () => {
    const r = new ProviderRegistry();
    r.register(stub("poster"));
    expect(r.get("poster")?.id).toBe("poster");
    expect(r.get("missing")).toBeUndefined();
  });

  it("exposes ids and descriptions", () => {
    const r = new ProviderRegistry();
    r.register(stub("poster"));
    r.register(stub("definition"));
    expect(r.ids().sort()).toEqual(["definition", "poster"]);
    expect(r.descriptions().poster).toBe("desc poster");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- registry.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/services/liveassist/providers/ActionProvider.ts
import type { Suggestion } from "@/lib/models/LiveAssist";

export type TranscriptWindow = { text: string; t0: number; t1: number };
export type ApplyResult = { ok: boolean; message?: string };
export type BuiltSuggestion = Omit<Suggestion, "id" | "status" | "createdAt">;

export interface ActionProvider {
  id: string;
  description: string;
  defaultKeywords: string[];
  build(entity: string, window: TranscriptWindow): Promise<BuiltSuggestion | null>;
  apply(payload: Record<string, unknown>): Promise<ApplyResult>;
}

export class ProviderRegistry {
  private readonly map = new Map<string, ActionProvider>();

  register(p: ActionProvider): void {
    this.map.set(p.id, p);
  }
  get(id: string): ActionProvider | undefined {
    return this.map.get(id);
  }
  all(): ActionProvider[] {
    return [...this.map.values()];
  }
  ids(): string[] {
    return [...this.map.keys()];
  }
  descriptions(): Record<string, string> {
    return Object.fromEntries(this.all().map((p) => [p.id, p.description]));
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- registry.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/services/liveassist/providers/ActionProvider.ts __tests__/services/liveassist/providers/registry.test.ts
git commit -m "feat(live-assist): ActionProvider interface + registry"
```

---

### Task 7: PosterActionProvider

**Files:**
- Create: `lib/services/liveassist/providers/PosterActionProvider.ts`
- Test: `__tests__/services/liveassist/providers/PosterActionProvider.test.ts`

**Design note:** the Wikipedia resolver and the poster-create fetch are injected so tests don't hit the network. The real wiring (Task 11) passes `WikipediaResolverService.getInstance()` and a fetch posting to the frontend posters endpoint (`POST {APP_URL}/api/assets/posters` with `{ title, fileUrl, type:'image', downloadToLocal:true }` — same payload `mcp-server/src/tools/posters.ts` uses).

**Interfaces:**
- Consumes: `ActionProvider`, `BuiltSuggestion` (Task 6); `WikipediaResult = { title; extract; thumbnail?; source }` (existing `lib/services/WikipediaResolverService.ts`)
- Produces:
  - type `Resolver = { resolveAndFetch(q: string): Promise<{ title: string; extract: string; thumbnail?: string }> }`
  - type `PosterCreator = (input: { title: string; fileUrl: string }) => Promise<{ ok: boolean; message?: string }>`
  - `class PosterActionProvider implements ActionProvider` — `constructor(resolver: Resolver, createPoster: PosterCreator)`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/services/liveassist/providers/PosterActionProvider.test.ts
import { PosterActionProvider } from "@/lib/services/liveassist/providers/PosterActionProvider";

describe("PosterActionProvider", () => {
  const window = { text: "…le spectacle Le Cid…", t0: 0, t1: 1 };

  it("builds an image suggestion when Wikipedia has a thumbnail", async () => {
    const resolver = { resolveAndFetch: async () => ({ title: "Le Cid", extract: "…", thumbnail: "http://x/p.jpg" }) };
    const p = new PosterActionProvider(resolver, async () => ({ ok: true }));
    const s = await p.build("Le Cid", window);
    expect(s?.preview).toEqual({ kind: "image", imageUrl: "http://x/p.jpg" });
    expect(s?.applyPayload).toEqual({ title: "Le Cid", fileUrl: "http://x/p.jpg" });
    expect(s?.intent).toBe("poster");
  });

  it("falls back to a manual-search text suggestion when no image", async () => {
    const resolver = { resolveAndFetch: async () => ({ title: "Le Cid", extract: "…", thumbnail: undefined }) };
    const p = new PosterActionProvider(resolver, async () => ({ ok: true }));
    const s = await p.build("Le Cid", window);
    expect(s?.preview.kind).toBe("text");
    expect(s?.applyPayload.fileUrl).toBeUndefined();
  });

  it("returns null when the resolver throws (not found)", async () => {
    const resolver = { resolveAndFetch: async () => { throw new Error("not found"); } };
    const p = new PosterActionProvider(resolver, async () => ({ ok: true }));
    expect(await p.build("Inexistant", window)).toBeNull();
  });

  it("apply calls the poster creator with payload", async () => {
    let called: unknown = null;
    const p = new PosterActionProvider(
      { resolveAndFetch: async () => ({ title: "x", extract: "", thumbnail: "u" }) },
      async (input) => { called = input; return { ok: true }; },
    );
    const r = await p.apply({ title: "Le Cid", fileUrl: "http://x/p.jpg" });
    expect(r.ok).toBe(true);
    expect(called).toEqual({ title: "Le Cid", fileUrl: "http://x/p.jpg" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- PosterActionProvider.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/services/liveassist/providers/PosterActionProvider.ts
import { LIVE_ASSIST } from "@/lib/config/Constants";
import { Logger } from "@/lib/utils/Logger";
import type { ActionProvider, ApplyResult, BuiltSuggestion, TranscriptWindow } from "./ActionProvider";

const logger = new Logger("PosterActionProvider");

export type Resolver = {
  resolveAndFetch(q: string): Promise<{ title: string; extract: string; thumbnail?: string }>;
};
export type PosterCreator = (input: { title: string; fileUrl: string }) => Promise<ApplyResult>;

export class PosterActionProvider implements ActionProvider {
  readonly id = "poster";
  readonly description = "Trouver l'affiche d'un spectacle/film/concert cité et l'ajouter aux posters";
  readonly defaultKeywords = LIVE_ASSIST.DEFAULT_KEYWORDS.poster;

  constructor(private readonly resolver: Resolver, private readonly createPoster: PosterCreator) {}

  async build(entity: string, window: TranscriptWindow): Promise<BuiltSuggestion | null> {
    let result;
    try {
      result = await this.resolver.resolveAndFetch(entity);
    } catch (error) {
      logger.info(`no Wikipedia result for "${entity}": ${error instanceof Error ? error.message : error}`);
      return null;
    }

    const base = {
      intent: this.id,
      entity,
      title: result.title,
      triggerExcerpt: window.text,
      confidence: 0,
    };

    if (result.thumbnail) {
      return {
        ...base,
        preview: { kind: "image", imageUrl: result.thumbnail },
        applyPayload: { title: result.title, fileUrl: result.thumbnail },
      };
    }
    // No image → propose manual search rather than nothing.
    return {
      ...base,
      preview: {
        kind: "text",
        text: `Affiche introuvable automatiquement. Recherche : https://www.google.com/search?tbm=isch&q=${encodeURIComponent(result.title + " affiche")}`,
      },
      applyPayload: { title: result.title },
    };
  }

  async apply(payload: Record<string, unknown>): Promise<ApplyResult> {
    const title = typeof payload.title === "string" ? payload.title : "";
    const fileUrl = typeof payload.fileUrl === "string" ? payload.fileUrl : "";
    if (!title || !fileUrl) return { ok: false, message: "Pas d'image à enregistrer (recherche manuelle)." };
    return this.createPoster({ title, fileUrl });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- PosterActionProvider.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/services/liveassist/providers/PosterActionProvider.ts __tests__/services/liveassist/providers/PosterActionProvider.test.ts
git commit -m "feat(live-assist): poster action provider (Wikipedia → create-poster)"
```

---

### Task 8: DefinitionActionProvider

**Files:**
- Create: `lib/services/liveassist/providers/DefinitionActionProvider.ts`
- Test: `__tests__/services/liveassist/providers/DefinitionActionProvider.test.ts`

**Design note:** "À l'antenne" reuses the existing lower-third-text path. The on-air call is injected (`onAir`). Real wiring (Task 11) inspects `mcp-server/src/tools/lower-third.ts` to find the exact frontend endpoint + payload `show-lower-third-text` uses and posts to it.

**Interfaces:**
- Consumes: `ActionProvider`, `Resolver` (Task 7 type shape reused)
- Produces:
  - type `OnAir = (text: string) => Promise<ApplyResult>`
  - `class DefinitionActionProvider implements ActionProvider` — `constructor(resolver: Resolver, onAir: OnAir, maxSentences?: number)`
  - apply payload shape: `{ target: 'pin' | 'on-air'; text: string }`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/services/liveassist/providers/DefinitionActionProvider.test.ts
import { DefinitionActionProvider } from "@/lib/services/liveassist/providers/DefinitionActionProvider";

describe("DefinitionActionProvider", () => {
  const window = { text: "c'est quoi la commedia dell'arte", t0: 0, t1: 1 };
  const resolver = {
    resolveAndFetch: async () => ({
      title: "Commedia dell'arte",
      extract: "Phrase un. Phrase deux. Phrase trois. Phrase quatre. Phrase cinq.",
      thumbnail: undefined,
    }),
  };

  it("builds a text suggestion truncated to N sentences", async () => {
    const p = new DefinitionActionProvider(resolver, async () => ({ ok: true }), 3);
    const s = await p.build("Commedia dell'arte", window);
    expect(s?.preview.kind).toBe("text");
    expect(s?.preview.text).toBe("Phrase un. Phrase deux. Phrase trois.");
    expect(s?.applyPayload).toEqual({ target: "pin", text: "Phrase un. Phrase deux. Phrase trois." });
  });

  it("pin apply is a no-op success", async () => {
    const p = new DefinitionActionProvider(resolver, async () => ({ ok: false, message: "should not call" }), 3);
    const r = await p.apply({ target: "pin", text: "x" });
    expect(r.ok).toBe(true);
  });

  it("on-air apply pushes the text to the lower third", async () => {
    let aired = "";
    const p = new DefinitionActionProvider(resolver, async (t) => { aired = t; return { ok: true }; }, 3);
    const r = await p.apply({ target: "on-air", text: "Définition courte" });
    expect(r.ok).toBe(true);
    expect(aired).toBe("Définition courte");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- DefinitionActionProvider.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/services/liveassist/providers/DefinitionActionProvider.ts
import { LIVE_ASSIST } from "@/lib/config/Constants";
import { Logger } from "@/lib/utils/Logger";
import type { ActionProvider, ApplyResult, BuiltSuggestion, TranscriptWindow } from "./ActionProvider";
import type { Resolver } from "./PosterActionProvider";

const logger = new Logger("DefinitionActionProvider");
export type OnAir = (text: string) => Promise<ApplyResult>;

/** Keep the first `n` sentences of an extract (cheap, no extra LLM call). */
function firstSentences(text: string, n: number): string {
  const parts = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  return parts.slice(0, n).join("").trim();
}

export class DefinitionActionProvider implements ActionProvider {
  readonly id = "definition";
  readonly description = "Donner une définition / du contexte sur un sujet évoqué";
  readonly defaultKeywords = LIVE_ASSIST.DEFAULT_KEYWORDS.definition;

  constructor(
    private readonly resolver: Resolver,
    private readonly onAir: OnAir,
    private readonly maxSentences = 3,
  ) {}

  async build(entity: string, window: TranscriptWindow): Promise<BuiltSuggestion | null> {
    let result;
    try {
      result = await this.resolver.resolveAndFetch(entity);
    } catch (error) {
      logger.info(`no Wikipedia result for "${entity}": ${error instanceof Error ? error.message : error}`);
      return null;
    }
    const text = firstSentences(result.extract, this.maxSentences);
    return {
      intent: this.id,
      entity,
      title: result.title,
      preview: { kind: "text", text },
      triggerExcerpt: window.text,
      applyPayload: { target: "pin", text },
      confidence: 0,
    };
  }

  async apply(payload: Record<string, unknown>): Promise<ApplyResult> {
    const target = payload.target === "on-air" ? "on-air" : "pin";
    const text = typeof payload.text === "string" ? payload.text : "";
    if (target === "pin") return { ok: true };
    if (!text) return { ok: false, message: "Texte vide." };
    return this.onAir(text);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- DefinitionActionProvider.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/services/liveassist/providers/DefinitionActionProvider.ts __tests__/services/liveassist/providers/DefinitionActionProvider.test.ts
git commit -m "feat(live-assist): definition action provider (pin + on-air)"
```

---

### Task 9: SuggestionStore (with dedup)

**Files:**
- Create: `lib/services/liveassist/SuggestionStore.ts`
- Test: `__tests__/services/liveassist/SuggestionStore.test.ts`

**Design note:** the publisher and an id+clock generator are injected for deterministic tests.

**Interfaces:**
- Consumes: `Suggestion`, `BuiltSuggestion` (Tasks 1/6); `LiveAssistEvent` (Task 1)
- Produces:
  - type `Publisher = (event: LiveAssistEvent) => void`
  - `class SuggestionStore` — `constructor(publish: Publisher, opts?: { dedupWindowMs?: number; now?: () => number; makeId?: () => string })`
    - `add(built: BuiltSuggestion): Suggestion | null` (null if deduped)
    - `list(): Suggestion[]`
    - `setStatus(id: string, status: Suggestion["status"]): Suggestion | undefined`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/services/liveassist/SuggestionStore.test.ts
import { SuggestionStore } from "@/lib/services/liveassist/SuggestionStore";

const built = (entity: string) => ({
  intent: "poster", entity, title: entity,
  preview: { kind: "image" as const, imageUrl: "u" },
  triggerExcerpt: "x", applyPayload: {}, confidence: 0.9,
});

describe("SuggestionStore", () => {
  it("adds a suggestion and publishes suggestion:new", () => {
    const events: any[] = [];
    let t = 1000;
    const store = new SuggestionStore((e) => events.push(e), { now: () => t, makeId: () => "id1" });
    const s = store.add(built("Le Cid"));
    expect(s?.id).toBe("id1");
    expect(s?.status).toBe("pending");
    expect(events[0]).toEqual({ type: "suggestion:new", payload: { suggestion: s } });
  });

  it("dedupes same (intent, entity) within the window", () => {
    let t = 1000;
    const store = new SuggestionStore(() => {}, { now: () => t, dedupWindowMs: 10000, makeId: () => String(t) });
    store.add(built("Le Cid"));
    t = 5000;
    expect(store.add(built("Le Cid"))).toBeNull(); // within 10s
    t = 20000;
    expect(store.add(built("Le Cid"))).not.toBeNull(); // window elapsed
  });

  it("setStatus updates and publishes suggestion:update", () => {
    const events: any[] = [];
    const store = new SuggestionStore((e) => events.push(e), { now: () => 1, makeId: () => "id1" });
    store.add(built("X"));
    const updated = store.setStatus("id1", "applied");
    expect(updated?.status).toBe("applied");
    expect(events.at(-1)).toEqual({ type: "suggestion:update", payload: { id: "id1", status: "applied" } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- SuggestionStore.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/services/liveassist/SuggestionStore.ts
import { randomUUID } from "crypto";
import { LIVE_ASSIST } from "@/lib/config/Constants";
import type { Suggestion, LiveAssistEvent } from "@/lib/models/LiveAssist";
import type { BuiltSuggestion } from "./providers/ActionProvider";

export type Publisher = (event: LiveAssistEvent) => void;

export class SuggestionStore {
  private readonly items: Suggestion[] = [];
  private readonly dedupWindowMs: number;
  private readonly now: () => number;
  private readonly makeId: () => string;

  constructor(
    private readonly publish: Publisher,
    opts: { dedupWindowMs?: number; now?: () => number; makeId?: () => string } = {},
  ) {
    this.dedupWindowMs = opts.dedupWindowMs ?? LIVE_ASSIST.DEDUP_WINDOW_MS;
    this.now = opts.now ?? Date.now;
    this.makeId = opts.makeId ?? randomUUID;
  }

  add(built: BuiltSuggestion): Suggestion | null {
    const t = this.now();
    const dup = this.items.find(
      (s) => s.intent === built.intent && s.entity === built.entity && t - s.createdAt < this.dedupWindowMs,
    );
    if (dup) return null;

    const suggestion: Suggestion = { ...built, id: this.makeId(), status: "pending", createdAt: t };
    this.items.unshift(suggestion);
    this.publish({ type: "suggestion:new", payload: { suggestion } });
    return suggestion;
  }

  list(): Suggestion[] {
    return [...this.items];
  }

  setStatus(id: string, status: Suggestion["status"]): Suggestion | undefined {
    const s = this.items.find((x) => x.id === id);
    if (!s) return undefined;
    s.status = status;
    this.publish({ type: "suggestion:update", payload: { id, status } });
    return s;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- SuggestionStore.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/services/liveassist/SuggestionStore.ts __tests__/services/liveassist/SuggestionStore.test.ts
git commit -m "feat(live-assist): suggestion store with dedup + publish"
```

---

### Task 10: ChannelManager.publishLiveAssist

**Files:**
- Modify: `lib/services/ChannelManager.ts` (add method near `publishToPresenter`, ~line 308)
- Test: `__tests__/services/ChannelManager.liveAssist.test.ts`

**Interfaces:**
- Consumes: `LiveAssistEvent` (Task 1), existing `WebSocketHub`
- Produces: `ChannelManager.publishLiveAssist(event: LiveAssistEvent): void` — broadcasts on `LIVE_ASSIST.CHANNEL` via `wsHub.broadcast` (no ack), mirroring `publishToPresenter`.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/services/ChannelManager.liveAssist.test.ts
import { ChannelManager } from "@/lib/services/ChannelManager";
import { WebSocketHub } from "@/lib/services/WebSocketHub";
import { LIVE_ASSIST } from "@/lib/config/Constants";

describe("ChannelManager.publishLiveAssist", () => {
  it("broadcasts the event on the live-assist channel without ack", () => {
    const spy = jest.spyOn(WebSocketHub.getInstance(), "broadcast").mockImplementation(() => {});
    const cm = ChannelManager.getInstance();
    cm.publishLiveAssist({ type: "stt:status", payload: { connected: true, device: "mic" } });
    expect(spy).toHaveBeenCalledWith(LIVE_ASSIST.CHANNEL, expect.objectContaining({ type: "stt:status" }));
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- ChannelManager.liveAssist.test.ts`
Expected: FAIL — `publishLiveAssist` is not a function.

- [ ] **Step 3: Add the method**

In `lib/services/ChannelManager.ts`, add the import at top:
```ts
import { WEBSOCKET, LIVE_ASSIST } from "../config/Constants";
import type { LiveAssistEvent } from "../models/LiveAssist";
```
(merge with the existing `WEBSOCKET` import line — don't duplicate it.)

Then add this method inside the class, after `publishToPresenter`:
```ts
  /**
   * Publish a Live Assist event (suggestions, STT status) on its dedicated
   * channel. No ack: dashboard panels are passive subscribers, like presenter.
   */
  publishLiveAssist(event: LiveAssistEvent): void {
    this.logger.debug(`Publishing to live-assist: ${event.type}`);
    this.wsHub.broadcast(LIVE_ASSIST.CHANNEL, {
      ...event,
      timestamp: Date.now(),
      id: randomUUID(),
    });
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- ChannelManager.liveAssist.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add lib/services/ChannelManager.ts __tests__/services/ChannelManager.liveAssist.test.ts
git commit -m "feat(live-assist): ChannelManager.publishLiveAssist (no-ack channel)"
```

---

### Task 11: LiveAssistOrchestrator (wiring)

**Files:**
- Create: `lib/services/liveassist/LiveAssistOrchestrator.ts`
- Test: `__tests__/services/liveassist/LiveAssistOrchestrator.test.ts`

**Interfaces:**
- Consumes: all Tasks 2–9 classes + `ProviderRegistry`
- Produces:
  - `class LiveAssistOrchestrator`
    - `constructor(deps: { detector; scheduler; buffer; extractor; registry; store; settings: { windowBeforeSec; windowAfterSec; confidenceThreshold }; now?: () => number })`
    - `ingestSegment(segment: TranscriptSegment): Promise<void>`
    - `setSttStatus(connected: boolean, device: string | null): void`
    - `getStatus(): { connected: boolean; device: string | null }`
  - `getLiveAssistOrchestrator(): LiveAssistOrchestrator` — singleton built from real services (used by the backend)

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/services/liveassist/LiveAssistOrchestrator.test.ts
import { LiveAssistOrchestrator } from "@/lib/services/liveassist/LiveAssistOrchestrator";
import { TranscriptBuffer } from "@/lib/services/liveassist/TranscriptBuffer";
import { KeywordDetector } from "@/lib/services/liveassist/KeywordDetector";
import { WindowScheduler } from "@/lib/services/liveassist/WindowScheduler";
import { ProviderRegistry } from "@/lib/services/liveassist/providers/ActionProvider";
import { SuggestionStore } from "@/lib/services/liveassist/SuggestionStore";

const seg = (text: string, t0: number, t1: number) => ({ text, t0, t1, final: true });

function makeOrchestrator(extractObj: any) {
  const buffer = new TranscriptBuffer();
  const detector = new KeywordDetector({ poster: ["spectacle"] });
  const scheduler = new WindowScheduler(15000, 20000);
  const registry = new ProviderRegistry();
  registry.register({
    id: "poster", description: "d", defaultKeywords: ["spectacle"],
    build: async (entity: string) => ({
      intent: "poster", entity, title: entity,
      preview: { kind: "image", imageUrl: "u" }, triggerExcerpt: "x", applyPayload: {}, confidence: 0,
    }),
    apply: async () => ({ ok: true }),
  });
  const events: any[] = [];
  const store = new SuggestionStore((e) => events.push(e), { now: () => 0, makeId: () => "id" });
  const extractor = { extract: async () => extractObj } as any;
  const orch = new LiveAssistOrchestrator({
    buffer, detector, scheduler, extractor, registry, store,
    settings: { windowBeforeSec: 15, windowAfterSec: 15, confidenceThreshold: 0.6 },
    now: () => 0,
  });
  return { orch, events };
}

describe("LiveAssistOrchestrator", () => {
  it("creates a suggestion when a keyword fires and the extractor is actionnable", async () => {
    const { orch, events } = makeOrchestrator({ actionnable: true, intent: "poster", entite: "Le Cid", confiance: 0.9 });
    await orch.ingestSegment(seg("le spectacle Le Cid", 10000, 11000));
    await orch.ingestSegment(seg("contexte qui suit", 26000, 27000)); // pushes latestT1 past 25000
    expect(events.some((e) => e.type === "suggestion:new")).toBe(true);
  });

  it("creates nothing when confidence is below threshold", async () => {
    const { orch, events } = makeOrchestrator({ actionnable: true, intent: "poster", entite: "Le Cid", confiance: 0.3 });
    await orch.ingestSegment(seg("le spectacle Le Cid", 10000, 11000));
    await orch.ingestSegment(seg("contexte", 26000, 27000));
    expect(events.some((e) => e.type === "suggestion:new")).toBe(false);
  });

  it("creates nothing when the extractor says non-actionnable", async () => {
    const { orch, events } = makeOrchestrator({ actionnable: false, intent: "none", entite: "", confiance: 0 });
    await orch.ingestSegment(seg("le spectacle Le Cid", 10000, 11000));
    await orch.ingestSegment(seg("contexte", 26000, 27000));
    expect(events.some((e) => e.type === "suggestion:new")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- LiveAssistOrchestrator.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- LiveAssistOrchestrator.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/services/liveassist/LiveAssistOrchestrator.ts __tests__/services/liveassist/LiveAssistOrchestrator.test.ts
git commit -m "feat(live-assist): orchestrator wiring (segment → suggestion)"
```

---

### Task 12: Backend router + boot + SettingsService methods

**Files:**
- Create: `server/api/live-assist.ts`
- Modify: `lib/services/SettingsService.ts` (add live-assist settings + STT device storage — mirror `getStudioReturnMonitors`/`saveStudioReturnMonitors`)
- Modify: `server/backend.ts` (register router in `setupApiRoutes`, build + set orchestrator in `start()`)
- Test: `__tests__/api/live-assist.backend.test.ts`

**Interfaces:**
- Consumes: orchestrator (Task 11), providers (Tasks 7/8), `WikipediaResolverService`, `ChannelManager.publishLiveAssist` (Task 10)
- Produces: Express router with:
  - `POST /api/stt/segment` → validate `TranscriptSegmentSchema` → `orchestrator.ingestSegment` ; `{ ok: true }`
  - `POST /api/stt/devices` → store via SettingsService ; `{ ok: true }`
  - `GET /api/stt/config` → `{ enabled, inputDevice, whisperModel }`
  - `GET /api/stt/status` → `orchestrator.getStatus()`
  - `GET /api/live-assist/suggestions` → `store.list()`
  - `POST /api/live-assist/suggestions/:id/apply` (body: edited payload) → provider.apply + `store.setStatus(id,'applied')`
  - `POST /api/live-assist/suggestions/:id/dismiss` → `store.setStatus(id,'dismissed')`
  - Also: function `buildOrchestrator(): { orchestrator, store }` that assembles real services, registers providers, calls `setLiveAssistOrchestrator`.

**SettingsService additions** (mirror the Studio Return monitor methods already in the file):
```ts
// lib/services/SettingsService.ts — add inside the class
private sttDevices: SttDevice[] = [];
getSttDevices(): SttDevice[] { return this.sttDevices; }
saveSttDevices(devices: SttDevice[]): void { this.sttDevices = devices; }
getLiveAssistSettings(): LiveAssistSettings {
  return LiveAssistSettingsSchema.parse(this.getJson("liveAssist") ?? {});
}
saveLiveAssistSettings(s: LiveAssistSettings): void { this.setJson("liveAssist", s); }
```
> Use the file's existing JSON settings accessors. Inspect the current persistence helpers in `SettingsService.ts` (e.g. how `general`/`obs` settings are read/written) and follow that exact pattern instead of `getJson`/`setJson` if the names differ. Import `SttDevice`, `LiveAssistSettings`, `LiveAssistSettingsSchema` from `@/lib/models/LiveAssist`.

- [ ] **Step 1: Write the failing test** (focus on the segment ingest + apply path using a minimal express app)

```ts
// __tests__/api/live-assist.backend.test.ts
import express from "express";
import request from "supertest";
import { createLiveAssistRouter } from "@/server/api/live-assist";

describe("live-assist backend router", () => {
  it("accepts a valid segment and forwards it to the orchestrator", async () => {
    const ingested: any[] = [];
    const orchestrator = {
      ingestSegment: async (s: any) => { ingested.push(s); },
      getStatus: () => ({ connected: true, device: "mic" }),
    } as any;
    const store = { list: () => [], setStatus: () => undefined } as any;
    const app = express().use(express.json()).use(createLiveAssistRouter({ orchestrator, store, registry: { get: () => undefined } as any }));

    const res = await request(app).post("/api/stt/segment").send({ text: "le spectacle", t0: 0, t1: 1000, final: true });
    expect(res.status).toBe(200);
    expect(ingested).toHaveLength(1);
  });

  it("rejects an invalid segment", async () => {
    const app = express().use(express.json()).use(createLiveAssistRouter({
      orchestrator: { ingestSegment: async () => {}, getStatus: () => ({}) } as any,
      store: { list: () => [], setStatus: () => undefined } as any,
      registry: { get: () => undefined } as any,
    }));
    const res = await request(app).post("/api/stt/segment").send({ text: "x", t0: 5000, t1: 1000, final: true });
    expect(res.status).toBe(400);
  });
});
```
> If `supertest` is not already a dev dependency, install it: `pnpm add -D supertest @types/supertest`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- live-assist.backend.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the router**

```ts
// server/api/live-assist.ts
import { Router } from "express";
import { TranscriptSegmentSchema, SttDeviceSchema } from "@/lib/models/LiveAssist";
import { z } from "zod";
import { SettingsService } from "@/lib/services/SettingsService";
import { ChannelManager } from "@/lib/services/ChannelManager";
import { WikipediaResolverService } from "@/lib/services/WikipediaResolverService";
import { LiveAssistOrchestrator, setLiveAssistOrchestrator } from "@/lib/services/liveassist/LiveAssistOrchestrator";
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

interface RouterDeps {
  orchestrator: Pick<LiveAssistOrchestrator, "ingestSegment" | "getStatus">;
  store: { list: () => unknown[]; setStatus: (id: string, status: "applied" | "dismissed") => unknown };
  registry: { get: (id: string) => { apply: (p: Record<string, unknown>) => Promise<{ ok: boolean; message?: string }> } | undefined };
}

export function createLiveAssistRouter(deps: RouterDeps): Router {
  const router = Router();
  const settings = SettingsService.getInstance();

  router.post("/api/stt/segment", async (req, res) => {
    const parsed = TranscriptSegmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid segment" });
    await deps.orchestrator.ingestSegment(parsed.data);
    res.json({ ok: true });
  });

  router.post("/api/stt/devices", (req, res) => {
    const parsed = z.array(SttDeviceSchema).safeParse(req.body?.devices);
    if (!parsed.success) return res.status(400).json({ error: "invalid devices" });
    settings.saveSttDevices(parsed.data);
    res.json({ ok: true });
  });

  router.get("/api/stt/config", (_req, res) => {
    const s = settings.getLiveAssistSettings();
    res.json({ enabled: s.enabled, inputDevice: s.inputDevice, whisperModel: s.whisperModel });
  });

  router.get("/api/stt/status", (_req, res) => res.json(deps.orchestrator.getStatus()));

  router.get("/api/live-assist/suggestions", (_req, res) => res.json({ suggestions: deps.store.list() }));

  router.post("/api/live-assist/suggestions/:id/apply", async (req, res) => {
    const provider = deps.registry.get(String(req.body?.intent ?? ""));
    if (!provider) return res.status(404).json({ error: "unknown provider" });
    const result = await provider.apply(req.body?.payload ?? {});
    if (!result.ok) return res.status(422).json({ error: result.message ?? "apply failed" });
    deps.store.setStatus(req.params.id, "applied");
    res.json({ ok: true });
  });

  router.post("/api/live-assist/suggestions/:id/dismiss", (req, res) => {
    deps.store.setStatus(req.params.id, "dismissed");
    res.json({ ok: true });
  });

  return router;
}

/** Assemble real services, register providers, wire the singleton. Called from backend boot. */
export function buildOrchestrator() {
  const settings = SettingsService.getInstance().getLiveAssistSettings();
  const cm = ChannelManager.getInstance();
  const resolver = WikipediaResolverService.getInstance();

  const registry = new ProviderRegistry();
  registry.register(
    new PosterActionProvider(resolver, async ({ title, fileUrl }) => {
      const r = await fetch(`${APP_URL}/api/assets/posters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, fileUrl, type: "image", downloadToLocal: true }),
      });
      return r.ok ? { ok: true } : { ok: false, message: `poster create failed (${r.status})` };
    }),
  );
  registry.register(
    new DefinitionActionProvider(resolver, async (text) => {
      // Reuse the existing lower-third text path. Inspect
      // mcp-server/src/tools/lower-third.ts for the exact endpoint + payload
      // that `show-lower-third-text` posts to, and mirror it here.
      const r = await fetch(`${APP_URL}/api/overlays/lower`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "show-text", payload: { text } }),
      });
      return r.ok ? { ok: true } : { ok: false, message: `lower-third failed (${r.status})` };
    }),
  );

  const store = new SuggestionStore((event) => cm.publishLiveAssist(event));
  const extractor = new IntentExtractor(registry.ids(), registry.descriptions());
  const orchestrator = new LiveAssistOrchestrator({
    buffer: new TranscriptBuffer(),
    detector: new KeywordDetector(settings.keywordsByProvider),
    scheduler: new WindowScheduler(settings.windowAfterSec * 1000, LIVE_ASSIST.WINDOW_MAX_WAIT_MS),
    extractor,
    registry,
    store,
    settings: {
      windowBeforeSec: settings.windowBeforeSec,
      windowAfterSec: settings.windowAfterSec,
      confidenceThreshold: settings.confidenceThreshold,
    },
  });
  setLiveAssistOrchestrator(orchestrator);
  return { orchestrator, store, registry };
}
```

- [ ] **Step 4: Wire into `server/backend.ts`**

Add import near the other route imports (~line 36):
```ts
import { createLiveAssistRouter, buildOrchestrator } from "./api/live-assist";
```
In `setupApiRoutes()`, before the 404 handler, add:
```ts
    // Live Assist (real-time listening assistant)
    const { orchestrator, store, registry } = buildOrchestrator();
    this.app.use(createLiveAssistRouter({ orchestrator, store, registry }));
    this.logger.info("✓ Live Assist routes configured");
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test -- live-assist.backend.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add server/api/live-assist.ts server/backend.ts lib/services/SettingsService.ts __tests__/api/live-assist.backend.test.ts
git commit -m "feat(live-assist): backend router + orchestrator boot + settings storage"
```

---

### Task 13: Next.js API proxies

**Files:**
- Create: `app/api/live-assist/suggestions/route.ts`
- Create: `app/api/live-assist/suggestions/[id]/apply/route.ts`
- Create: `app/api/live-assist/suggestions/[id]/dismiss/route.ts`
- Create: `app/api/settings/live-assist/route.ts`
- Test: `__tests__/api/live-assist.proxy.test.ts`

**Interfaces:**
- Consumes: backend routes (Task 12), `BACKEND_URL` from `@/lib/config/urls`, `withErrorHandler`/`withSimpleErrorHandler`, `ApiResponses` (existing), `SettingsService` for settings GET/POST.
- Produces: thin proxies. Settings route reads/writes via `SettingsService.getLiveAssistSettings/saveLiveAssistSettings` + returns `SttDevices` for the dropdown.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/api/live-assist.proxy.test.ts
import { GET as getSuggestions } from "@/app/api/live-assist/suggestions/route";

describe("live-assist proxy", () => {
  it("proxies suggestions list from the backend", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ suggestions: [{ id: "a" }] }), { status: 200 }),
    );
    const res = await getSuggestions(new Request("http://x/api/live-assist/suggestions"), { params: Promise.resolve({}) } as any);
    const body = await res.json();
    expect(body.suggestions).toHaveLength(1);
    fetchSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- live-assist.proxy.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the proxies**

```ts
// app/api/live-assist/suggestions/route.ts
import { withSimpleErrorHandler, ApiResponses } from "@/lib/utils/ApiResponses";
import { BACKEND_URL } from "@/lib/config/urls";

export const GET = withSimpleErrorHandler(async () => {
  const r = await fetch(`${BACKEND_URL}/api/live-assist/suggestions`);
  const data = await r.json();
  return ApiResponses.ok(data);
}, "[LiveAssistProxy]");
```

```ts
// app/api/live-assist/suggestions/[id]/apply/route.ts
import { withErrorHandler, ApiResponses, type RouteContext } from "@/lib/utils/ApiResponses";
import { BACKEND_URL } from "@/lib/config/urls";

export const POST = withErrorHandler(async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const body = await request.json();
  const r = await fetch(`${BACKEND_URL}/api/live-assist/suggestions/${id}/apply`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok) return ApiResponses.unprocessable((await r.json()).error ?? "apply failed");
  return ApiResponses.ok({ ok: true });
}, "[LiveAssistProxy]");
```

```ts
// app/api/live-assist/suggestions/[id]/dismiss/route.ts
import { withErrorHandler, ApiResponses, type RouteContext } from "@/lib/utils/ApiResponses";
import { BACKEND_URL } from "@/lib/config/urls";

export const POST = withErrorHandler(async (_request: Request, context: RouteContext) => {
  const { id } = await context.params;
  await fetch(`${BACKEND_URL}/api/live-assist/suggestions/${id}/dismiss`, { method: "POST" });
  return ApiResponses.ok({ ok: true });
}, "[LiveAssistProxy]");
```

```ts
// app/api/settings/live-assist/route.ts
import { z } from "zod";
import { withSimpleErrorHandler, ApiResponses } from "@/lib/utils/ApiResponses";
import { SettingsService } from "@/lib/services/SettingsService";
import { LiveAssistSettingsSchema } from "@/lib/models/LiveAssist";

export const GET = withSimpleErrorHandler(async () => {
  const svc = SettingsService.getInstance();
  return ApiResponses.ok({ settings: svc.getLiveAssistSettings(), devices: svc.getSttDevices() });
}, "[LiveAssistSettingsAPI]");

export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const settings = LiveAssistSettingsSchema.parse(body.settings ?? body);
  SettingsService.getInstance().saveLiveAssistSettings(settings);
  return ApiResponses.ok({ success: true });
}, "[LiveAssistSettingsAPI]");
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- live-assist.proxy.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add app/api/live-assist app/api/settings/live-assist __tests__/api/live-assist.proxy.test.ts
git commit -m "feat(live-assist): Next.js API proxies + settings route"
```

---

### Task 14: Panel + store + registry

**Files:**
- Modify: `lib/panels/registry.ts` (add `"liveAssist"` to `PANEL_IDS` + entry in `PANEL_REGISTRY`)
- Create: `lib/stores/liveAssistStore.ts`
- Create: `components/dashboard/panels/LiveAssistPanel.tsx`
- Create: `components/live-assist/SuggestionCard.tsx`
- Create: `components/live-assist/SttStatusBar.tsx`
- Modify: the panel component map (find where `SommairePanel` is registered for dockview — `components/shell/DashboardShell.tsx` or a `panelComponents` map — and add `liveAssist: LiveAssistPanel`)
- Test: `__tests__/components/SuggestionCard.test.tsx`

**Interfaces:**
- Consumes: `Suggestion`, `LiveAssistEvent` (Task 1), `useWebSocketChannel` (`@/hooks/useWebSocketChannel`), `BasePanelWrapper`/`PanelConfig` (`@/components/panels`), `apiGet`/`apiPost` (`@/lib/utils/ClientFetch`)
- Produces:
  - `useLiveAssistStore` (zustand) — `{ suggestions: Suggestion[]; status: {connected:boolean; device:string|null}; upsert; updateStatus; setStatusBar; setAll }`
  - `LiveAssistPanel` (dockview panel)
  - `SuggestionCard` — props `{ suggestion: Suggestion; onApply; onDismiss }`

- [ ] **Step 1: Add the panel id (registry)**

In `lib/panels/registry.ts`:
- Add `"liveAssist",` to the `PANEL_IDS` array.
- Add the icon import: `Headphones,` in the lucide import block.
- Add to `PANEL_REGISTRY`:
```ts
  liveAssist: {
    icon: Headphones,
    commandPaletteKeywords: ["panel", "widget", "assistant", "live", "écoute", "suggestions", "ai", "add"],
  },
```
(TypeScript will now error in any `Record<PanelId, …>` until the panel component is mapped — that's expected and fixed below.)

- [ ] **Step 2: Write the failing component test**

```tsx
// __tests__/components/SuggestionCard.test.tsx
/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";

// Repo convention (see __tests__/components/ChatMessagesPanel.test.tsx):
// mock next-intl so t("key") returns the key — no provider needed.
jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

import { SuggestionCard } from "@/components/live-assist/SuggestionCard";

const base = {
  id: "s1", intent: "poster", entity: "Le Cid", title: "Le Cid",
  preview: { kind: "image" as const, imageUrl: "http://x/p.jpg" },
  triggerExcerpt: "…le spectacle Le Cid…", applyPayload: { title: "Le Cid", fileUrl: "http://x/p.jpg" },
  status: "pending" as const, confidence: 0.9, createdAt: 1,
};

describe("SuggestionCard", () => {
  it("renders the title and an image preview", () => {
    render(<SuggestionCard suggestion={base} onApply={() => {}} onDismiss={() => {}} />);
    expect(screen.getByText("Le Cid")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("src", "http://x/p.jpg");
  });

  it("calls onApply with target 'pin' when the primary button is clicked", () => {
    const onApply = jest.fn();
    render(<SuggestionCard suggestion={base} onApply={onApply} onDismiss={() => {}} />);
    // mocked t() returns the key; poster's primary button label is "validate"
    fireEvent.click(screen.getByText("validate"));
    expect(onApply).toHaveBeenCalledWith(base, "pin");
  });

  it("shows an 'onAir' action for definition suggestions and calls onApply with 'on-air'", () => {
    const def = { ...base, intent: "definition", preview: { kind: "text" as const, text: "déf" }, applyPayload: { target: "pin", text: "déf" } };
    const onApply = jest.fn();
    render(<SuggestionCard suggestion={def} onApply={onApply} onDismiss={() => {}} />);
    fireEvent.click(screen.getByText("onAir")); // mocked t("onAir")
    expect(onApply).toHaveBeenCalledWith(def, "on-air");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test -- SuggestionCard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the store**

```ts
// lib/stores/liveAssistStore.ts
import { create } from "zustand";
import type { Suggestion } from "@/lib/models/LiveAssist";

interface LiveAssistState {
  suggestions: Suggestion[];
  status: { connected: boolean; device: string | null };
  setAll: (s: Suggestion[]) => void;
  upsert: (s: Suggestion) => void;
  updateStatus: (id: string, status: Suggestion["status"]) => void;
  setStatusBar: (connected: boolean, device: string | null) => void;
}

export const useLiveAssistStore = create<LiveAssistState>((set) => ({
  suggestions: [],
  status: { connected: false, device: null },
  setAll: (suggestions) => set({ suggestions }),
  upsert: (s) => set((st) => ({ suggestions: [s, ...st.suggestions.filter((x) => x.id !== s.id)] })),
  updateStatus: (id, status) =>
    set((st) => ({ suggestions: st.suggestions.map((x) => (x.id === id ? { ...x, status } : x)) })),
  setStatusBar: (connected, device) => set({ status: { connected, device } }),
}));
```

- [ ] **Step 5: Write the SuggestionCard**

```tsx
// components/live-assist/SuggestionCard.tsx
"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Suggestion } from "@/lib/models/LiveAssist";

interface Props {
  suggestion: Suggestion;
  onApply: (s: Suggestion, target: "pin" | "on-air") => void;
  onDismiss: (s: Suggestion) => void;
}

export function SuggestionCard({ suggestion: s, onApply, onDismiss }: Props) {
  const t = useTranslations("dashboard.liveAssist");
  const dimmed = s.status !== "pending";
  return (
    <div className={`rounded border p-3 flex flex-col gap-2 ${dimmed ? "opacity-40" : ""}`}>
      <div className="flex items-center gap-2">
        <span>{s.intent === "poster" ? "🎭" : "📖"}</span>
        <span className="font-medium">{s.title}</span>
      </div>
      {s.preview.kind === "image" && s.preview.imageUrl ? (
        <img src={s.preview.imageUrl} alt={s.title} className="max-h-40 rounded object-contain" />
      ) : (
        <p className="text-sm text-muted-foreground">{s.preview.text}</p>
      )}
      <p className="text-xs italic opacity-60">{s.triggerExcerpt}</p>
      {!dimmed && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onApply(s, "pin")}>
            {s.intent === "definition" ? t("pin") : t("validate")}
          </Button>
          {s.intent === "definition" && (
            <Button size="sm" variant="outline" onClick={() => onApply(s, "on-air")}>
              {t("onAir")}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onDismiss(s)}>
            {t("dismiss")}
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Write the SttStatusBar + LiveAssistPanel**

```tsx
// components/live-assist/SttStatusBar.tsx
"use client";
import { useTranslations } from "next-intl";
import { useLiveAssistStore } from "@/lib/stores/liveAssistStore";

export function SttStatusBar() {
  const t = useTranslations("dashboard.liveAssist");
  const status = useLiveAssistStore((s) => s.status);
  return (
    <div className="flex items-center gap-2 text-xs px-3 py-2 border-b">
      <span>{status.connected ? "🟢" : "🔴"}</span>
      <span>{status.connected ? (status.device ?? t("connected")) : t("disconnected")}</span>
    </div>
  );
}
```

```tsx
// components/dashboard/panels/LiveAssistPanel.tsx
"use client";
import { useCallback, useEffect } from "react";
import { type IDockviewPanelProps } from "dockview-react";
import { BasePanelWrapper, type PanelConfig } from "@/components/panels";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";
import { apiGet, apiPost } from "@/lib/utils/ClientFetch";
import { useLiveAssistStore } from "@/lib/stores/liveAssistStore";
import { SuggestionCard } from "@/components/live-assist/SuggestionCard";
import { SttStatusBar } from "@/components/live-assist/SttStatusBar";
import type { LiveAssistEvent, Suggestion } from "@/lib/models/LiveAssist";

const config: PanelConfig = { id: "liveAssist", context: "dashboard" };

export function LiveAssistPanel(_props: IDockviewPanelProps) {
  const { suggestions, setAll, upsert, updateStatus, setStatusBar } = useLiveAssistStore();

  useEffect(() => {
    apiGet<{ suggestions: Suggestion[] }>("/api/live-assist/suggestions")
      .then((d) => setAll(d.suggestions ?? []))
      .catch(() => {});
  }, [setAll]);

  const handleEvent = useCallback(
    (e: LiveAssistEvent) => {
      if (e.type === "suggestion:new") upsert(e.payload.suggestion);
      else if (e.type === "suggestion:update") updateStatus(e.payload.id, e.payload.status);
      else if (e.type === "stt:status") setStatusBar(e.payload.connected, e.payload.device);
    },
    [upsert, updateStatus, setStatusBar],
  );
  useWebSocketChannel<LiveAssistEvent>("live-assist", handleEvent, { logPrefix: "LiveAssistPanel" });

  const onApply = useCallback((s: Suggestion, target: "pin" | "on-air") => {
    const payload = s.intent === "definition" ? { ...s.applyPayload, target } : s.applyPayload;
    apiPost(`/api/live-assist/suggestions/${s.id}/apply`, { intent: s.intent, payload }).catch(() => {});
  }, []);
  const onDismiss = useCallback((s: Suggestion) => {
    apiPost(`/api/live-assist/suggestions/${s.id}/dismiss`, {}).catch(() => {});
  }, []);

  return (
    <BasePanelWrapper config={config}>
      <div className="flex flex-col h-full">
        <SttStatusBar />
        <div className="flex flex-col gap-2 p-3 overflow-auto">
          {suggestions.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} onApply={onApply} onDismiss={onDismiss} />
          ))}
        </div>
      </div>
    </BasePanelWrapper>
  );
}
```

- [ ] **Step 7: Map the panel component**

Find where dockview maps panel ids → components (search for `SommairePanel` usage: `grep -rn "SommairePanel" components/`). In that map add:
```tsx
import { LiveAssistPanel } from "@/components/dashboard/panels/LiveAssistPanel";
// …
liveAssist: LiveAssistPanel,
```
This resolves the `Record<PanelId, …>` TS error from Step 1.

- [ ] **Step 8: Run tests + type-check touched files**

Run: `pnpm test -- SuggestionCard.test.tsx`
Expected: PASS (3 tests).
Run: `pnpm type-check 2>&1 | grep -i liveassist` → expect no errors mentioning the new files.

- [ ] **Step 9: Commit**

```bash
git add lib/panels/registry.ts lib/stores/liveAssistStore.ts components/live-assist components/dashboard/panels/LiveAssistPanel.tsx __tests__/components/SuggestionCard.test.tsx
git add -u  # the panel-map file
git commit -m "feat(live-assist): dashboard panel, suggestion cards, store, registry"
```

---

### Task 15: Settings page + i18n

**Files:**
- Create: `components/settings/LiveAssistSettings.tsx`
- Create: `app/[locale]/settings/live-assist/page.tsx`
- Modify: the settings sidebar list (search where `studio-return` settings link lives — `components/dashboard/AdminSidebar.tsx` or a settings nav config — add a `live-assist` entry)
- Modify: `messages/fr.json`, `messages/en.json` (add `dashboard.liveAssist.*` + `settings.liveAssist.*` keys used above)
- Test: `__tests__/components/LiveAssistSettings.test.tsx`

**Interfaces:**
- Consumes: `useSettings` (`@/lib/hooks/useSettings`), `LiveAssistSettings`, `SttDevice` (Task 1)
- Produces: a settings form (enabled toggle, device dropdown from reported `devices`, whisper model, keyword editor per provider as comma-separated inputs, window before/after, confidence threshold).

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/components/LiveAssistSettings.test.tsx
/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";

// Repo convention: mock next-intl so t("key") returns the key (no provider).
jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

import { LiveAssistSettings } from "@/components/settings/LiveAssistSettings";

describe("LiveAssistSettings", () => {
  it("renders the device dropdown from reported devices", async () => {
    // useSettings and the devices effect both GET /api/settings/live-assist
    // via apiGet → fetch; one mock response feeds both.
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        settings: { enabled: false, inputDevice: null, whisperModel: "large-v3", keywordsByProvider: { poster: ["spectacle"] }, windowBeforeSec: 15, windowAfterSec: 15, confidenceThreshold: 0.6 },
        devices: [{ id: "mic1", label: "USB Mic" }],
      }), { status: 200 }),
    );
    render(<LiveAssistSettings />);
    await waitFor(() => expect(screen.getByText("USB Mic")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- LiveAssistSettings.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the settings component**

```tsx
// components/settings/LiveAssistSettings.tsx
"use client";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSettings } from "@/lib/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/utils/ClientFetch";
import type { LiveAssistSettings as Settings, SttDevice } from "@/lib/models/LiveAssist";

export function LiveAssistSettings() {
  const t = useTranslations("settings.liveAssist");
  const [devices, setDevices] = useState<SttDevice[]>([]);

  const { data, setData, saving, save } = useSettings<{ settings: Settings; devices: SttDevice[] }, Settings>({
    endpoint: "/api/settings/live-assist",
    initialState: {
      enabled: false, inputDevice: null, whisperModel: "large-v3",
      keywordsByProvider: { poster: [], definition: [] },
      windowBeforeSec: 15, windowAfterSec: 15, confidenceThreshold: 0.6,
    },
    fromResponse: (res) => res.settings,
    toPayload: (state) => ({ settings: state }),
  });

  useEffect(() => {
    apiGet<{ devices: SttDevice[] }>("/api/settings/live-assist").then((r) => setDevices(r.devices ?? [])).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <h2 className="text-lg font-semibold">{t("title")}</h2>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={data.enabled} onChange={(e) => setData({ ...data, enabled: e.target.checked })} />
        {t("enabled")}
      </label>

      <label className="flex flex-col gap-1">
        {t("device")}
        <select value={data.inputDevice ?? ""} onChange={(e) => setData({ ...data, inputDevice: e.target.value || null })}>
          <option value="">—</option>
          {devices.map((d) => (<option key={d.id} value={d.id}>{d.label}</option>))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        {t("model")}
        <input value={data.whisperModel} onChange={(e) => setData({ ...data, whisperModel: e.target.value })} />
      </label>

      {Object.entries(data.keywordsByProvider).map(([provider, words]) => (
        <label key={provider} className="flex flex-col gap-1">
          {t("keywords")} — {provider}
          <input
            value={words.join(", ")}
            onChange={(e) => setData({ ...data, keywordsByProvider: { ...data.keywordsByProvider, [provider]: e.target.value.split(",").map((w) => w.trim()).filter(Boolean) } })}
          />
        </label>
      ))}

      <div className="flex gap-3">
        <label className="flex flex-col gap-1">{t("windowBefore")}
          <input type="number" value={data.windowBeforeSec} onChange={(e) => setData({ ...data, windowBeforeSec: Number(e.target.value) })} />
        </label>
        <label className="flex flex-col gap-1">{t("windowAfter")}
          <input type="number" value={data.windowAfterSec} onChange={(e) => setData({ ...data, windowAfterSec: Number(e.target.value) })} />
        </label>
        <label className="flex flex-col gap-1">{t("threshold")}
          <input type="number" step="0.05" min="0" max="1" value={data.confidenceThreshold} onChange={(e) => setData({ ...data, confidenceThreshold: Number(e.target.value) })} />
        </label>
      </div>

      <Button onClick={save} disabled={saving}>{t("save")}</Button>
    </div>
  );
}
```

- [ ] **Step 4: Write the page + sidebar + i18n**

```tsx
// app/[locale]/settings/live-assist/page.tsx
import { LiveAssistSettings } from "@/components/settings/LiveAssistSettings";
export default function Page() {
  return <LiveAssistSettings />;
}
```

Add to `messages/fr.json` (and English equivalents in `messages/en.json`):
```json
"dashboard": {
  "liveAssist": {
    "validate": "Valider", "pin": "Épingler", "onAir": "À l'antenne", "dismiss": "Ignorer",
    "connected": "Connecté", "disconnected": "STT déconnecté"
  }
},
"settings": {
  "liveAssist": {
    "title": "Assistant Live", "enabled": "Activé", "device": "Micro d'entrée",
    "model": "Modèle Whisper", "keywords": "Mots-clés", "windowBefore": "Avant (s)",
    "windowAfter": "Après (s)", "threshold": "Seuil de confiance", "save": "Enregistrer"
  }
}
```
> Merge these into the existing `dashboard`/`settings` objects (don't create duplicate top-level keys). Add the settings sidebar link next to the Studio Return entry (search: `grep -rn "studio-return" components/dashboard/AdminSidebar.tsx`).

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test -- LiveAssistSettings.test.tsx`
Expected: PASS (1 test).
Run: `pnpm test -- i18n` (if an i18n completeness test exists) → expect PASS (fr/en parity).

- [ ] **Step 6: Commit**

```bash
git add components/settings/LiveAssistSettings.tsx app/[locale]/settings/live-assist messages/fr.json messages/en.json
git add -u  # sidebar file
git commit -m "feat(live-assist): settings page, device dropdown, keyword editor, i18n"
```

---

### Task 16: Python STT service

**Files:**
- Create: `realtime-stt/stt/segmenter.py` (pure logic), `realtime-stt/tests/test_segmenter.py`
- Create: `realtime-stt/main.py`, `realtime-stt/requirements.txt`, `realtime-stt/config.example.json`, `realtime-stt/README.md`

**Interfaces:**
- Produces (HTTP contract, already consumed by Task 12): `POST {backend}/api/stt/segment` with `{ text, t0, t1, final, confidence? }` ; `POST {backend}/api/stt/devices` with `{ devices: [{ id, label }] }` ; polls `GET {backend}/api/stt/config`.
- `segmenter.build_segment(text, t0_ms, t1_ms, final, confidence=None) -> dict` — pure, validated payload builder (the unit under test).

- [ ] **Step 1: Write the failing test**

```python
# realtime-stt/tests/test_segmenter.py
from stt.segmenter import build_segment

def test_build_segment_shape():
    seg = build_segment("le spectacle", 1000, 2500, True, 0.9)
    assert seg == {"text": "le spectacle", "t0": 1000, "t1": 2500, "final": True, "confidence": 0.9}

def test_build_segment_omits_confidence_when_none():
    seg = build_segment("x", 0, 100, False)
    assert "confidence" not in seg
    assert seg["final"] is False

def test_build_segment_rejects_backwards_window():
    import pytest
    with pytest.raises(ValueError):
        build_segment("x", 5000, 1000, True)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd realtime-stt && python -m pytest tests/test_segmenter.py -v`
Expected: FAIL — `ModuleNotFoundError: stt.segmenter`.

- [ ] **Step 3: Write the pure segmenter**

```python
# realtime-stt/stt/segmenter.py
def build_segment(text, t0_ms, t1_ms, final, confidence=None):
    """Build a transcript-segment payload matching TranscriptSegmentSchema."""
    if t1_ms < t0_ms:
        raise ValueError("t1 must be >= t0")
    seg = {"text": text, "t0": int(t0_ms), "t1": int(t1_ms), "final": bool(final)}
    if confidence is not None:
        seg["confidence"] = float(confidence)
    return seg
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd realtime-stt && python -m pytest tests/test_segmenter.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Write main.py + requirements + config + README**

```python
# realtime-stt/main.py
"""Real-time French STT bridge: mic capture → VAD → faster-whisper → POST segments.
Capture + inference only — all logic lives in the Node backend (per the spec)."""
import json, os, time, threading
import numpy as np
import sounddevice as sd
import httpx
from faster_whisper import WhisperModel
from stt.segmenter import build_segment

def load_config():
    cfg = {"backend": "http://127.0.0.1:3002"}
    path = os.path.join(os.path.dirname(__file__), "config.json")
    if os.path.exists(path):
        cfg.update(json.load(open(path, encoding="utf-8")))
    return cfg

def report_devices(backend):
    devices = [{"id": str(i), "label": d["name"]}
               for i, d in enumerate(sd.query_devices()) if d["max_input_channels"] > 0]
    try:
        httpx.post(f"{backend}/api/stt/devices", json={"devices": devices}, timeout=5)
    except Exception as e:
        print(f"[stt] device report failed: {e}")

def fetch_config(backend):
    try:
        return httpx.get(f"{backend}/api/stt/config", timeout=5).json()
    except Exception:
        return {"enabled": False, "inputDevice": None, "whisperModel": "large-v3"}

def run():
    cfg = load_config()
    backend = cfg["backend"]
    report_devices(backend)
    remote = fetch_config(backend)
    model = WhisperModel(remote.get("whisperModel", "large-v3"), device="cuda", compute_type="int8")
    sample_rate = 16000
    capture_start = time.monotonic()
    device_index = int(remote["inputDevice"]) if remote.get("inputDevice") else None

    # VAD-gated chunking: accumulate speech, transcribe on a silence boundary.
    # (Use silero-vad or webrtcvad here; pseudocode loop kept minimal.)
    buffer = []
    def callback(indata, frames, t, status):
        buffer.append(indata.copy())

    with sd.InputStream(samplerate=sample_rate, channels=1, dtype="float32",
                        device=device_index, callback=callback):
        print(f"[stt] listening on device {device_index}")
        while True:
            time.sleep(2.0)  # batch ~2s of audio; replace with VAD silence detection
            if not buffer:
                continue
            audio = np.concatenate(buffer).flatten()
            buffer.clear()
            t1_ms = int((time.monotonic() - capture_start) * 1000)
            t0_ms = t1_ms - int(len(audio) / sample_rate * 1000)
            segments, _ = model.transcribe(audio, language="fr", vad_filter=True)
            text = " ".join(s.text.strip() for s in segments).strip()
            if not text:
                continue
            seg = build_segment(text, t0_ms, t1_ms, True)
            try:
                httpx.post(f"{backend}/api/stt/segment", json=seg, timeout=5)
            except Exception as e:
                print(f"[stt] segment post failed: {e}")

if __name__ == "__main__":
    run()
```

```txt
# realtime-stt/requirements.txt
faster-whisper>=1.0
sounddevice>=0.4
httpx>=0.27
numpy>=1.26
```

```json
// realtime-stt/config.example.json
{ "backend": "http://127.0.0.1:3002" }
```

```md
<!-- realtime-stt/README.md -->
# realtime-stt

Mic → VAD → faster-whisper (FR) → POST segments to the OBS Live Suite backend.

## Setup
    cd realtime-stt
    python -m venv .venv && .venv/Scripts/activate   # Windows
    pip install -r requirements.txt
    cp config.example.json config.json   # edit backend URL if needed

## Run
    python main.py

Picks the input device from Settings > Assistant Live (reported back to the dashboard).
The `+15s` window logic and all action decisions live in the Node backend — this service
only captures and transcribes. Replaceable in Rust later behind the same `/api/stt/segment` contract.
```

> **Note:** the 2s batch loop is a minimal placeholder. Replace with proper VAD silence-boundary chunking (silero-vad via `onnxruntime`, or `webrtcvad`) so segment timestamps align with utterance boundaries — this is what makes the −15/+15 window accurate. Keep `build_segment` as the single payload builder (already tested).

- [ ] **Step 6: Commit**

```bash
git add realtime-stt
git commit -m "feat(live-assist): Python STT service (capture + faster-whisper + segment contract)"
```

---

### Task 17: Deployment wiring (dev:stt + PM2)

**Files:**
- Modify: `package.json` (add `dev:stt` script; add it to the `dev` concurrently command)
- Modify: `ecosystem.config.cjs` (add `obs-stt` app, mirroring `obs-mcp`)
- Modify: `CLAUDE.md` (one line under the realtime/STT section)

- [ ] **Step 1: Add the dev script**

In `package.json` scripts, add:
```json
"dev:stt": "cd realtime-stt && python main.py",
```
And include it in the concurrently `dev` command (mirror how `dev:mcp` is added — same `concurrently` invocation), e.g.:
```json
"dev": "concurrently -n frontend,backend,mcp,stt -c blue,green,magenta,cyan \"pnpm dev:frontend\" \"pnpm dev:backend\" \"pnpm dev:mcp\" \"pnpm dev:stt\"",
```
> Inspect the current `dev` line and extend it; keep existing names/colors.

- [ ] **Step 2: Add the PM2 app**

In `ecosystem.config.cjs`, mirror the `obs-mcp` app entry:
```js
{
  name: "obs-stt",
  cwd: "./realtime-stt",
  script: "main.py",
  interpreter: "python",
  autorestart: true,
  max_memory_restart: "1500M",
},
```

- [ ] **Step 3: Verify (no build)**

Run: `pnpm test` (full suite) — expect all new tests green, no regressions.
Run: `node -e "require('./ecosystem.config.cjs')"` — expect no syntax error.

- [ ] **Step 4: Commit**

```bash
git add package.json ecosystem.config.cjs CLAUDE.md
git commit -m "chore(live-assist): dev:stt script + PM2 obs-stt app"
```

---

## Self-review

**Spec coverage:** capture+STT (Task 16) · contrat segment (Tasks 1/12/16) · buffer (2) · détecteurs keyword-gated (3) · fenêtre −15/+15 + attente contexte (4/11) · extracteur LLM cloud via `createAiModel` (5) · ActionProvider 1-fichier (6) · Affiche (7) · Définition pin+antenne (8) · dédup (9) · canal `live-assist` no-ack (10) · orchestrateur (11) · backend routes + boot + settings (12) · proxies Next (13) · panel+store+registry (14) · settings+i18n (15) · déploiement dev:stt+PM2 (17) · two-pass = option hors-v1 (non planifié, conforme au spec). **Aucun trou.**

**Placeholder scan:** le seul "placeholder" assumé est la boucle VAD du `main.py` Python (batch 2s), explicitement signalé comme à remplacer par du VAD réel — la logique testée (`build_segment`) est complète. Les endpoints réutilisés non encore pinés (lower-third `show-text`) ont une étape d'inspection précise (`mcp-server/src/tools/lower-third.ts`).

**Type consistency:** `BuiltSuggestion = Omit<Suggestion,"id"|"status"|"createdAt">` cohérent entre Tasks 6/7/8/9 ; `store.add(built + {confidence})` (Task 11) correspond à la signature `SuggestionStore.add` (Task 9) ; `publishLiveAssist(event)` (Task 10) ↔ `Publisher` (Task 9) ↔ `LiveAssistEvent` (Task 1) ; `IntentExtraction.entite/intent/confiance` cohérent entre Tasks 5/11 ; canal `"live-assist"` identique partout (Task 1 store events, Task 10 broadcast, Task 14 subscribe).
