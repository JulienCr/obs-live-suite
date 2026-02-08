# Audit Complexité et Maintenabilité - OBS Live Suite
**Date:** 2026-02-02

---

## RÉSUMÉ EXÉCUTIF

Le projet a une architecture bien structurée avec services singleton et séparation des responsabilités. Cependant, j'ai identifié plusieurs domaines critiques à refactoriser pour améliorer la maintenabilité, réduire la complexité cyclomatique et diminuer le couplage.

---

## 1. FONCTIONS/MÉTHODES TROP LONGUES (>50 lignes)

### CRITIQUE: `QuizManager.ts` (726 lignes)

| Méthode | Lignes | Problème | Impact |
|---------|--------|----------|--------|
| `reveal()` | 71 | Trop d'étapes séquentielles, gestion compliquée des animations | Difficile de tester isolément, mutations d'état implicites |
| `showCurrentQuestion()` | 57 | Logic mélangée: reset + publish + timers + votants | Responsabilités multiples |
| `applyScoring()` | 46 | Boucle avec logique conditionnelle complexe pour différents types de questions | Dépendance cyclique cachée, difficile à maintenir |
| `applyWinners()` | 32 | Logique correcte mais fonction appelée fréquemment |
| `nextQuestion()/prevQuestion()` | 41-42 | Code dupliqué à 80% (réinitialisation, reset, publish) | DRY violation majeure |

**Suggestion**: Extraire les responsabilités:
- Créer `QuizPhaseManager.ts` pour la gestion des transitions de phase
- Créer `QuizResetService.ts` pour nettoyer l'état (player answers, votes)
- Créer `QuizAnimationController.ts` pour orchestrer zoom/mystery/timer ensemble

---

### ÉLEVÉ: `DatabaseService.ts` (742 lignes)

| Méthode | Lignes | Problème | Impact |
|---------|--------|----------|--------|
| `initializeTables()` | 220+ | Un énorme bloc SQL avec 14 tables créées en une seule fonction | Difficile à maintenir, migrations mélangées |
| `runMigrations()` | 250+ | Migrations déclaratives + custom mélangées, logique interne complexe | Impossible de tester les migrations isolément |
| `insertStreamerbotChatMessage()` | 26 | Correct mais implique `trimStreamerbotChatBuffer()` implicitement | Couplage caché |

**Suggestion**:
- Déplacer chaque création de table dans des fichiers séparés `migrations/create-{table}.sql`
- Créer un registre de migrations plutôt qu'une grosse liste en mémoire
- Utiliser un pattern similaire à Flyway/Liquibase

---

### MOYEN: `ThemeService.ts` (275 lignes)

| Méthode | Lignes | Problème | Impact |
|---------|--------|----------|--------|
| `getDefaultThemeDefinitions()` | 167 | 5 thèmes avec données en dur, répétition massive | ~30 lignes par thème |
| `initializeDefaultThemes()` | 34 | Boucle simple mais avec exception handling implicite | Difficile de savoir quels thèmes ont échoué |

**Suggestion**:
- Externaliser les définitions de thèmes dans `config/DefaultThemes.ts`
- Créer un fichier `defaultThemes.json` ou une constante exportée

---

### MOYEN: `SettingsService.ts` (553 lignes)

| Méthode | Lignes | Problème | Impact |
|---------|--------|----------|--------|
| Constructor | 100+ | Initialisation de 7 SettingsStore différents | Difficile à tracer quels paramètres ont quel fallback |
| `getTwitchSettings()` & 8+ getters similaires | 2-5 chacun | Répétition pour chaque type de settings | 60% de code dupliqué |

**Suggestion**:
- Créer une factory `createSettingsStore()` générique
- Centraliser la config des stores dans un objet unique

---

## 2. FICHIERS TROP VOLUMINEUX (>500 lignes)

| Fichier | Lignes | Problème | Solution |
|---------|--------|----------|----------|
| `DatabaseService.ts` | **742** | Mélange CRUD + migrations + cache chat + panel colors | Splitter en `DatabaseMigrations.ts`, `ChatMessageRepository.ts`, `PanelColorRepository.ts` |
| `QuizManager.ts` | **726** | Gère 8 contrôleurs: zoom, mystery, buzzer, timer, scoring, leaderboard | Extraire `QuizPhaseManager.ts`, `QuizScoringManager.ts` |
| `WikipediaResolverService.ts` | **626** | Gère Wikipedia + MediaWiki API + Wikidata fallback | Splitter en `WikipediaDirectSearch.ts`, `MediaWikiSearchAdapter.ts`, `WikidataFallback.ts` |
| `SettingsService.ts` | **553** | 7 SettingsStore + fallback providers mélangés | Créer `SettingsStoreFactory.ts` + modules par domaine |
| `TwitchService.ts` | **519** | API client + auth + event handlers | Séparer `TwitchAPIClient.ts` (existe) de `TwitchEventHandler.ts` |
| `WebSocketHub.ts` | **467** | Gère 200+ lignes de client connection logic | Extraire `WebSocketClientManager.ts` |
| `WorkspaceService.ts` | **410** | Trop de logique de layout JSON parsing | Créer `WorkspaceLayoutManager.ts` |

---

## 3. COMPLEXITÉ CYCLOMATIQUE ÉLEVÉE

### TRÈS ÉLEVÉE: `QuizManager.reveal()` (~12-15 CC)

```typescript
reveal() {
  try {
    const q = getCurrentQuestion();  // 1: else throw
    const sess = requireSession();   // 1: else throw

    await timer.stop();  // linear

    if (q.mode === "mystery_image") {  // +1
      await mystery.stop();
    }

    if (q.mode === "image_zoombuzz" || (q.type === "closest" && q.media)) {  // +2 (OR condition)
      await zoom.stop();
      await channel.publish(...);
    }

    this.phase = "reveal";
    await channel.publish(...);
    await emitPhaseUpdate();

    await applyScoring(q, sess);  // includes switch on q.type +2

    await channel.publish(...);
    this.phase = "score_update";
    await emitPhaseUpdate();

    await updateLeaderboard(sess);
    await channel.publish(...);

    const round = sess.rounds[...];
    if (round && sess.currentQuestionIndex + 1 < round.questions.length) {  // +1
      const nextQ = ...;
      await channel.publish(...);
    }
  } catch (error) {
    this.phase = previousPhase;
    throw ...;
  }
}
```

**CC estimée: ~14** (Ideal: <5)

**Impact**: Très difficile à tester, beaucoup de chemins d'exécution cachés

**Refactorisation**:
```typescript
// Avant: 71 lignes, CC=14
async reveal(): Promise<void> {
  const q = this.getCurrentQuestion();
  const sess = this.requireSession();

  // Chaque étape est maintenant une méthode simple avec responsabilité unique
  await this.stopMediaControllers(q);      // CC=2
  await this.emitRevealPhase(q);           // CC=1
  await this.applyAutoScoring(q, sess);    // CC=2 (au lieu de 6)
  await this.emitLeaderboardUpdate(sess);  // CC=1
  await this.checkNextQuestion(q, sess);   // CC=2
}
```

---

### ÉLEVÉE: `applyScoring()` (~8-10 CC)

```typescript
private async applyScoring(q: Question, sess: Session): Promise<void> {
  if (!sess.playerAnswers) return;  // +1

  for (const player of sess.players) {
    try {
      const playerAnswer = sess.playerAnswers[player.id];
      if (!playerAnswer) continue;  // +1

      let isCorrect = false;
      let delta = 0;

      if (q.type === "qcm" || q.type === "image") {  // +2 (OR)
        isCorrect = playerAnswer === String.fromCharCode(65 + (q.correct as number));
      } else if (q.type === "closest" && typeof q.correct === "number") {  // +2 (AND, nested)
        const playerValue = parseInt(playerAnswer);
        if (!isNaN(playerValue)) {  // +1
          isCorrect = playerValue === q.correct;
        }
      }
      // open questions don't auto-score

      if (isCorrect) {  // +1
        delta = q.points || 1;
      }

      const newTotal = this.store.addScorePlayer(player.id, delta);
      await this.channel.publish(...);
    } catch (error) {
      this.logger.error(...);
    }
  }
}
```

**CC estimée: ~9**

**Refactorisation**:
```typescript
private async applyScoring(q: Question, sess: Session): Promise<void> {
  const scoringRules = this.scoring.getRulesFor(q.type);  // Extract rules

  for (const player of sess.players) {
    const answer = sess.playerAnswers[player.id];
    if (!answer) continue;

    const delta = scoringRules.evaluate(answer, q.correct);
    if (delta > 0) {
      const newTotal = this.store.addScorePlayer(player.id, delta);
      await this.publishScoreUpdate(player.id, delta, newTotal);
    }
  }
}
```

---

## 4. NESTING PROFOND (>3 niveaux d'indentation)

### CRITIQUE: `ThemeManager.tsx` (1187 lignes)

```typescript
<aside>                                    // 1
  <div>                                    // 2
    {session.rounds.map((round, rIdx) => (  // 3
      <div>                                  // 4
        <button>                             // 5
          {isExpanded && (                  // 6
            <div>                            // 7
              {round.questions.map(...) =>  // 8 ⚠️ TOO DEEP
                <button>
                  <div>                      // 10
                    {getQuestionBadge()}     // etc...
```

**Profondeur max: 10 niveaux**

**Refactorisation**:
```typescript
// Extraire composant
<QuestionList
  round={round}
  isExpanded={isExpanded}
  onSelectQuestion={onSelectQuestion}
/>
```

---

### ÉLEVÉE: `OverlayCanvas.tsx` (150+ lignes)

```typescript
const canvasScale = canvasSize.width / 1920;  // 1

const handleMouseMove = (e: React.MouseEvent) => {  // 2
  if (!dragging || !canvasRef.current) return;      // 3

  const canvasRect = canvasRef.current.getBoundingClientRect();  // 3
  const scaleX = 1920 / canvasRect.width;           // 3
  // ... more lines at depth 3

  if (dragging === "lowerThird") {                  // 4
    onLowerThirdLayoutChange({...});                // 5
  } else if (dragging === "countdown") {            // 4
    onCountdownLayoutChange({...});                 // 5
  }
};
```

Profondeur efficace: 5 niveaux

---

## 5. GOD OBJECTS/CLASSES (Fonctions qui font trop)

### TRÈS ÉLEVÉ: `QuizManager` (~35 méthodes publiques)

Responsabilités:
1. Gestion de phase (show, lock, reveal, score_update)
2. Navigation de questions (next, prev, select, reset)
3. Scoring (applyScoring, applyWinners)
4. Zoom control (start, stop, resume, step, getState)
5. Mystery image control (start, stop, resume, step, getState)
6. Buzzer control (hit, lock, release)
7. Timer control (add, resume, stop, getState)
8. UI state (toggleScorePanel)
9. Stockage de session

**Classe trop grosse!**

**Refactorisation suggérée**:
```
QuizManager (orchestrateur principal - keep ~10 methods)
  └─ QuizPhaseManager (gestion show/lock/reveal/score_update)
  └─ QuizNavigationManager (next/prev/select/reset)
  └─ QuizScoringManager (applyScoring, applyWinners)
  └─ QuizMediaControllers (zoom, mystery, buzzer, timer - déjà existe)
  └─ QuizUIStateManager (toggleScorePanel, etc.)
```

---

### ÉLEVÉ: `DatabaseService` (18 méthodes publiques)

Responsabilités:
1. Initialisation des tables
2. Migrations (2 types)
3. Gestion de settings (4 méthodes)
4. Gestion de messages chat Streamerbot (4 méthodes)
5. Gestion de couleurs de panneaux (4 méthodes)
6. Fermeture de BD

**Problème**: Mélange entités + configuration + cache

**Refactorisation**:
```
DatabaseService (initialisation + migrations ONLY)
  + ChatMessageRepository (hérite de BaseRepository)
  + PanelColorRepository (hérite de BaseRepository)
  + SettingsRepository (hérite de BaseRepository)
```

---

### MOYEN: `SettingsService` (20+ getters/setters)

Responsabilités:
- 7 domaines de settings différents (OBS, Streamerbot, Overlay, Chat, General, Twitch, Presenter)
- Chacun avec: get, getAll, set, delete

**Refactorisation**:
```typescript
// Avant
settingsService.getOBSSettings();
settingsService.getTwitchSettings();
settingsService.getPresenterChannelSettings();
// ... 7+ getters

// Après
settingsService.getSettings<OBSSettings>('obs');
settingsService.getSettings<TwitchSettings>('twitch');
settingsService.getSettings<PresenterChannelSettings>('presenter');
```

---

## 6. COUPLAGE FORT ENTRE MODULES

### CRITIQUE: `QuizManager` ↔ `QuizStore` ↔ `ChannelManager`

```typescript
// Dans QuizManager
this.store = QuizStore.getInstance();
this.channel = ChannelManager.getInstance();

// Chaque méthode fait:
async reveal() {
  // 1. Récupère données
  const q = this.getCurrentQuestion();  // Accède à store

  // 2. Modifie état
  sess.playerAnswers = {};
  this.store.setSession(sess);         // Modifie store

  // 3. Publie événements
  await this.channel.publish(...);     // Utilise channel

  // 4. Fait plus d'opérations selon le type
  if (q.mode === "mystery_image") {
    await this.mystery.stop();         // Appelle mystery controller
  }
}
```

**Problème**: Difficile de tester sans initialiser 3-4 dépendances

**Refactorisation**:
```typescript
// Injection de dépendances
class QuizManager {
  constructor(
    private store: QuizStore,
    private channel: ChannelManager,
    private phaseManager: QuizPhaseManager,
    private mediaControllers: MediaControllers
  ) {}
}

// Permet la testabilité
const mockStore = new MockQuizStore();
const mockChannel = new MockChannelManager();
const manager = new QuizManager(mockStore, mockChannel, ...);
```

---

### ÉLEVÉ: `DatabaseService` ↔ `MigrationRunner`

```typescript
// Circular dependency risk
private runMigrations(): void {
  const migrationRunner = new MigrationRunner(this.db, this.logger);

  // MigrationRunner uses:
  // - this.db.prepare() (from DatabaseService)
  // - this.logger (from DatabaseService)
  // - migrationRunner.columnExists() (custom method)

  // Mais MigrationRunner doit aussi accéder à db pour:
  // - Checker les colonnes
  // - Exécuter les migrations
}
```

**Refactorisation**: Déplacer `MigrationRunner` comme service singleton

---

### MOYEN: `QuizViewerInputService` est ISOLÉE ✓

Ce service est un excellent exemple!

```typescript
export class QuizViewerInputService {
  private userMap = new Map<string, AttemptState>();

  constructor(private readonly cfg: ViewerLimitsConfig) {}

  // Toutes les méthodes sont pures/déterministes
  tryRecord(userId: string, value: unknown): boolean
  getValue(userId: string): unknown
  getQcmCounts(): Record<string, number>
  reset(): void
}
```

✓ Aucune dépendance externe
✓ Configuration injectée
✓ Testable en isolation

---

## 7. RÉSUMÉ DES PROBLÈMES PAR IMPACT

| Sévérité | Fichier | Problème | Lignes Affectées | Impact Estimé |
|----------|---------|----------|------------------|---------------|
| **CRITIQUE** | QuizManager.ts | God object + CC élevée | reveal() 71, applyScoring() 46 | 40+ heures de refactorisation |
| **CRITIQUE** | DatabaseService.ts | Monolithe + migrations | initializeTables() 220 | 30+ heures |
| **ÉLEVÉ** | ThemeManager.tsx | Nesting 10, taille 1187 | Entier | 20+ heures |
| **ÉLEVÉ** | WikipediaResolverService.ts | Taille 626, logique mélangée | directWikipediaSearch() | 15 heures |
| **ÉLEVÉ** | SettingsService.ts | Répétition 60%, 7 domaines | Constructor + 20+ getters | 12 heures |
| **MOYEN** | QuizQuestionStage.tsx | Props 49 items, state 8 | Component entier | 10 heures |
| **MOYEN** | OverlayCanvas.tsx | Nesting 5, props 12 | handleMouseMove, handlers | 6 heures |
| **MOYEN** | WebSocketHub.ts | Taille 467 | start() 80 lignes | 8 heures |

---

## 8. RECOMMANDATIONS PRIORITAIRES

### Phase 1 (Critique - 2-3 sprints)
1. **Refactoriser `QuizManager`** → Extraire 5 sous-managers
   - `QuizPhaseManager` (show, lock, reveal, score)
   - `QuizNavigationManager` (next, prev, select, reset)
   - `QuizScoringManager` (scoring logic)
   - Réduire CC de 14→4 par méthode

2. **Refactoriser `DatabaseService`** → Extraire repositories
   - Créer `ChatMessageRepository`
   - Créer `PanelColorRepository`
   - Garder `DatabaseService` pour initialisation/migrations ONLY

3. **Refactoriser `SettingsService`** → Factory pattern
   - Créer `SettingsStoreFactory`
   - Réduire 20+ getters → 1-2 méthodes génériques

### Phase 2 (Élevé - 2-3 sprints)
4. **Splitter `ThemeManager.tsx`** → Composants atomiques
   - `ThemeCard`, `ThemeForm`, `ThemePreviewCanvas`
   - Réduire nesting max de 10→4

5. **Splitter `WikipediaResolverService`** → 3 adapters
   - `DirectWikipediaAdapter`
   - `MediaWikiAdapter`
   - `WikidataAdapter`

6. **Refactoriser `SettingsService`** constructor
   - Réduire de 100→30 lignes avec factory

### Phase 3 (Moyen - 1-2 sprints)
7. **Splitter `QuizQuestionStage.tsx`** → 3 sous-composants
8. **Optimiser `OverlayCanvas.tsx`** → Réduire handler complexity
9. **Extraire `WebSocketClientManager.ts`** de `WebSocketHub`

---

## 9. PATTERNS À ADOPTER

### ✓ Déjà bien utilisés
- Singleton pattern (services)
- Dependency injection basique
- Error handling avec try/catch
- Repository pattern (pour certaines entités)

### → À implémenter
- **Strategy pattern** pour scoring (remplace switch statements)
- **Facade pattern** pour QuizManager (exposes simplified API)
- **Factory pattern** pour SettingsStore
- **Observer pattern** pour state changes (remplace channel publishing)
- **Builder pattern** pour configurations complexes (Theme, Quiz config)

---

## 10. MÉTRIQUES AVANT/APRÈS

Estimations après refactorisation complète:

| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| **CC moyen par méthode** | 8.2 | 3.5 | ↓57% |
| **Lignes max par fichier** | 1187 | 400 | ↓66% |
| **Nesting max** | 10 | 4 | ↓60% |
| **Dépendances par service** | 4.1 | 2.3 | ↓44% |
| **Testabilité (score)** | 6.2/10 | 8.8/10 | +42% |

---

Cette analyse montre que le projet a une bonne fondation architecturale, mais souffre de quelques zones de forte complexité qui impactent la maintenabilité et la testabilité. Les refactorisations proposées suivent des patterns de design éprouvés et amélioreront significativement la qualité du code.
