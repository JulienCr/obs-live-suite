# Assistant Live — écoute temps réel + suggestions d'actions

**Date :** 2026-06-24
**Statut :** Design validé (brainstorming) — prêt pour plan d'implémentation
**Périmètre de ce spec :** v1 (pipeline complet + 2 providers). Instagram = phase 2 (spec séparé).

---

## 1. Objectif

Un système qui **écoute en continu** ce qui se dit sur le plateau (micro dédié), le
transcrit en français, et **propose** (jamais n'exécute automatiquement) des actions
contextuelles à l'opérateur régie :

- On parle d'un **spectacle/film** → trouver l'affiche → proposer de l'ajouter (poster).
- On **s'interroge sur un sujet** → trouver une définition / du contexte → fiche de référence.
- (Phase 2) On cite un **pseudo Instagram** → screenshot du compte → proposer de l'ajouter.

Toujours **humain dans la boucle** : chaque proposition arrive sous forme de carte
avec **Valider / Éditer / Ignorer**.

---

## 2. Décisions de design (résumé)

| Sujet | Décision |
|---|---|
| Source audio | **Micro plateau dédié** (périphérique d'entrée, voix propre sans musique) |
| Moteur STT | **faster-whisper local (GPU)**, `large-v3`/`distil-large`, partiels + finaux |
| Capture | **Le service Python possède la capture** (`sounddevice`) — pas de plomberie audio inter-process |
| Déclenchement | **Hybride keyword-gated** : détecteurs de mots-clés → fenêtre **−15s/+15s** → LLM |
| Cerveau de détection | **Extraction structurée** (`generateObject` + schéma Zod), **pas** d'agent à outils |
| Placement LLM | **STT local + extracteur LLM cloud** (petit modèle), via `createAiModel()` → **basculable en local par réglage** |
| Surface UI | **Panel Dockview dédié « Assistant Live »** (flux de cartes) |
| Action Affiche | `apply` = `create-poster { type:'image', downloadToLocal:true }` |
| Action Définition | **Fiche épinglée par défaut** + bouton secondaire **« À l'antenne »** (`show-lower-third-text`) |
| Déploiement Python | **Calque le serveur MCP** : `pnpm dev:stt` (concurrently) + app `obs-stt` dans PM2 |
| Périmètre v1 | Pipeline + `PosterActionProvider` + `DefinitionActionProvider` + panel + settings |

---

## 3. Architecture (processus)

```
┌─ Python: realtime-stt (GPU) ──────┐      ┌─ Node backend (Express :3002, persistant) ────────┐
│ sounddevice (micro choisi)        │ HTTP │ LiveAssistOrchestrator                              │
│  → VAD (silero/webrtcvad)         │ POST │  ├ TranscriptBuffer  (fenêtre glissante ~2 min)     │
│  → faster-whisper (large-v3)      │─────►│  ├ KeywordDetector   (liste configurable / intent)  │
│  → segments {text, t0, t1, final} │      │  ├ WindowScheduler   (déclenche à t_mot + 15s)      │
│  → énumère + reporte les devices  │      │  ├ IntentExtractor   (createAiModel + generateObject)│
└───────────────────────────────────┘      │  ├ ActionProvider[]  (Affiche, Définition…)         │
                                            │  └ SuggestionStore   → ChannelManager.publish        │
                                            └───────────────────────────────┬─────────────────────┘
                                                       WebSocket hub :3003   │  (channel 'live-assist')
                                                  ┌────────────────────────▼─────────────────────┐
                                                  │ Next.js :3000 — panel « Assistant Live »      │
                                                  │  liveAssistStore (zustand)                     │
                                                  │  cartes : Valider / Éditer / Ignorer           │
                                                  └────────────────────────────────────────────────┘
```

**Principe :** le pipeline *stateful* (buffer, timers, LLM, providers) vit dans le **backend
Express** (comme les autres services persistants), pas dans Next.js. Le service **Python ne
fait que capture + STT** (zéro logique métier) et reporte les périphériques au backend —
exactement comme **Studio Return** reporte les moniteurs. Next.js ne fait que **rendre le panel**
et **proxyfier** les actions validate/dismiss.

---

## 4. Flux de données (une suggestion, bout en bout)

1. Python émet un **segment finalisé** → `POST /api/stt/segment` (backend).
2. `TranscriptBuffer.append(segment)` — garde ~2 min horodatées (horloge audio, ms depuis début capture).
3. `KeywordDetector.scan(segment)` : si un mot-clé matche (`spectacle`, `affiche`, `définition`,
   `instagram`…), il **planifie un window job** à `t_mot + windowAfterSec`.
4. À l'échéance (quand le buffer contient des segments jusqu'à `t_mot + 15s`), `WindowScheduler`
   assemble la **fenêtre `[t_mot − 15s, t_mot + 15s]`** et appelle `IntentExtractor`.
5. `IntentExtractor` → `generateObject(model, schema, window)` →
   `{ actionnable, intent, entite, confiance, raison? }`.
6. Si `actionnable && confiance ≥ seuil` : le **`ActionProvider`** correspondant (`intent`)
   **enrichit** (`build()`) → `Suggestion { intent, entity, title, preview, triggerExcerpt, applyPayload }`.
7. **Dédup** : on ignore si une suggestion `(intent, entity)` identique existe déjà dans une
   fenêtre glissante (ex. 10 min) → pas de « Le Cid » proposé 4 fois.
8. `SuggestionStore.add()` → `ChannelManager.publish('live-assist', { type:'suggestion:new', suggestion })`
   → WebSocket → carte dans le panel.
9. Opérateur :
   - **Valider** → `provider.apply(applyPayload)` (ex. `create-poster`) → `status='applied'`.
   - **Éditer** → ajuste `entity`/`title`/preview avant `apply`.
   - **À l'antenne** (Définition) → `show-lower-third-text`.
   - **Ignorer** → `status='dismissed'`.
   - Chaque transition republie `{ type:'suggestion:update', id, status }`.

---

## 5. Composants

### 5.1 Service Python `realtime-stt/`
- **Rôle :** capture micro + VAD + transcription faster-whisper + émission de segments + énumération devices.
- **Dépend de :** `sounddevice`, `faster-whisper`, un VAD (`silero-vad` ou `webrtcvad`), `httpx`/`requests`.
- **Sorties :**
  - `POST {backend}/api/stt/segment` à chaque segment finalisé (et optionnellement partiels, *off* par défaut).
  - `POST {backend}/api/stt/devices` au démarrage (liste des périphériques d'entrée).
  - `GET` périodique de `{backend}/api/stt/config` (device choisi, modèle, enabled) — comme Studio Return poll les settings.
- **Horodatage :** `t0/t1` en **ms depuis le début de capture** (horloge audio monotone), pas l'horloge système — pour un fenêtrage déterministe côté Node.
- **Config :** `config.json` (URL backend) + fallback `127.0.0.1:3002` ; même esprit que Studio Return.
- **Fichiers :** `realtime-stt/main.py`, `realtime-stt/requirements.txt`, `realtime-stt/README.md`, `realtime-stt/config.example.json`.

#### 5.1.1 Option (hors v1) — pipeline two-pass tiny + large
Inspiré de [optiummusic/Whisper-Real-Time-Transcription](https://github.com/optiummusic/Whisper-Real-Time-Transcription) :
deux passes Whisper — un modèle **tiny** pour des **partiels quasi-instantanés** (`final:false`)
et un modèle **large/medium** pour le **segment final** (`final:true`). Bénéfice : sous-titre
live ultra-réactif si on en affiche un.
- **Non requis par le flux v1** : la détection keyword-gated agit sur les **finaux** et attend
  déjà `+15s` de contexte, donc le two-pass **n'accélère pas** l'apparition des suggestions.
  Il n'améliore qu'un éventuel affichage de transcript en direct.
- **Coût** : 2 modèles en VRAM + plus de complexité côté Python. **Derrière le même contrat**
  (`final` distingue partiel/final), donc activable plus tard **sans toucher au backend**.
- **Réglage** : optionnel `whisperModelFast` (tiny) en plus de `whisperModel` ; off par défaut.
- **Note GPU NVIDIA** : si on passe un jour en Rust (`whisper-cpp-plus-rs`), préférer le backend
  **CUDA** de whisper.cpp (et non Vulkan comme l'app de référence).

### 5.2 Contrat segment (HTTP)
`POST /api/stt/segment` — body validé par Zod (`TranscriptSegmentSchema`) :
```ts
{ text: string; t0: number; t1: number; final: boolean; confidence?: number }
```

### 5.3 `TranscriptBuffer` (`lib/services/liveassist/TranscriptBuffer.ts`)
- Anneau de segments finalisés sur ~2 min. `append()`, `windowAround(tCenter, before, after)` →
  texte concaténé + bornes effectives. Pure, testable.

### 5.4 `KeywordDetector` (`lib/services/liveassist/KeywordDetector.ts`)
- Reçoit la **liste mots-clés par provider** (depuis settings). `scan(segment)` → liste de
  `{ providerId, keyword, tHit }`. Matching insensible casse/accents, sur **mots entiers**
  (éviter « affiche » dans « affichage » selon réglage). Pure, testable.

### 5.5 `WindowScheduler` (`lib/services/liveassist/WindowScheduler.ts`)
- Sur un hit, planifie l'assemblage à `tHit + windowAfter`. Coalesce les hits proches
  (même provider, < N s) en **un seul** job pour éviter les rafales. Émet la fenêtre prête.

### 5.6 `IntentExtractor` (`lib/services/liveassist/IntentExtractor.ts`)
- `createAiModel()` (provider depuis Settings > AI) + `generateObject`. Prompt FR construit
  **dynamiquement** depuis les providers enregistrés (id + description). Schéma :
```ts
const IntentExtractionSchema = z.object({
  actionnable: z.boolean(),
  intent: z.enum([...providerIds, 'none']),   // construit à partir des providers
  entite: z.string(),                          // "Le Cid", "Commedia dell'arte"
  confiance: z.number().min(0).max(1),
  raison: z.string().optional(),               // courte justif (debug/log)
});
```
- Pas d'outils, pas de boucle agent → **déterministe, rapide, testable** (modèle mocké).

### 5.7 `ActionProvider` (`lib/services/liveassist/providers/ActionProvider.ts`)
Le **point d'extension**. Ajouter un provider = **1 fichier** + 1 ligne d'enregistrement.
```ts
interface ActionProvider {
  id: string;                                  // 'poster' | 'definition' | 'instagram'…
  description: string;                         // injectée dans le prompt de l'extracteur
  defaultKeywords: string[];                   // overridables en settings
  build(entity: string, window: TranscriptWindow): Promise<Suggestion | null>;
  apply(payload: SuggestionPayload): Promise<ApplyResult>;
}
```
Registry simple (`registerProvider`, `getProvider(id)`, `allProviders()`).

### 5.8 `PosterActionProvider`
- `build` : `WikipediaResolverService.resolveAndFetch(entity)` → `thumbnail`/`originalimage`
  comme **preview image**. Si pas d'image → suggestion « affiche introuvable » avec lien de
  recherche manuelle préparé (plutôt que rien).
- `apply` : POST `/api/assets/posters` (via BackendClient/fetch) avec
  `{ title, fileUrl: image, type:'image', downloadToLocal:true }` — réutilise
  `/api/assets/download-upload` déjà câblé. **Pas de MCP sur le chemin critique.**

### 5.9 `DefinitionActionProvider`
- `build` : `WikipediaResolverService` → **intro courte** (extrait REST summary, 2-3 phrases ;
  pas d'appel LLM supplémentaire par défaut pour rester léger/rapide). Preview = texte.
- `apply({ target })` — une seule méthode, le payload porte la cible :
  - `target:'pin'` (défaut **Épingler**) : marque la fiche persistée dans le panel (référence régie), aucune sortie antenne.
  - `target:'on-air'` (bouton **À l'antenne**) : `show-lower-third-text` avec le texte (éventuellement édité).

### 5.10 `SuggestionStore` (`lib/services/liveassist/SuggestionStore.ts`)
- In-memory dans le backend persistant. `add` (avec **dédup** `(intent, entity)` sur fenêtre),
  `list`, `setStatus`. Publie chaque mutation sur le channel `live-assist`.

### 5.11 `LiveAssistOrchestrator` (`lib/services/liveassist/LiveAssistOrchestrator.ts`)
- Câble tout : ingest segment → buffer → detector → scheduler → extractor → provider → store.
- Singleton `getInstance()`, démarré dans `ServerInit`/backend boot. Respecte `enabled`.
- Statut STT (connecté/déconnecté, device) exposé + publié (`stt:status`).

### 5.12 Canal & événements (réutilise `ChannelManager` + `WebSocketHub`)
Channel `live-assist`, événements :
- `suggestion:new` `{ suggestion }`
- `suggestion:update` `{ id, status }`
- `stt:status` `{ connected, device }`

### 5.13 UI — panel « Assistant Live »
- Nouveau panel via **`PANEL_REGISTRY`** (skill `new-panel`) : id `live-assist`, icône, params.
- `components/dashboard/panels/LiveAssistPanel.tsx` + `components/live-assist/SuggestionCard.tsx`
  + `SttStatusBar.tsx`.
- `lib/stores/liveAssistStore.ts` (zustand) : abonnement WS, liste, statuts.
- Carte : badge intent (🎭/📖), entité, **preview** (image affiche / texte déf), **extrait
  déclencheur** (contexte), boutons **Valider / Éditer / Ignorer** (+ **À l'antenne** pour Déf).
  Validées/ignorées grisées + archivées. En-tête : statut STT + **toggle pause global**.

### 5.14 Settings — `/settings/live-assist`
- `components/settings/LiveAssistSettings.tsx` via le hook **`useSettings`** existant.
- Champs : `enabled` · `inputDevice` (dropdown peuplé par Python) · `whisperModel` ·
  **éditeur mots-clés par intent** · `windowBeforeSec`/`windowAfterSec` (déf 15/15) ·
  `confidenceThreshold` (déf 0.6). Le **provider LLM réutilise Settings > AI** (aucun champ dupliqué).

### 5.15 API
- **Backend** `server/api/live-assist.ts` :
  `POST /api/stt/segment`, `POST /api/stt/devices`, `GET /api/stt/config`, `GET /api/stt/status`,
  `POST /api/live-assist/suggestions/:id/apply`, `.../dismiss`, `GET /api/live-assist/suggestions`.
- **Next.js** `app/api/live-assist/*` : proxys minces via **`BackendClient`** vers le backend
  (le store charge l'état initial + reçoit le live via WS).

---

## 6. Modèles de données (`lib/models/LiveAssist.ts`, Zod)

```ts
TranscriptSegment = { text, t0, t1, final, confidence? }
Suggestion = {
  id, intent, entity, title,
  preview: { kind: 'image' | 'text', imageUrl?, text? },
  triggerExcerpt, applyPayload: object,
  status: 'pending' | 'applied' | 'dismissed',
  confidence, createdAt,
}
LiveAssistSettings = {
  enabled, inputDevice, whisperModel,
  keywordsByProvider: Record<providerId, string[]>,
  windowBeforeSec, windowAfterSec, confidenceThreshold,
}
LiveAssistEvent = suggestion:new | suggestion:update | stt:status
```

---

## 7. Réutilisation (DRY)

| Besoin | Réutilise |
|---|---|
| Trouver info/affiche | `WikipediaResolverService.resolveAndFetch` (renvoie `thumbnail`/`originalimage`) |
| Créer le poster | `/api/assets/posters` + `/api/assets/download-upload` (déjà câblés) |
| Modèle LLM (provider-agnostique) | `createAiModel()` (Settings > AI) |
| Temps réel vers le panel | `ChannelManager.publish` + `WebSocketHub` |
| Panel | `PANEL_REGISTRY` + Dockview (skill `new-panel`) |
| Settings | hook `useSettings` + pattern API existant |
| Next → backend | `BackendClient` |
| Déploiement service | calque `obs-mcp` : `dev:stt` (concurrently) + app PM2 `obs-stt` |
| Texte à l'antenne | `show-lower-third-text` |
| Reporting device | calque le reporting moniteurs de **Studio Return** |

---

## 8. Gestion d'erreurs / dégradation gracieuse

- **Python down** → `stt:status { connected:false }` → panel affiche « STT déconnecté » ; backend ne crashe pas.
- **LLM cloud indisponible / réseau coupé** → extraction en pause, statut affiché ; l'assistant est **non-critique**, le show continue.
- **Wikipedia not found** → carte « affiche/définition introuvable, recherche manuelle » (lien préparé) au lieu de rien.
- **Provider qui plante** → isolé en try/catch : n'affecte ni les autres providers ni le pipeline.
- **Pause globale** (toggle panel) → coupe l'ingest/détection sans arrêter le service Python.

---

## 9. Stratégie de test (TDD)

- `TranscriptBuffer` : append, fenêtrage temporel, éviction.
- `KeywordDetector` : matching mots entiers/accents, planif fenêtre, coalescing.
- `WindowScheduler` : assemblage `[−15,+15]`, attente du contexte suivant, coalesce.
- `IntentExtractor` : modèle mocké → assemblage prompt + parsing schéma (actionnable/none).
- `PosterActionProvider` / `DefinitionActionProvider` : Wikipedia mockée → `build` + `apply` ; cas « pas d'image ».
- `SuggestionStore` : dédup `(intent, entity)`, transitions de statut, publication.
- Panel/carte : component tests (rendu preview, boutons, états grisés).
- Service Python : tests fins du **contrat segment** + découpage VAD (le reste reste mince).

---

## 10. Périmètre

- **v1 (ce spec)** : pipeline complet + `PosterActionProvider` + `DefinitionActionProvider` + panel + settings + déploiement.
- **Phase 2 (spec séparé)** : `InstagramActionProvider` (Playwright + profil Chrome connecté persistant — infra fragile à part), push vers presenter/studio-return.

---

## 11. Découpage en lots (pour le plan)

1. **Modèles + contrat** : `lib/models/LiveAssist.ts`, schémas Zod, endpoint `/api/stt/segment` + buffer.
2. **Détection** : `KeywordDetector` + `WindowScheduler` (TDD, sans LLM).
3. **Extracteur** : `IntentExtractor` (`createAiModel` + `generateObject`), modèle mocké.
4. **Providers** : interface + registry + `PosterActionProvider` + `DefinitionActionProvider`.
5. **Store + canal** : `SuggestionStore`, events `live-assist`, dédup.
6. **Orchestrateur** : câblage + boot + statut STT.
7. **UI** : panel `PANEL_REGISTRY` + `liveAssistStore` + cartes + status bar.
8. **Settings** : page + hook + éditeur mots-clés + device dropdown.
9. **Service Python** : `realtime-stt/` (capture + VAD + faster-whisper + reporting).
10. **Déploiement** : `dev:stt` (package.json) + app `obs-stt` (ecosystem.config.cjs) + README.

---

## 12. Risques / points ouverts

- **Découpage VAD vs fenêtre +15s** : caler le délai d'assemblage sur l'arrivée effective des
  segments (et non un timer sec) pour ne pas tronquer le contexte si le débit Whisper varie.
- **GPU/VRAM** (non communiqué) : STT local reste léger ; à surveiller si « tout local » est testé un jour.
- **Qualité d'extraction sur parole bruitée** : le seuil de confiance + l'édition manuelle servent de garde-fou ; itérer sur le prompt FR.
- **Affiches de spectacles** sans page Wikipedia : couverture variable → fallback « manuel » assumé en v1 ; vraie recherche d'image = amélioration ultérieure.
