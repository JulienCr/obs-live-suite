# Audit Code Mort et Incohérences - OBS Live Suite
**Date:** 2026-02-02

---

## 1. EXPORTS NON UTILISÉS & FONCTIONS MORTES

### 1.1. BackupService.importProfile() - ORPHELINE
**Fichier:** `lib/services/BackupService.ts:76-79`
```typescript
async importProfile(zipPath: string): Promise<string> {
  // TODO: Implement zip extraction and profile import
  this.logger.info(`Importing profile from: ${zipPath}`);
  throw new Error("Not implemented yet");
}
```
- **Type:** Fonction déclarée mais non implémentée
- **Impact:** Safe à supprimer - throw le message clairement
- **Note:** Jamais appelée dans l'app (0 références)
- **Action recommandée:** Supprimer ou implémenter complètement

### 1.2. Preset Model - CODE MORT PROBABLE
**Fichier:** `lib/models/Preset.ts`
- **Référence:** 0 imports dans `app/`, `server/`, `lib/repositories`
- **Référence dans l'app:** Uniquement dans les textes UI ("Presets rapides", "Layout Presets")
- **Classe:** PresetModel complètement définie mais jamais instanciée
- **Schemas:** lowerThirdPayloadSchema, countdownPayloadSchema, posterPayloadSchema non utilisés
- **Action recommandée:** Investigation - vérifier si le feature "Presets" est développé ou abandonné

---

## 2. TYPE SAFETY - VIOLATIONS `as any` ET `as unknown`

### 2.1. Violations `as any` (15+ instances)
| Fichier | Ligne | Contexte | Sévérité |
|---------|-------|----------|----------|
| `__tests__/services/MacroEngine.test.ts` | 59, 83, 105, 108 | Tests - conversion macro pour tests | Moyen |
| `components/presenter/panels/streamerbot-chat/StreamerbotChatPanel.tsx` | 86 | Settings backend mock | Moyen |
| `lib/adapters/obs/OBSEventHandler.ts` | 64 | `obs.on(eventName as any, ...)` | Élevé |
| `lib/utils/CsvParser.ts` | 108, 161 | Type casting dans parsing CSV | Élevé |
| `lib/services/WikipediaResolverService.ts` | 36 | Wiki module default export | Élevé |
| `components/shell/WorkspacesContext.tsx` | 139 | Panel scheme cast | Moyen |
| `lib/services/SettingsStore.ts` | 128, 130, 134 | Zod innerType traversal | Moyen |
| `lib/services/updater/PluginScanner.ts` | 117 | Error catch block | Moyen |

**Action recommandée:** Remplacer par types explicites ou better-typed alternatives

### 2.2. `as unknown as T` - DOUBLE CASTING
**Fichier:** `lib/utils/ClientFetch.ts`
```typescript
return { message: text } as unknown as T;
```
- **Impact:** Dangerous - échappe à tout type checking
- **Action:** Utiliser type-safe JSON parsing ou créer un wrapper générique

---

## 3. PATTERNS INCOHÉRENTS

### 3.1. Singleton Pattern - Variantes
Tous les services utilisent le pattern singleton, SAUF avec des variations:
- **Cohérent:** DatabaseConnector, DatabaseService, WebSocketHub, ChannelManager
- **Variants:** Certains utilisent `getInstance()`, d'autres pourraient utiliser factory

### 3.2. Error Handling - Inconsistencies
| Pattern | Fichiers | Problème |
|---------|----------|----------|
| Throw custom errors | OBSConnectionManager | Bon |
| Try/catch with generic handling | Services génériques | Acceptable |
| `error: any` catch | PluginScanner.ts:117 | À fixer |

### 3.3. Logger Initialization
- **Pattern:** `this.logger = new Logger("ServiceName")` - COHÉRENT
- **Alternative:** Aucune - bien standardisé

---

## 4. FICHIERS POTENTIELLEMENT ORPHELINS

### 4.1. Preset Model System
**Fichiers affectés:**
- `lib/models/Preset.ts` - 183 lignes
- Pas de `PresetRepository`
- Pas de API routes CRUD pour presets
- Pas de tables DB pour presets (à vérifier dans init/ServerInit.ts)

**Vérification requise:** Les presets sont-ils une fonctionnalité abandonnée?

### 4.2. Test Endpoints (INTENTIONNELS - Dev Helper)
- `app/api/test/lower-third/route.ts` - Helper de dev
- `app/api/llm/test/route.ts` - Helper de dev
- `app/api/ollama/test/route.ts` - Helper de dev

**Action:** Laisser - utiles pour développement local

---

## 5. NAMING INCONSISTENCIES

### 5.1. Service Files - CONVENTION SNAKE_CASE DANS NOMS
Aucun fichier trouvé avec `snake_case` - tous en `PascalCase` ✓

### 5.2. Exports Constants - TOUS UPPERCASE
```typescript
export const QUIZ = { ... }           // Constants.ts
export const WEBSOCKET = { ... }      // Constants.ts
export const DATABASE = { ... }       // Constants.ts
```
- **Cohérence:** 100% - bien standardisé ✓

### 5.3. Variables/Functions - camelCase
- **Cohérence:** Excellente globalement ✓

---

## 6. CODE COMMENTÉ ET DÉPRÉCIÉ

### 6.1. TODOs Identifiés
| Fichier | Ligne | Problème | Priorité |
|---------|-------|----------|----------|
| `components/dashboard/MacrosBar.tsx` | 13, 21 | Macro API loading/execution | Medium |
| `server/api/quiz.ts` | 77 | Missing viewerInputEnabled field | Medium |
| `lib/services/BackupService.ts` | 67 | Asset files backup not implemented | Low |
| `app/api/actions/macro/route.ts` | 20 | Macro execution not implemented | Medium |

**Action:** Prioriser la completion des features ou supprimer les TODOs dangling

---

## 7. IMPORTS INUTILISÉS

### 7.1. Patterns détectés
- **ImportError:** `import * as semver from "semver"` dans GitHubReleaseChecker.ts
  - Vérifier si utilisé

- **Index exports:** Tous les index files sont bien utilisés
  - `lib/hooks/index.ts` ✓
  - `lib/queries/index.ts` ✓
  - `lib/models/streamerbot/index.ts` ✓
  - `lib/services/twitch/index.ts` ✓

---

## 8. DESIGN PATTERNS PROBLÉMATIQUES

### 8.1. Circular Dependency Resolution - BIEN FAIT
**Solution implémentée:** DatabaseConnector séparé de DatabaseService
- Évite: DatabaseService → Repositories → BaseRepository → DatabaseService
- ✓ Pattern correct appliqué

### 8.2. OBS Event Handler Type Cast
**Fichier:** `lib/adapters/obs/OBSEventHandler.ts:64`
```typescript
obs.on(eventName as any, (data: unknown) => {
```
- **Problème:** OBS library peut avoir des types génériques non supportés
- **Action:** Créer wrapper type-safe ou utiliser override techniques

---

## 9. SERVICES NON UTILISÉS (Mais Intentionnels)

| Service | Status | Raison |
|---------|--------|--------|
| DSKService | Incomplete | Feature optionnelle (downstream keyer) |
| SubVideoService | USED ✓ | Thumbnails et sub-video |
| OllamaSummarizerService | USED ✓ | LLM integration |
| WikipediaResolverService | USED ✓ | Wikipedia search |
| ServiceEnsurer | USED ✓ | Initialization helper |

---

## 10. RÉSUMÉ DES ACTIONS RECOMMANDÉES

### HAUTE PRIORITÉ
1. **Supprimer ou implémenter** `BackupService.importProfile()`
   - **Ligne:** `lib/services/BackupService.ts:76-79`
   - **Effort:** 1-2 jours si implémentation, 5 min si suppression

2. **Investiguer Preset Model**
   - **Ligne:** `lib/models/Preset.ts`
   - **Effort:** 2 heures investigation
   - **Action:** Décider si c'est une feature active ou morte

3. **Fixer `as any` dans OBSEventHandler**
   - **Ligne:** `lib/adapters/obs/OBSEventHandler.ts:64`
   - **Effort:** 1-2 heures

### MOYENNE PRIORITÉ
4. **Remplacer double casting `as unknown as T`**
   - **Fichier:** `lib/utils/ClientFetch.ts`
   - **Effort:** 2-3 heures

5. **Implémenter Macro Execution**
   - **Fichiers:** `components/dashboard/MacrosBar.tsx`, `app/api/actions/macro/route.ts`
   - **Effort:** 1-2 jours

6. **Nettoyer TODOs de Quiz**
   - **Fichier:** `server/api/quiz.ts:77`
   - **Effort:** 1-2 heures

### BASSE PRIORITÉ
7. **Documenter les services intentionnellement incomplets**
   - DSKService, BackupService.importProfile()
   - Effort: 30 min

---

## 11. FICHIERS À EXAMINER DE PRÈS

1. **lib/services/BackupService.ts** - 2 TODOs, 1 fonction non-impl
2. **lib/models/Preset.ts** - Code mort probable
3. **lib/adapters/obs/OBSEventHandler.ts** - Type safety issues
4. **lib/utils/ClientFetch.ts** - Double casting antipattern
5. **lib/utils/CsvParser.ts** - 2x `as any` casts

---

## 12. POINTS POSITIFS

✓ Excellent pattern singleton consistency
✓ Bien structuré: lib/services, lib/models, lib/repositories séparation claire
✓ Types Zod utilisés judicieusement
✓ Good error handling dans la plupart des services
✓ Circular dependency issue bien résolu avec DatabaseConnector

---

**Conclusion:** Le codebase est globalement bien structuré avec **3-4 problèmes réels** identifiés (BackupService, Preset Model, type safety dans OBS/CSV) et plusieurs **patterns mineurs à nettoyer**. Aucun problème architectural majeur détecté.
