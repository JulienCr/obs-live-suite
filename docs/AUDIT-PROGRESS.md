# Audit Code 2026-01 - Progression

## Contexte
Audit du projet OBS Live Suite identifiant des problèmes de qualité (5.5/10), maintenabilité (6.5/10), DRY (4/10 - ~1400 lignes dupliquées), tests (2/10).

---

## Phase 1 - Utilities créées ✅

### 1. `lib/utils/ProxyHelper.ts` ✅
- `proxyToBackend(endpoint, options)` - Proxy générique vers backend
- `createGetProxy(endpoint, errorMessage)` - Factory pour handlers GET
- `createPostProxy(endpoint, errorMessage)` - Factory pour handlers POST
- **Impact**: Élimine ~800 lignes de code dupliqué dans 20+ routes API

### 2. `lib/config/Constants.ts` ✅
Centralise les magic numbers:
- `QUIZ`: zoom duration, FPS, timer defaults, answer max length
- `BUZZER`: lock delay, steal window
- `WEBSOCKET`: heartbeat interval, ack timeout
- `DATABASE`: chat buffer size, cue message keep count, cache TTL
- `LAYOUT_DEFAULTS`: positions par défaut des overlays

### 3. `lib/utils/safeJsonParse.ts` ✅
- `safeJsonParse<T>(json, fallback)` - Parse avec fallback typé
- `safeJsonParseOptional<T>(json)` - Parse retournant undefined si erreur
- **Impact**: Prévient les crashs sur JSON malformé

### 4. `lib/utils/fetchWithTimeout.ts` ✅
- `fetchWithTimeout(url, options)` - Fetch avec AbortController
- `TimeoutError` - Classe d'erreur spécialisée
- **Impact**: Élimine ~60 lignes de patterns timeout dupliqués

### 5. `lib/services/llm/PromptTemplates.ts` ✅
- `SUMMARIZATION_SYSTEM_MESSAGE` - Message système français
- `buildSummarizationPrompt(content)` - Builder de prompt
- **Impact**: Centralise les prompts dupliqués dans 3 providers LLM

### 6. `lib/utils/apiError.ts` ✅
- `apiError(error, message, options)` - Erreur standardisée NextResponse
- `expressError(res, error, message)` - Erreur standardisée Express
- `isZodError(error)` - Détection erreurs validation
- `getErrorStatusCode(error)` - Extraction code HTTP
- **Impact**: Standardise la gestion d'erreurs, évite exposition stack traces

---

## Phase 2 - Application des utilities ✅

### Refactoring LLM Providers ✅
Fichiers modifiés:
- `lib/services/llm/OllamaProvider.ts` - Utilise fetchWithTimeout, PromptTemplates
- `lib/services/llm/OpenAIProvider.ts` - Utilise PromptTemplates
- `lib/services/llm/AnthropicProvider.ts` - Utilise fetchWithTimeout, PromptTemplates

### Refactoring API Routes avec ProxyHelper ✅
**23 fichiers refactorisés:**

| Route | Méthode | Helper utilisé |
|-------|---------|----------------|
| `app/api/overlays/lower/route.ts` | POST | createPostProxy |
| `app/api/overlays/countdown/route.ts` | POST | proxyToBackend (avec logPrefix) |
| `app/api/overlays/chat-highlight/route.ts` | POST | createPostProxy |
| `app/api/obs/status/route.ts` | GET | createGetProxy |
| `app/api/obs/reconnect/route.ts` | POST/GET | proxyToBackend |
| `app/api/obs/record/route.ts` | POST | createPostProxy |
| `app/api/obs/stream/route.ts` | POST | createPostProxy |
| `app/api/presenter/cue/send/route.ts` | POST | createPostProxy |
| `app/api/presenter/rooms/route.ts` | GET/POST | createGetProxy, createPostProxy |
| `app/api/presenter/rooms/[id]/route.ts` | GET/PUT/DELETE | proxyToBackend |
| `app/api/presenter/rooms/[id]/clear/route.ts` | DELETE | proxyToBackend |
| `app/api/presenter/cue/[messageId]/action/route.ts` | POST | proxyToBackend |
| `app/api/quiz/state/route.ts` | GET | createGetProxy |
| `app/api/quiz/session/create/route.ts` | POST | createPostProxy |
| `app/api/quiz/questions/route.ts` | GET/POST | createGetProxy, createPostProxy |
| `app/api/quiz/questions/[id]/route.ts` | PUT/DELETE | proxyToBackend |
| `app/api/quiz/questions/bulk/route.ts` | POST | proxyToBackend |
| `app/api/actions/lower/hide/route.ts` | POST | proxyToBackend |
| `app/api/actions/poster/hide/route.ts` | POST | proxyToBackend |
| `app/api/actions/poster/next/route.ts` | POST | proxyToBackend |
| `app/api/actions/poster/previous/route.ts` | POST | proxyToBackend |
| `app/api/actions/panic/route.ts` | POST | proxyToBackend |
| `app/api/actions/countdown/start/route.ts` | POST | proxyToBackend |

**5 fichiers NON refactorisés** (logique complexe nécessitant theme enrichment, notifications, etc.):
- `app/api/overlays/poster/route.ts`
- `app/api/overlays/poster-bigpicture/route.ts`
- `app/api/actions/lower/guest/[id]/route.ts`
- `app/api/actions/poster/show/[id]/route.ts`
- `app/api/test/lower-third/route.ts`

### Application safeJsonParse dans DatabaseService ✅
Fichier: `lib/services/DatabaseService.ts`

**~40 occurrences remplacées:**

| Entité | Champs parsés |
|--------|---------------|
| Posters | tags, profileIds, metadata |
| Profiles | posterRotation, audioSettings |
| Themes | colors, lowerThirdFont, lowerThirdLayout, lowerThirdAnimation, countdownFont, countdownLayout, posterLayout |
| Rooms | quickReplies, streamerbotConnection |
| Cue Messages | actions, countdownPayload, contextPayload, questionPayload, seenBy, ackedBy |
| Streamerbot Chat | parts, metadata |

---

## Phases suivantes (à faire)

### Phase 3 - Restructuration services
- [ ] Découper DatabaseService en repositories (GuestRepository, PosterRepository, etc.)
- [ ] Extraire RoomPresenceManager de RoomService
- [ ] Créer QuizRepository pour séparer persistence/logique

### Phase 4 - Tests
- [ ] Ajouter tests unitaires pour utilities créées
- [ ] Ajouter tests pour DatabaseService
- [ ] Augmenter couverture globale (actuellement 2/10)

### Phase 5 - Nettoyage
- [ ] Supprimer imports BACKEND_URL non utilisés
- [ ] Appliquer Constants.ts aux magic numbers restants
- [ ] Standardiser erreurs avec apiError dans routes restantes

---

## Statistiques

| Métrique | Avant | Après Phase 2 |
|----------|-------|---------------|
| Lignes dupliquées proxy | ~800 | ~100 (5 fichiers complexes) |
| JSON.parse non protégés | ~40 | 0 |
| Fichiers utilities | 0 | 6 |
| Routes API simplifiées | 0 | 23 |

---

*Dernière mise à jour: 2026-01-03*
