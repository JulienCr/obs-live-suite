# Audit Command

Lance un audit complet du code avec collecte de métriques, trending historique et propositions de corrections.

## Fichiers de Référence

- `docs/audit-history.json` - Historique des métriques pour comparaison
- `docs/AUDIT-CODE-2026-01.md` - Rapport d'audit de référence
- `docs/AUDIT-PROGRESS.md` - Suivi des corrections en cours

## Workflow

### Étape 1: Vérifications Préalables

1. Vérifier git status - s'assurer qu'il n'y a pas de fichiers non commités
2. Si fichiers modifiés, demander au user de commit/stash avant de continuer

### Étape 2: Collecter les Métriques Automatisées

Exécuter le script de collecte:
```bash
node scripts/audit-metrics.js
```

Ce script génère `docs/audit-reports/metrics-{date}.json` avec:
- **Quality**: JSON.parse non protégés, String(error), `as any`, magic numbers
- **Maintainability**: Taille des fichiers, repositories extraits, moyenne lignes
- **DRY**: Adoption ProxyHelper, lignes dupliquées estimées
- **Tests**: Nombre de fichiers test, couverture Jest

### Étape 3: Comparer avec l'Historique

Exécuter la comparaison:
```bash
node scripts/audit-compare.js
```

Génère `docs/audit-reports/comparison-{date}.json` avec:
- Deltas par métrique (↑ amélioration, ↓ régression, → stable)
- Résumé des améliorations et régressions
- Scores comparés

### Étape 4: Analyse Qualitative (Agents Parallèles)

Si les métriques révèlent des problèmes, dispatcher des agents spécialisés:

| Condition | Agent | Focus |
|-----------|-------|-------|
| unsafeJsonParse > 0 | nextjs-expert | Vérifier wrapping safeJsonParse |
| exposedErrors > 5 | nextjs-expert | Vérifier utilisation apiError/expressError |
| Largest file > 500 lines | nextjs-expert | Identifier candidates extraction SRP |
| usingRawFetch > 0 | nextjs-expert | Routes à refactoriser avec ProxyHelper |
| coverage < 20% | nextjs-expert | Identifier tests prioritaires |

**Format d'appel agent:**
```
Task(subagent_type="nextjs-expert", prompt="Analyser {scope} pour {objectif}. Fichiers: {liste}")
```

### Étape 5: Générer le Rapport

Créer `docs/audit-reports/{date}_audit-report.md` avec le format suivant:

```markdown
# Audit Report - {DATE}

**Branch**: {branch}
**Commit**: {commit}
**Précédent**: {previous_date} ({previous_commit})

## Résumé Exécutif

| Dimension | Précédent | Actuel | Delta | Trend |
|-----------|-----------|--------|-------|-------|
| Quality | X.X | Y.Y | +/-Z.Z | ↑/↓/→ |
| Maintainability | ... | ... | ... | ... |
| DRY | ... | ... | ... | ... |
| Tests | ... | ... | ... | ... |
| **Overall** | ... | ... | ... | ... |

## Améliorations
- {liste des métriques améliorées}

## Régressions
- {liste des métriques dégradées}

## Issues Identifiées

### Critique (Action Immédiate)
{issues critiques avec fichier:ligne}

### Haute Priorité
{issues importantes}

### Moyenne Priorité
{issues à traiter}

## Batch de Corrections Proposé

| ID | Issue | Effort | Impact | Priority | Agent |
|----|-------|--------|--------|----------|-------|
| CB-XXX | Description | Low/Med/High | 1-5 | P1/P2/P3 | agent-type |

## Prochaines Cibles
1. {objectif 1}
2. {objectif 2}
```

### Étape 6: Mettre à Jour l'Historique

Ajouter les métriques courantes à `docs/audit-history.json`:

```javascript
// Lire le fichier metrics généré
// Ajouter une entrée à audits[]
{
  "date": "{date}",
  "label": "Post-{feature/fix}",
  "commit": "{commit}",
  "branch": "{branch}",
  "scores": { ... },
  "metrics": { ... }
}
```

### Étape 7: Présenter le Batch de Corrections

Présenter au user le batch de corrections proposé avec:
- Estimation effort total
- Priorités (P1 = immédiat, P2 = court terme, P3 = moyen terme)
- Agent suggéré pour chaque correction

Demander validation:
- "Voulez-vous exécuter ces corrections maintenant?"
- "Quelles corrections voulez-vous approuver?"

Si approuvé → utiliser `/audit-continue` pour exécuter les corrections validées.

---

## Scoring

Les scores sont calculés automatiquement par `audit-metrics.js`:

| Score | Calcul |
|-------|--------|
| Quality | 10 - (unsafeJsonParse×0.3 + exposedErrors×0.2 + asAny×0.1) |
| Maintainability | 10 - largestFile/300 + repoProgress×3 |
| DRY | proxyAdoption × 10 |
| Tests | coverage / 10 |
| Overall | Moyenne des 4 scores |

## Exemples de Corrections

### P1 - Critique
```
CB-001: Wrap JSON.parse dans QuizStore.ts:46
- Effort: Low (15min)
- Impact: 5 (crash prevention)
- Action: Remplacer par safeJsonParse
```

### P2 - Haute
```
CB-002: Extraire SettingsRepository
- Effort: Medium (45min)
- Impact: 4 (SRP compliance)
- Action: Suivre pattern GuestRepository
```

### P3 - Moyenne
```
CB-003: Refactoriser poster routes complexes
- Effort: High (2h)
- Impact: 3 (DRY improvement)
- Action: Nécessite décision architecture theme enrichment
```

---

## Notes

- Les métriques sont stockées en JSON pour permettre le trending
- Le rapport markdown est généré pour lecture humaine
- L'historique permet de visualiser la progression sur plusieurs audits
- Les corrections sont semi-automatisées: proposition → validation → exécution
