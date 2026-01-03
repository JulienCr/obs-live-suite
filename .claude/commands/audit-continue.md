# Audit Continue Command

Continue l'audit du code selon les fichiers de référence et lance des agents parallèles pour traiter les tâches restantes.

## Fichiers de Référence

- `docs/audit-reports/CURRENT-AUDIT.md` - Rapport d'audit complet avec toutes les issues identifiées. Chaque scope a son propre fichier, lien dans le rapport.
- `docs/AUDIT-PROGRESS.md` - Progression actuelle (à lire à chaque exécution)

## Intégration avec /audit

Si un rapport d'audit récent existe dans `docs/audit-reports/`:
1. Lire le dernier rapport `{date}_audit-report.md` ou `comparison-{date}.json`
2. Utiliser le "Batch de Corrections Proposé" comme source de tâches
3. Exécuter les corrections validées par l'utilisateur

Si pas de rapport récent, utiliser le workflow classique ci-dessous.

## Instructions

### Étape 0: Vérifier Batch de Corrections (Nouveau)

1. Chercher le fichier le plus récent dans `docs/audit-reports/comparison-*.json`
2. Si trouvé, extraire les corrections de `summary.improvements` et `summary.regressions`
3. Proposer ces corrections comme tâches prioritaires
4. Sinon, continuer avec l'Étape 1 classique

### Étape 1: Analyser l'État Actuel

1. Lire `docs/AUDIT-PROGRESS.md` pour identifier:
   - Les phases complétées (✅)
   - Les phases en cours ou en attente
   - Les tâches restantes dans chaque phase

2. Vérifier git status pour les fichiers modifiés non commités

3. Lire `docs/AUDIT-CODE-2026-01.md` si besoin de contexte sur une tâche spécifique

### Étape 2: Déterminer le Prochain Batch

Sélectionner les tâches du batch selon:
1. **Ordre des phases** (3 avant 4 avant 5)
2. **Dépendances** (ne pas extraire un repository avant d'avoir l'interface)
3. **Parallélisabilité** (tâches sur fichiers différents = parallèle)

**Règles de batch:**
- Maximum 3-4 tâches parallèles pour éviter conflits
- Grouper par type de travail (extraction, tests, nettoyage)
- Si fichiers non commités: demander au user de commit/stash d'abord

### Étape 3: Lancer les Agents Parallèles

Utiliser les agents appropriés selon le type de tâche:

| Type de tâche | Agent | Justification |
|---------------|-------|---------------|
| Extraction service/repository | `nextjs-expert` | Architecture Next.js/TypeScript |
| WebSocket/temps réel | `realtime-websocket` | Spécialiste pub/sub, ChannelManager |
| Tests unitaires | `nextjs-expert` | Jest, testing-library |
| Exploration/recherche | `Explore` | Recherche rapide dans le codebase |
| OBS integration | `obs-websocket` | Protocole OBS WebSocket v5 |

**Format d'appel:**
```
Task(subagent_type="<agent>", prompt="<description précise de la tâche avec fichiers source et destination>")
```

### Étape 4: Scope des Agents

Chaque agent doit:
1. Lire les fichiers sources concernés
2. Appliquer les modifications nécessaires
3. Vérifier que TypeScript compile (`pnpm type-check`)
4. Reporter les changements effectués

**NE PAS:**
- Commiter les changements (le user le fera)
- Modifier des fichiers hors du scope assigné
- Introduire de nouvelles dépendances sans justification

### Étape 5: Mettre à Jour la Progression

Après chaque batch, mettre à jour `docs/AUDIT-PROGRESS.md`:
- Marquer les tâches complétées avec ✅
- Ajouter les fichiers créés/modifiés
- Mettre à jour les statistiques si applicable
- Incrémenter la date de mise à jour

## Exemples de Prompts par Type

### Extraction Repository
```
"Extraire {Entity}Repository de DatabaseService:
- Créer lib/repositories/{Entity}Repository.ts
- Méthodes: getAll, getById, create, update, delete
- Modifier DatabaseService pour déléguer à ce repository
- Conserver la même signature d'API"
```

### Tests Unitaires
```
"Créer tests unitaires pour lib/utils/{utility}.ts:
- Fichier: __tests__/utils/{utility}.test.ts
- Couvrir: cas nominal, edge cases, erreurs
- Utiliser Jest"
```

### Nettoyage Magic Numbers
```
"Appliquer Constants.ts dans {fichier}:
- Identifier les magic numbers
- Importer depuis lib/config/Constants.ts
- Ajouter de nouvelles constantes si nécessaire"
```

## Notes

- Toujours vérifier git status avant de lancer un nouveau batch
- Reporter clairement au user les tâches lancées et leur scope
- En cas de conflit potentiel entre agents, séquencer les tâches
