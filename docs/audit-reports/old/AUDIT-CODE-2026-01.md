# Rapport d'Audit de Code - OBS Live Suite

**Date** : Janvier 2026
**Version analysée** : feat/i18n-system (commit 38e8679)

---

## Sommaire

1. [Audit Qualité du Code](#1-audit-qualité-du-code)
2. [Audit Maintenabilité](#2-audit-maintenabilité)
3. [Audit DRY (Duplication)](#3-audit-dry-duplication)
4. [Synthèse et Plan d'Action](#4-synthèse-et-plan-daction)

---

## 1. Audit Qualité du Code

### Score Global : 5.5/10

### 1.1 Issues Critiques

#### JSON.parse sans try-catch

| Fichier | Ligne | Code |
|---------|-------|------|
| `lib/services/DatabaseService.ts` | 176 | `JSON.parse(theme.lowerThirdAnimation \|\| "{}")` |
| `lib/services/DatabaseService.ts` | 662 | `JSON.parse(row.tags \|\| "[]")` |
| `lib/services/DatabaseService.ts` | 680 | `JSON.parse(row.profileIds \|\| "[]")` |
| `lib/services/DatabaseService.ts` | 783, 800, 817, 901, 922, 939, 961 | Patterns similaires |

**Impact** : Crash de l'application si JSON malformé en base de données.

**Solution** :
```typescript
function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}
```

#### Non-null Assertions sans validation

| Fichier | Ligne | Code |
|---------|-------|------|
| `lib/services/DatabaseService.ts` | 1314 | `return this.getMessageById(message.id)!` |
| `lib/services/DatabaseService.ts` | 1553 | `return this.getPanelColorByPanelId(panelId)!` |

**Impact** : Peut retourner null malgré l'assertion, causant des erreurs runtime.

#### Cast `as any` (perte de type safety)

| Fichier | Ligne | Description |
|---------|-------|-------------|
| `lib/adapters/obs/OBSEventHandler.ts` | 64 | `obs.on(eventName as any, ...)` |
| `lib/services/QuizStore.ts` | 46 | `db.getAllGuests() as any[]` |
| `lib/services/WikipediaResolverService.ts` | 30 | `(wikiModule as any).default` |
| `lib/utils/CsvParser.ts` | 108, 161 | Type casting questions |

### 1.2 Issues Haute Sévérité

#### Format d'erreur incohérent dans les API

| Pattern | Fichiers | Problème |
|---------|----------|----------|
| `String(error)` | `server/api/overlays.ts:63`, `quiz-bot.ts:74` | Expose stack traces en production |
| Messages génériques | `app/api/assets/guests/route.ts` | `"Failed to create guest"` |

**Solution** : Standardiser avec un error handler :
```typescript
function apiError(error: unknown, genericMessage: string, status = 500) {
  console.error(genericMessage, error);
  return NextResponse.json({ error: genericMessage }, { status });
}
```

#### Validation input manquante

| Fichier | Ligne | Problème |
|---------|-------|----------|
| `server/api/overlays.ts` | 34 | `const { action, payload } = req.body;` sans validation |
| `server/api/quiz-bot.ts` | 29 | `displayName` peut être undefined |
| `app/api/settings/general/route.ts` | 36 | Pas de validation de `defaultPosterDisplayMode` |

#### Promise non gérée (fire-and-forget)

```typescript
// WebSocketHub.ts:120
updatePosterSourceInOBS(obsManager.getOBS(), sourceText).catch((err) => {
  logger.warn("Failed to update source-text in OBS", err);
});
```

**Problème** : Si le catch handler throw, l'erreur est perdue.

### 1.3 Issues Sécurité

| Catégorie | Statut | Notes |
|-----------|--------|-------|
| SQL Injection | ✅ OK | Requêtes paramétrées via better-sqlite3 |
| XSS | ⚠️ Vérifier | `dangerouslySetInnerHTML` utilisé dans certains composants |
| Information Disclosure | ❌ À corriger | Stack traces exposées via `String(error)` |

### 1.4 Issues Moyennes

- **Logging incohérent** : Mix de `console.log` et `Logger` dans DatabaseService
- **Null checks manquants** : `app/api/assets/guests/[id]/route.ts:40` retourne `{ guest: null }` au lieu de 404
- **Magic numbers** : Valeurs hardcodées éparpillées (voir section Maintenabilité)
- **Timestamps incohérents** : `Date.now()` vs `new Date()` dans DatabaseService

### 1.5 Récapitulatif Qualité

| Catégorie | Count | Sévérité |
|-----------|-------|----------|
| Error Handling | 8 | Critique-Haute |
| Type Safety | 5 | Critique-Haute |
| API Consistency | 6 | Haute-Moyenne |
| Security | 3 | Moyenne-Haute |
| Code Organization | 4 | Moyenne |
| Configuration | 3 | Basse-Moyenne |
| Documentation | 2 | Basse |
| **Total** | **31** | |

---

## 2. Audit Maintenabilité

### Score Global : 6.5/10

### 2.1 Scores par Module

| Module | Score | Statut | Problème Principal |
|--------|-------|--------|-------------------|
| `lib/services/DatabaseService.ts` | 3/10 | 🔴 Critique | 1572 lignes, 8 responsabilités |
| `lib/services/QuizManager.ts` | 5/10 | 🟠 Haute | Complexité, duplication |
| `lib/services/WebSocketHub.ts` | 5/10 | 🟠 Haute | Concerns mixés |
| `lib/adapters/obs/OBSConnectionManager.ts` | 7/10 | 🟢 Bon | Bien isolé |
| `lib/services/MacroEngine.ts` | 7/10 | 🟢 Bon | Responsabilités claires |
| `lib/services/SettingsService.ts` | 7/10 | 🟢 Bon | Bien organisé |
| `lib/services/ChannelManager.ts` | 7/10 | 🟢 Bon | Purpose clair |
| `lib/services/QuizViewerInputService.ts` | 8/10 | 🟢 Excellent | Single concern |
| `components/shell/AppShell.tsx` | 8/10 | 🟢 Bon | Composant focalisé |

### 2.2 Complexité des Fonctions/Méthodes

#### DatabaseService.ts - CRITIQUE

| Méthode | Lignes | Problème |
|---------|--------|----------|
| `runMigrations()` | 270 | Code migration répétitif - même pattern pour chaque colonne |
| Fichier total | 1572 | 8 entités différentes (guests, posters, profiles, themes, settings, rooms, cue_messages, panel_colors) |

**Violation SRP** : Devrait être éclaté en :
- `GuestRepository.ts`
- `PosterRepository.ts`
- `ThemeRepository.ts`
- `RoomRepository.ts`
- `CueMessageRepository.ts`
- `SettingsRepository.ts`
- `MigrationRunner.ts`

#### QuizManager.ts - HAUTE COMPLEXITÉ

| Section | Lignes | Problème |
|---------|--------|----------|
| `showCurrentQuestion()` + `reveal()` | 100+ | Nested conditionals pour modes différents |
| `submitPlayerAnswer()` | 296-314 | Validation inline |
| `applyScoring()` | 375-415 | Switch sur type de question |
| Constructor | 43-51 | Instancie 3 controllers |

**Solution** : Extraire vers :
- `QuizStateManager` (transitions de phase)
- `QuestionScoringStrategy` (scoring par type)
- `ControllerFactory` (initialisation zoom, mystery, buzzer)

#### WebSocketHub.ts

| Section | Lignes | Problème |
|---------|--------|----------|
| `handleMessage()` | 187-255 | Switch massif avec 60+ lignes |
| Room presence logic | 330-486 | Mélangé avec WebSocket logic |

**Solution** : Extraire `RoomPresenceManager`

### 2.3 Configuration Éparpillée (Magic Numbers)

| Localisation | Valeur | Description |
|--------------|--------|-------------|
| `QuizManager.ts:44` | `45` | Animation duration (seconds) |
| `QuizManager.ts:51` | `300, 4000` | Buzzer timing |
| `WebSocketHub.ts:307` | `30000` | Heartbeat interval (ms) |
| `ChannelManager.ts:108` | `5000` | ACK timeout (ms) |
| `DatabaseService.ts:1412` | `200` | Chat buffer size |
| Multiple fichiers | `{"x":60,"y":920,"scale":1}` | Default layout (répété 8+ fois) |
| `QuizManager.ts:389` | `65 + (q.correct)` | QCM calculation magic |
| `server/api/quiz-bot.ts:65` | `200` | Max text length |

**Solution** : Créer `lib/config/Constants.ts` :
```typescript
export const QUIZ = {
  ANIMATION_DURATION_SECONDS: 45,
  BUZZER_DELAY_MS: 300,
  BUZZER_WINDOW_MS: 4000,
} as const;

export const WEBSOCKET = {
  HEARTBEAT_INTERVAL_MS: 30000,
  ACK_TIMEOUT_MS: 5000,
} as const;

export const DATABASE = {
  CHAT_BUFFER_SIZE: 200,
} as const;

export const LAYOUT_DEFAULTS = {
  LOWER_THIRD: { x: 60, y: 920, scale: 1 },
} as const;
```

### 2.4 Dépendances et Couplage

#### Points Positifs
- Pattern Singleton `getInstance()` cohérent
- Pas de dépendances circulaires détectées
- Direction claire : Components → Services → Adapters → Utils

#### Points à Améliorer

| Problème | Impact | Solution |
|----------|--------|----------|
| QuizManager : 10 imports directs | Test difficile | Dependency injection |
| DatabaseService via singleton partout | Pas de mock possible | Interfaces + DI |
| 226 imports services dans components | Couplage fort | Hooks/Providers |

### 2.5 Couverture de Tests

**Score : 2/10 - CRITIQUE**

| Catégorie | Statut |
|-----------|--------|
| Tests unitaires services | ❌ Manquants |
| QuizManager state machine | ❌ Non testé |
| DatabaseService CRUD | ❌ Non testé |
| WebSocketHub routing | ❌ Non testé |
| ChannelManager pub/sub | ❌ Non testé |
| Tests d'intégration | ⚠️ Limités |
| Tests E2E | ⚠️ Limités |

**Fichiers de test trouvés** : 20 fichiers dans `__tests__/`

**Chemins critiques non testés** :
1. Quiz state machine (7 états, 20+ transitions)
2. Database migrations (8 migrations)
3. Room presence tracking
4. Macro execution séquentielle

### 2.6 Documentation

| Aspect | Statut |
|--------|--------|
| JSDoc services publics | ⚠️ Partiel |
| CLAUDE.md architecture | ✅ Bon |
| Paramètres fonctions complexes | ❌ Manquant |
| Raisons des migrations | ❌ Non documenté |
| State machine quiz | ❌ Pas de diagramme |

---

## 3. Audit DRY (Duplication)

### Lignes Dupliquées Estimées : ~1400

### 3.1 Duplications Critiques

#### Pattern Proxy/Fetch (40+ instances, ~800 lignes)

**Fichiers affectés** :
```
app/api/overlays/poster/route.ts
app/api/overlays/countdown/route.ts
app/api/overlays/lower/route.ts
app/api/obs/status/route.ts
app/api/obs/record/route.ts
app/api/obs/stream/route.ts
app/api/obs/reconnect/route.ts
app/api/actions/poster/hide/route.ts
app/api/actions/poster/next/route.ts
app/api/actions/poster/previous/route.ts
app/api/actions/lower/hide/route.ts
app/api/actions/panic/route.ts
app/api/quiz/questions/route.ts
app/api/quiz/questions/[id]/route.ts
app/api/quiz/questions/bulk/route.ts
app/api/presenter/rooms/route.ts
app/api/presenter/rooms/[id]/route.ts
... (20+ fichiers)
```

**Code dupliqué** :
```typescript
try {
  const response = await fetch(`${BACKEND_URL}/api/{endpoint}`, {
    method: '{METHOD}',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    return NextResponse.json(data, { status: response.status });
  }
  return NextResponse.json(data);
} catch (error) {
  console.error("{Endpoint} proxy error:", error);
  return NextResponse.json({ error: "Failed to {action}" }, { status: 500 });
}
```

**Solution** : Créer `lib/utils/ProxyHelper.ts` :
```typescript
export async function proxyToBackend<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: unknown,
  errorMessage: string = 'Request failed'
): Promise<NextResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method,
      ...(method !== 'GET' && { headers: { 'Content-Type': 'application/json' } }),
      ...(body && { body: JSON.stringify(body) }),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`[ProxyHelper] ${errorMessage}:`, error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
```

**Effort** : Moyen | **Impact** : -800 lignes

---

#### Pattern CRUD API Routes (10+ fichiers, ~300 lignes)

**Groupes identiques** :
- `guests/route.ts` + `guests/[id]/route.ts`
- `posters/route.ts` + `posters/[id]/route.ts`
- `profiles/route.ts` + `profiles/[id]/route.ts`
- `themes/route.ts` + `themes/[id]/route.ts`
- `presenter/rooms/route.ts` + `presenter/rooms/[id]/route.ts`

**Pattern répété** :
```typescript
// GET collection
export async function GET() {
  try {
    const db = DatabaseService.getInstance();
    const items = db.getAll{Entity}();
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST create
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = schema.parse(body);
    const db = DatabaseService.getInstance();
    db.create{Entity}(validated);
    return NextResponse.json({ item: validated }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create" }, { status: 400 });
  }
}
```

**Solution** : Factory CRUD générique ou middleware

**Effort** : Élevé | **Impact** : -300 lignes

---

#### Envoi Chat Message (4 fichiers, ~40 lignes)

**Fichiers** :
- `app/api/actions/lower/guest/[id]/route.ts:71-81`
- `app/api/actions/poster/show/[id]/route.ts:58-68`
- `app/api/overlays/poster/route.ts:131-141`
- `app/api/overlays/poster-bigpicture/route.ts:119-129`

**Code dupliqué** :
```typescript
if (chatSettings.{enabled} && asset.chatMessage) {
  fetch(`${BACKEND_URL}/api/streamerbot-chat/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platform: 'twitch',
      message: asset.chatMessage,
    }),
  }).catch((error) => {
    console.error("[Action] Failed to send chat message:", error);
  });
}
```

**Solution** : Extraire vers `lib/utils/chatMessaging.ts`

**Effort** : Faible | **Impact** : -40 lignes

---

#### Prompt LLM (3 fichiers, ~50 lignes)

**Fichiers** :
- `lib/services/llm/OllamaProvider.ts:82-95`
- `lib/services/llm/OpenAIProvider.ts:70-83`
- `lib/services/llm/AnthropicProvider.ts:90-103`

**Code dupliqué** : Même prompt français pour summarization

**Solution** : Extraire vers `lib/services/llm/PromptTemplates.ts`

**Effort** : Faible | **Impact** : -50 lignes

---

#### Timeout/AbortController (2 fichiers, ~60 lignes)

**Fichiers** :
- `lib/services/llm/OllamaProvider.ts:97-139`
- `lib/services/llm/AnthropicProvider.ts:45-88, 105-151`

**Pattern répété** :
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), this.timeout);
try {
  const response = await fetch(url, { signal: controller.signal, ... });
  clearTimeout(timeout);
  // ...
} catch (error) {
  clearTimeout(timeout);
  if (error instanceof Error && error.name === "AbortError") {
    throw new Error(`Request timed out after ${this.timeout}ms`);
  }
  throw error;
}
```

**Solution** : Créer `lib/utils/fetchWithTimeout.ts`

**Effort** : Faible | **Impact** : -60 lignes

---

### 3.2 Duplications Moyennes

#### Settings Routes (4 fichiers, ~100 lignes)

- `app/api/settings/general/route.ts`
- `app/api/settings/obs/route.ts`
- `app/api/settings/integrations/route.ts`
- `app/api/settings/overlay/route.ts`

#### File Upload Handlers (3 fichiers, ~30 lignes)

- `app/api/assets/upload/route.ts`
- `app/api/assets/guests/upload/route.ts`
- `app/api/assets/quiz/route.ts`

#### OBS Control Pattern (2 fichiers, ~20 lignes)

- `server/api/obs.ts` (stream: 53-71, record: 77-95)

### 3.3 Récapitulatif DRY

| Pattern | Fichiers | Lignes | Effort | Priorité |
|---------|----------|--------|--------|----------|
| Proxy/Fetch | 20+ | ~800 | Moyen | **CRITIQUE** |
| CRUD Routes | 10+ | ~300 | Élevé | Moyenne |
| Settings Routes | 4 | ~100 | Moyen | Moyenne |
| Chat Message | 4 | ~40 | Faible | Haute |
| LLM Prompt | 3 | ~50 | Faible | Haute |
| Timeout/Abort | 2 | ~60 | Faible | Haute |
| File Upload | 3 | ~30 | Faible | Basse |
| OBS Control | 2 | ~20 | Faible | Basse |
| **TOTAL** | | **~1400** | | |

---

## 4. Synthèse et Plan d'Action

### 4.1 Scores Globaux

| Dimension | Score | Statut |
|-----------|-------|--------|
| **Qualité du Code** | 5.5/10 | ⚠️ Amélioration nécessaire |
| **Maintenabilité** | 6.5/10 | ⚠️ Refactoring requis |
| **DRY** | 4/10 | 🔴 Duplication significative |
| **Tests** | 2/10 | 🔴 Couverture critique |

### 4.2 Plan d'Action Priorisé

#### Phase 1 : Immédiat (1-2 semaines)

| Action | Impact | Effort |
|--------|--------|--------|
| Créer `lib/utils/ProxyHelper.ts` | -800 lignes | Moyen |
| Créer `lib/config/Constants.ts` | Centralisation config | Faible |
| Wrapper tous les `JSON.parse()` | Prévention crash | Faible |
| Standardiser erreurs API | Sécurité + cohérence | Faible |
| Extraire `lib/utils/fetchWithTimeout.ts` | -60 lignes | Faible |
| Extraire `lib/services/llm/PromptTemplates.ts` | -50 lignes | Faible |

#### Phase 2 : Court terme (3-4 semaines)

| Action | Impact | Effort |
|--------|--------|--------|
| Éclater `DatabaseService` en repositories | -1000+ lignes, SRP | Élevé |
| Extraire `RoomPresenceManager` de `WebSocketHub` | Clarté | Moyen |
| Créer `QuestionScoringStrategy` | Éliminer switch | Moyen |
| Établir tests unitaires services critiques | Fiabilité | Élevé |
| Extraire `lib/utils/chatMessaging.ts` | -40 lignes | Faible |

#### Phase 3 : Moyen terme (mois 2)

| Action | Impact | Effort |
|--------|--------|--------|
| Factory CRUD générique | -300 lignes | Élevé |
| Interfaces services pour testabilité | Tests + DI | Moyen |
| Pre-commit hooks tests | CI/CD | Moyen |
| Documenter state machines (diagrammes) | Onboarding | Moyen |

#### Phase 4 : Long terme (mois 3+)

| Action | Impact | Effort |
|--------|--------|--------|
| Dependency injection framework | Architecture | Élevé |
| Couverture tests 80%+ services | Qualité | Élevé |
| Documentation composants | Maintenance | Moyen |

### 4.3 Estimation Effort Total

| Phase | Heures estimées |
|-------|-----------------|
| Phase 1 | 15-20h |
| Phase 2 | 25-35h |
| Phase 3 | 20-30h |
| Phase 4 | 30-40h |
| **Total** | **90-125h** |

### 4.4 Métriques de Succès

| Métrique | Actuel | Cible Phase 2 | Cible Final |
|----------|--------|---------------|-------------|
| Lignes DatabaseService | 1572 | <500 | <200 |
| Duplication (lignes) | ~1400 | ~600 | <200 |
| Couverture tests services | <5% | 40% | 80% |
| Score maintenabilité | 6.5/10 | 7.5/10 | 8.5/10 |
| Score qualité | 5.5/10 | 7/10 | 8/10 |

---

## Annexes

### A. Fichiers Critiques à Refactorer

1. `lib/services/DatabaseService.ts` (1572 lignes)
2. `lib/services/QuizManager.ts` (462 lignes)
3. `lib/services/WebSocketHub.ts` (489 lignes)
4. 20+ fichiers `app/api/` avec pattern proxy dupliqué

### B. Utilitaires à Créer

1. `lib/utils/ProxyHelper.ts`
2. `lib/utils/fetchWithTimeout.ts`
3. `lib/utils/chatMessaging.ts`
4. `lib/utils/safeJsonParse.ts`
5. `lib/config/Constants.ts`
6. `lib/services/llm/PromptTemplates.ts`

### C. Repositories à Extraire de DatabaseService

1. `lib/repositories/GuestRepository.ts`
2. `lib/repositories/PosterRepository.ts`
3. `lib/repositories/ProfileRepository.ts`
4. `lib/repositories/ThemeRepository.ts`
5. `lib/repositories/RoomRepository.ts`
6. `lib/repositories/CueMessageRepository.ts`
7. `lib/repositories/SettingsRepository.ts`
8. `lib/repositories/PanelColorRepository.ts`
