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

## Phase 2.5 - DRY et Nettoyage ✅

### 7. `lib/utils/chatMessaging.ts` ✅ (NEW)
- `sendChatMessage(message, platform)` - Envoi fire-and-forget avec Logger
- `sendChatMessageIfEnabled(settings, message, platform)` - Envoi conditionnel
- **Impact**: Élimine ~44 lignes de code dupliqué dans 4 fichiers

Fichiers refactorisés:
- `app/api/actions/lower/guest/[id]/route.ts`
- `app/api/actions/poster/show/[id]/route.ts`
- `app/api/overlays/poster/route.ts`
- `app/api/overlays/poster-bigpicture/route.ts`

### Application Constants.ts aux magic numbers ✅

**Fichiers modifiés:**

| Fichier | Magic numbers remplacés |
|---------|-------------------------|
| `lib/services/QuizManager.ts` | 45→QUIZ.ZOOM_DURATION_SECONDS, 35→QUIZ.ZOOM_MAX_LEVEL, 30→QUIZ.ZOOM_FPS, 60→QUIZ.MYSTERY_IMAGE_INTERVAL_MS, 300→BUZZER.LOCK_DELAY_MS, 4000→BUZZER.STEAL_WINDOW_MS, 20→QUIZ.DEFAULT_TIMER_SECONDS |
| `lib/services/WebSocketHub.ts` | 30000→WEBSOCKET.HEARTBEAT_INTERVAL_MS |
| `lib/services/ChannelManager.ts` | 5000→WEBSOCKET.ACK_TIMEOUT_MS |
| `lib/services/DatabaseService.ts` | 200→DATABASE.CHAT_BUFFER_SIZE, layouts→LAYOUT_DEFAULTS.*, animations→LOWER_THIRD_ANIMATION.* |
| `lib/services/ThemeService.ts` | layouts→LAYOUT_DEFAULTS.*, animations→LOWER_THIRD_ANIMATION.* |
| `server/api/quiz-bot.ts` | 1500→VIEWER_LIMITS.PER_USER_COOLDOWN_MS, 5→VIEWER_LIMITS.PER_USER_MAX_ATTEMPTS, 50→VIEWER_LIMITS.GLOBAL_RPS, 200→QUIZ.OPEN_ANSWER_MAX_LENGTH |

### Standardisation erreurs avec apiError/expressError ✅

**Routes Express standardisées:**
- `server/api/overlays.ts` (6 endpoints)
- `server/api/obs.ts` (6 endpoints)
- `server/api/rooms.ts` (6 endpoints)
- `server/api/cue.ts` (7 endpoints)
- `server/api/quiz.ts` (25+ endpoints)
- `server/api/quiz-bot.ts` (1 endpoint)
- `server/api/streamerbot-chat.ts` (7 endpoints)
- `server/backend.ts` (5 endpoints)

**Routes Next.js standardisées:**
- `app/api/ollama/test/route.ts`
- `app/api/debug/websocket/route.ts`
- `app/api/test/lower-third/route.ts`

### Nettoyage imports BACKEND_URL ✅
- 23 routes vérifiées (déjà nettoyées lors du refactoring ProxyHelper)
- Imports légitimes conservés pour les 5 fichiers avec logique complexe

---

## Phase 3 - Restructuration services ✅

### Extraction des Repositories ✅

**6 repositories créés dans `lib/repositories/`:**

| Repository | Méthodes | Source |
|------------|----------|--------|
| `GuestRepository.ts` | getAll, getById, create, update, delete | DatabaseService guests |
| `PosterRepository.ts` | getAll, getById, create, update, delete | DatabaseService posters |
| `ProfileRepository.ts` | getAll, getById, getActive, create, update, setActive, delete | DatabaseService profiles |
| `ThemeRepository.ts` | getAll, getById, create, update, delete | DatabaseService themes |
| `RoomRepository.ts` | getAll, getById, create, update, delete | DatabaseService rooms |
| `CueMessageRepository.ts` | getByRoom, getPinned, getById, create, update, delete, deleteOld, clearRoom | DatabaseService cue_messages |

**Impact:**
- DatabaseService délègue maintenant aux repositories (façade pattern)
- Chaque repository est un singleton avec `getInstance()`
- Meilleure séparation des responsabilités
- Code plus testable (repositories mockables)

**Note:** RoomService était déjà minimal (71 lignes), pas de RoomPresenceManager à extraire.

---

## Phases suivantes (à faire)

### Phase 4 - Tests
- [ ] Ajouter tests unitaires pour utilities créées
- [ ] Ajouter tests pour repositories
- [ ] Augmenter couverture globale (actuellement 2/10)

---

## Statistiques

| Métrique | Avant | Après Phase 2 | Après Phase 2.5 | Après Phase 3 |
|----------|-------|---------------|-----------------|---------------|
| Lignes dupliquées proxy | ~800 | ~100 | ~100 | ~100 |
| Lignes dupliquées chat | ~44 | ~44 | 0 | 0 |
| JSON.parse non protégés | ~40 | 0 | 0 | 0 |
| Magic numbers hardcodés | ~20 | ~20 | ~5 | ~5 |
| String(error) exposés | ~60 | ~60 | 0 | 0 |
| Fichiers utilities | 0 | 6 | 7 | 7 |
| Fichiers repositories | 0 | 0 | 0 | 6 |
| Routes API simplifiées | 0 | 23 | 23 | 23 |
| Routes avec erreurs standardisées | 0 | 0 | 60+ | 60+ |

---

*Dernière mise à jour: 2026-01-03*
