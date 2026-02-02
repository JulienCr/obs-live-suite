# Plan d'Amélioration de la Couche Base de Données

> **Objectif** : Améliorer la type safety, réduire le boilerplate, et sécuriser l'accès aux données sans migrer vers un ORM.

## Vue d'Ensemble

```
Phase 1: Statement Cache + Query Helpers     [Fondation]
Phase 2: Centralisation Sérialisation JSON   [Boilerplate]
Phase 3: Validation Zod en Sortie            [Type Safety]
Phase 4: Tests d'Intégration Repository      [Fiabilité]
Phase 5: SQL Linting (Optionnel)             [Bonus]
```

---

## Phase 1 : Statement Cache + Query Helpers

**Objectif** : Éliminer les casts répétitifs et améliorer les performances.

### 1.1 Créer `lib/repositories/QueryHelpers.ts`

```typescript
import Database from "better-sqlite3";

/**
 * Cache de statements préparés pour éviter les recompilations
 */
export class StatementCache {
  private cache = new Map<string, Database.Statement>();

  constructor(private db: Database.Database) {}

  prepare(sql: string): Database.Statement {
    let stmt = this.cache.get(sql);
    if (!stmt) {
      stmt = this.db.prepare(sql);
      this.cache.set(sql, stmt);
    }
    return stmt;
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Helper typé pour récupérer une seule ligne
 */
export function queryOne<TRow>(
  cache: StatementCache,
  sql: string,
  ...params: unknown[]
): TRow | undefined {
  return cache.prepare(sql).get(...params) as TRow | undefined;
}

/**
 * Helper typé pour récupérer plusieurs lignes
 */
export function queryAll<TRow>(
  cache: StatementCache,
  sql: string,
  ...params: unknown[]
): TRow[] {
  return cache.prepare(sql).all(...params) as TRow[];
}

/**
 * Helper typé pour les mutations (INSERT/UPDATE/DELETE)
 */
export function run(
  cache: StatementCache,
  sql: string,
  ...params: unknown[]
): Database.RunResult {
  return cache.prepare(sql).run(...params);
}
```

### 1.2 Intégrer dans BaseRepository

```typescript
// lib/repositories/BaseRepository.ts
import { StatementCache, queryOne, queryAll, run } from "./QueryHelpers";

export abstract class BaseRepository<TEntity, TRow, TInput, TUpdate> {
  protected stmtCache: StatementCache;

  constructor() {
    const db = DatabaseConnector.getInstance().getDb();
    this.stmtCache = new StatementCache(db);
  }

  getById(id: string): TEntity | null {
    const row = queryOne<TRow>(
      this.stmtCache,
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      id
    );
    return row ? this.transformRow(row) : null;
  }

  getAll(): TEntity[] {
    const rows = queryAll<TRow>(
      this.stmtCache,
      `SELECT * FROM ${this.tableName}`
    );
    return rows.map(row => this.transformRow(row));
  }
}
```

### Fichiers à modifier
- [ ] `lib/repositories/QueryHelpers.ts` (nouveau)
- [ ] `lib/repositories/BaseRepository.ts`
- [ ] Tous les repositories concrets (GuestRepository, ThemeRepository, etc.)

---

## Phase 2 : Centralisation Sérialisation JSON

**Objectif** : Un seul helper pour parser/stringifier le JSON, convention de nommage claire.

### 2.1 Convention de Nommage

Colonnes JSON suffixées `_json` ou documentées dans `transformConfig`:

```typescript
// Convention explicite dans le schema
colors_json TEXT NOT NULL DEFAULT '{}'
tags_json TEXT NOT NULL DEFAULT '[]'
```

### 2.2 Créer `lib/utils/JsonColumn.ts`

```typescript
/**
 * Parse JSON avec type safety et fallback
 */
export function parseJsonColumn<T>(
  value: string | null | undefined,
  defaultValue: T
): T {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Stringify avec gestion null
 */
export function stringifyJsonColumn<T>(value: T | null | undefined): string {
  if (value === null || value === undefined) return "null";
  return JSON.stringify(value);
}

/**
 * Configuration pour une colonne JSON
 */
export interface JsonColumnConfig<T> {
  column: string;
  defaultValue: T;
  optional?: boolean;
}

/**
 * Applique les transformations JSON à un objet row
 */
export function applyJsonTransforms<TRow extends Record<string, unknown>>(
  row: TRow,
  configs: JsonColumnConfig<unknown>[]
): TRow {
  const result = { ...row };
  for (const config of configs) {
    const value = result[config.column] as string | null;
    result[config.column] = parseJsonColumn(value, config.defaultValue);
  }
  return result;
}
```

### 2.3 Simplifier BaseRepository.transformRow

```typescript
// Avant
protected transformRow(row: TRow): TEntity {
  const result = { ...row } as unknown as TEntity;

  // JSON columns (répétitif)
  for (const config of this.transformConfig.jsonColumns ?? []) {
    const value = (row as Record<string, unknown>)[config.column] as string;
    (result as Record<string, unknown>)[config.column] =
      safeJsonParse(value, config.defaultValue);
  }
  // ... autres transformations
  return result;
}

// Après
protected transformRow(row: TRow): TEntity {
  let result = { ...row } as unknown as Record<string, unknown>;

  // JSON en une ligne
  result = applyJsonTransforms(result, this.transformConfig.jsonColumns ?? []);

  // Autres transformations...
  return result as TEntity;
}
```

### Fichiers à modifier
- [ ] `lib/utils/JsonColumn.ts` (nouveau)
- [ ] `lib/repositories/BaseRepository.ts`
- [ ] `lib/services/DatabaseService.ts` (pour les méthodes non-repository)

---

## Phase 3 : Validation Zod en Sortie Repository

**Objectif** : Détecter les incohérences types/DB en dev/test sans overhead en prod.

### 3.1 Ajouter schema Zod optionnel à BaseRepository

```typescript
// lib/repositories/BaseRepository.ts
import { z } from "zod";

export abstract class BaseRepository<TEntity, TRow, TInput, TUpdate> {
  /**
   * Schema Zod optionnel pour validation runtime
   * Activé uniquement si NODE_ENV !== 'production'
   */
  protected entitySchema?: z.ZodType<TEntity>;

  protected transformRow(row: TRow): TEntity {
    const entity = this.applyTransformations(row);

    // Validation en dev/test uniquement
    if (this.entitySchema && process.env.NODE_ENV !== "production") {
      const result = this.entitySchema.safeParse(entity);
      if (!result.success) {
        this.logger.error("Row validation failed", {
          table: this.tableName,
          row,
          errors: result.error.format(),
        });
        // En dev: throw pour détecter tôt
        // En test: throw pour fail fast
        throw new Error(`Invalid row in ${this.tableName}: ${result.error.message}`);
      }
    }

    return entity;
  }
}
```

### 3.2 Implémenter dans les repositories concrets

```typescript
// lib/repositories/GuestRepository.ts
import { dbGuestSchema } from "@/lib/models/Database";

export class GuestRepository extends EnabledBaseRepository<...> {
  protected readonly entitySchema = dbGuestSchema;
  // ... reste inchangé
}
```

### 3.3 Ajouter les schemas manquants dans Database.ts

```typescript
// lib/models/Database.ts
import { z } from "zod";

export const dbGuestSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  subtitle: z.string().nullable(),
  accentColor: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  chatMessage: z.string().nullable(),
  isEnabled: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type DbGuest = z.infer<typeof dbGuestSchema>;

// Répéter pour chaque entité...
```

### Fichiers à modifier
- [ ] `lib/models/Database.ts` (ajouter schemas Zod)
- [ ] `lib/repositories/BaseRepository.ts`
- [ ] Tous les repositories concrets

---

## Phase 4 : Tests d'Intégration Repository

**Objectif** : Sécuriser les typos SQL et valider les migrations.

### 4.1 Setup Test avec DB Éphémère

```typescript
// __tests__/repositories/testDbSetup.ts
import Database from "better-sqlite3";
import { DatabaseService } from "@/lib/services/DatabaseService";
import path from "path";
import os from "os";
import fs from "fs";

export function createTestDb(): { db: Database.Database; cleanup: () => void } {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "obs-test-"));
  const dbPath = path.join(tempDir, "test.db");

  // Initialiser avec le même schema que prod
  const db = new Database(dbPath);
  // ... appliquer schema et migrations

  return {
    db,
    cleanup: () => {
      db.close();
      fs.rmSync(tempDir, { recursive: true });
    },
  };
}
```

### 4.2 Tests de Base pour Chaque Repository

```typescript
// __tests__/repositories/GuestRepository.test.ts
import { createTestDb } from "./testDbSetup";
import { GuestRepository } from "@/lib/repositories/GuestRepository";

describe("GuestRepository", () => {
  let cleanup: () => void;
  let repo: GuestRepository;

  beforeEach(() => {
    const { db, cleanup: c } = createTestDb();
    cleanup = c;
    // Inject test db into repository
    repo = GuestRepository.getTestInstance(db);
  });

  afterEach(() => cleanup());

  it("creates and retrieves a guest", () => {
    const input = {
      id: "test-1",
      displayName: "Test Guest",
      isEnabled: true,
    };

    repo.create(input);
    const guest = repo.getById("test-1");

    expect(guest).toBeDefined();
    expect(guest?.displayName).toBe("Test Guest");
    expect(guest?.isEnabled).toBe(true); // Boolean, pas 1
    expect(guest?.createdAt).toBeInstanceOf(Date);
  });

  it("handles JSON columns correctly", () => {
    // Pour PosterRepository, ThemeRepository, etc.
  });

  it("applies migrations without errors", () => {
    // Vérifier que les migrations s'appliquent sur DB vide
  });
});
```

### 4.3 Test de Migration

```typescript
// __tests__/services/MigrationRunner.test.ts
import { MigrationRunner } from "@/lib/services/MigrationRunner";

describe("MigrationRunner", () => {
  it("applies all migrations on fresh database", () => {
    const { db, cleanup } = createTestDb();
    try {
      const runner = new MigrationRunner(db);
      // Ne doit pas throw
      expect(() => runner.runAll()).not.toThrow();
    } finally {
      cleanup();
    }
  });

  it("migrations are idempotent", () => {
    const { db, cleanup } = createTestDb();
    try {
      const runner = new MigrationRunner(db);
      runner.runAll();
      runner.runAll(); // Doit être safe
    } finally {
      cleanup();
    }
  });
});
```

### Fichiers à créer
- [ ] `__tests__/repositories/testDbSetup.ts`
- [ ] `__tests__/repositories/GuestRepository.test.ts`
- [ ] `__tests__/repositories/ThemeRepository.test.ts`
- [ ] `__tests__/repositories/PosterRepository.test.ts`
- [ ] `__tests__/repositories/ProfileRepository.test.ts`
- [ ] `__tests__/services/MigrationRunner.test.ts`

---

## Phase 5 : SQL Linting (Optionnel)

**Objectif** : Détecter les erreurs de syntaxe SQL avant runtime.

### Option A : sql-template-strings (léger)

```typescript
// Utiliser des templates taggés pour highlight + validation basique
import { sql } from "sql-template-strings";

const query = sql`
  SELECT * FROM guests
  WHERE id = ${id}
  AND is_enabled = ${1}
`;
```

### Option B : eslint-plugin-sql

```bash
pnpm add -D eslint-plugin-sql
```

```json
// .eslintrc
{
  "plugins": ["sql"],
  "rules": {
    "sql/format": ["error", {
      "ignoreExpressions": false,
      "ignoreInline": true,
      "ignoreTagless": true
    }],
    "sql/no-unsafe-query": "warn"
  }
}
```

### Option C : sqlfluff (externe)

Pour validation plus poussée, utiliser sqlfluff en pre-commit:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/sqlfluff/sqlfluff
    rev: 3.0.0
    hooks:
      - id: sqlfluff-lint
        args: [--dialect, sqlite]
```

### Recommandation

Commencer par **Option A** (léger, intégré) puis évaluer si Option B/C apporte de la valeur.

---

## Ordre d'Implémentation Recommandé

```
┌──────────────────────────────────────────────────────────┐
│  Phase 1: Query Helpers (2-3h)                           │
│  → Fondation pour tout le reste                          │
├──────────────────────────────────────────────────────────┤
│  Phase 2: JSON Helpers (1-2h)                            │
│  → Réduit immédiatement le boilerplate                   │
├──────────────────────────────────────────────────────────┤
│  Phase 4: Tests Repository (3-4h)                        │
│  → Sécurise avant les changements de Phase 3             │
├──────────────────────────────────────────────────────────┤
│  Phase 3: Validation Zod (2-3h)                          │
│  → Une fois les tests en place pour valider              │
├──────────────────────────────────────────────────────────┤
│  Phase 5: SQL Lint (optionnel, 1h)                       │
│  → Nice-to-have                                          │
└──────────────────────────────────────────────────────────┘

Total estimé: 9-13h de travail
```

---

## Critères de Succès

- [ ] Aucun `as TRow[]` ou `as TEntity` direct dans les repositories
- [ ] JSON parsing centralisé dans un seul helper
- [ ] Tous les repositories ont des tests d'intégration
- [ ] Validation Zod active en dev/test
- [ ] Migrations testées automatiquement
- [ ] Zero régression sur les fonctionnalités existantes

---

## Ressources

- `lib/repositories/BaseRepository.ts` - Base actuelle
- `lib/models/Database.ts` - Types entités
- `lib/services/MigrationRunner.ts` - Système de migrations
- `__tests__/` - Structure de tests existante
