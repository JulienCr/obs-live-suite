# Audit Report - 2026-01-07

**Branch**: refactor/next
**Commit**: b66d158
**Précédent**: Premier audit (pas d'historique)

## Résumé Exécutif

| Dimension | Précédent | Actuel | Delta | Trend |
|-----------|-----------|--------|-------|-------|
| Quality | N/A | 4.3 | - | 🆕 |
| Maintainability | N/A | 8.5 | - | 🆕 |
| DRY | N/A | 10.0 | - | 🆕 |
| Tests | N/A | 0.0 | - | 🆕 |
| **Overall** | N/A | **5.7** | - | 🆕 |

### Baseline établie

Ceci est le premier audit. Les métriques actuelles servent de baseline pour les audits suivants.

### Points Forts
- **DRY Score parfait (10/10)**: Migration ProxyHelper complète - 23/23 routes utilisent ProxyHelper, 0 raw fetch
- **Maintainability solide (8.5/10)**: 6 repositories extraits, moyenne 218 lignes/service
- **Aucun magic number** détecté dans le code

### Points à Améliorer
- **Quality (4.3/10)**: 4 JSON.parse non protégés, 20 error handling à revoir, 5 `as any` casts
- **Tests (0/10)**: Coverage Jest non disponible (32 fichiers test existent mais pas de rapport coverage)

## Issues Identifiées

### Critique (Action Immédiate)

| # | Issue | File | Line | Impact |
|---|-------|------|------|--------|
| 1 | JSON.parse non protégé | lib/services/QuizStore.ts | 130 | Crash si fichier corrompu |
| 2 | JSON.parse non protégé | lib/services/QuizStore.ts | 193 | Crash si fichier corrompu |

### Haute Priorité

| # | Issue | File | Line | Impact |
|---|-------|------|------|--------|
| 3 | `as any` cast inutile | lib/services/QuizStore.ts | 49 | Type safety |
| 4 | `as any` sans validation | lib/utils/CsvParser.ts | 108 | Type safety |
| 5 | `as any` sans validation | lib/utils/CsvParser.ts | 161 | Type safety |

### Moyenne Priorité (Maintenabilité)

| # | Issue | Description | Lines |
|---|-------|-------------|-------|
| 6 | DatabaseService trop grand | 1113 lignes, plusieurs responsabilités | 1113 |
| 7 | Extraire SettingsRepository | Cohérence pattern repository | ~35 |
| 8 | Extraire StreamerbotChatRepository | Logique buffer complexe | ~90 |
| 9 | Extraire PanelColorRepository | Cohérence pattern repository | ~55 |

### Basse Priorité (Nice to Have)

| # | Issue | File | Line | Reason |
|---|-------|------|------|--------|
| 10 | `as any` ESM/CJS interop | lib/services/WikipediaResolverService.ts | 36 | Interop unavoidable |
| 11 | `as any` dynamic events | lib/adapters/obs/OBSEventHandler.ts | 64 | Architectural choice |

### Faux Positifs (Aucune Action)

| # | Issue | File | Raison |
|---|-------|------|--------|
| - | JSON.parse | lib/services/WikipediaCacheService.ts:84 | Déjà dans try-catch |
| - | JSON.parse | lib/utils/widgetStorage.ts:64 | Déjà dans try-catch |
| - | Exposed errors (20) | LLM providers | Wrappés par InvalidSummaryError, API retourne messages génériques |

## Analyse Détaillée

### Quality Score (4.3/10)

**JSON.parse non protégés**: 2 vrais positifs dans QuizStore.ts
- Ligne 130: `loadFromFile()` - crash si fichier session corrompu
- Ligne 193: `updateSessionMetadata()` - crash si fichier session corrompu

**Solution**: Utiliser `safeJsonParseOptional` de `lib/utils/safeJsonParse.ts` (utility existante)

**`as any` casts**: 5 détectés, 3 corrigibles
- QuizStore.ts:49 - Cast inutile, `getAllGuests()` retourne déjà `DbGuest[]`
- CsvParser.ts:108,161 - Manque validation Zod avant cast

### Maintainability Score (8.5/10)

**DatabaseService.ts (1113 lignes)** - Candidat principal pour extraction:
- ✅ 6 repositories déjà extraits (Guest, Poster, Profile, Theme, Room, CueMessage)
- ❌ 3 domaines encore dans DatabaseService: Settings, StreamerbotChat, PanelColor
- ❌ Migrations (~370 lignes) pourraient être extraites

**QuizManager.ts (727 lignes)** - ✅ Bien architecturé
- Délègue déjà à QuizStore, QuizScoringService, QuizZoomController, etc.
- Pattern Facade approprié - pas d'extraction recommandée

**WikipediaResolverService.ts (627 lignes)** - Candidat moyen
- MediaWikiApiClient pourrait être extrait (~180 lignes)
- Wikidata code désactivé, extraction si/quand réactivé

### DRY Score (10/10)

Migration ProxyHelper complète:
- 23/23 routes utilisent ProxyHelper
- 0 raw fetch restant
- Aucune duplication estimée

### Tests Score (0/10)

- 32 fichiers test présents
- Coverage Jest non configuré ou rapport non généré
- **Action**: Configurer `pnpm test:coverage` et ajouter au CI

## Batch de Corrections Proposé

| ID | Issue | Description | Effort | Impact | Priority |
|----|-------|-------------|--------|--------|----------|
| CB-001 | JSON.parse unsafe | QuizStore.ts:130 - wrap safeJsonParseOptional | Low | 5 | P1 |
| CB-002 | JSON.parse unsafe | QuizStore.ts:193 - wrap safeJsonParseOptional | Low | 5 | P1 |
| CB-003 | `as any` inutile | QuizStore.ts:49 - supprimer cast | Low | 3 | P2 |
| CB-004 | `as any` sans validation | CsvParser.ts:108 - ajouter validation Zod | Low | 3 | P2 |
| CB-005 | `as any` sans validation | CsvParser.ts:161 - ajouter validation Zod | Low | 3 | P2 |
| CB-006 | SRP violation | Extraire SettingsRepository | Medium | 4 | P2 |
| CB-007 | SRP violation | Extraire StreamerbotChatRepository | Medium | 4 | P2 |
| CB-008 | SRP violation | Extraire PanelColorRepository | Medium | 4 | P2 |
| CB-009 | Coverage | Configurer Jest coverage reporting | Medium | 4 | P3 |

### Effort Total Estimé
- **P1 (Critique)**: 2 issues, ~30 min
- **P2 (Haute)**: 6 issues, ~2h
- **P3 (Moyenne)**: 1 issue, ~30 min

## Prochaines Cibles

1. **Court terme**: Corriger CB-001, CB-002 (JSON.parse unsafe) - impact immédiat sur stabilité
2. **Moyen terme**: Nettoyer `as any` casts (CB-003 à CB-005) - améliorer type safety
3. **Planifié**: Extraire repositories manquants (CB-006 à CB-008) - réduire DatabaseService de 1113 à ~550 lignes
4. **Infrastructure**: Configurer coverage reporting (CB-009) - baseline pour score Tests

## Métriques Brutes

```json
{
  "quality": {
    "unsafeJsonParse": 4,
    "exposedErrors": 20,
    "asAnyCasts": 5,
    "magicNumbers": 0
  },
  "maintainability": {
    "largestFile": 1113,
    "avgServiceLines": 218,
    "repositoriesExtracted": 6
  },
  "dry": {
    "proxyHelperAdoption": "23/23",
    "rawFetchRemaining": 0
  },
  "tests": {
    "testFileCount": 32,
    "coverage": null
  }
}
```
