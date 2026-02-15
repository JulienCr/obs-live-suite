# Audit de montee en version Next.js 15.5.9 → 16.1.16

> Date : 2026-02-15
> Status : A planifier

## Contexte

| Element | Actuel | Cible |
|---------|--------|-------|
| Next.js | 15.5.9 | 16.1.16 |
| React | 19.2.3 | 19.2+ (compatible) |
| Node.js | v24.13.0 | v20.9+ requis (OK) |
| TypeScript | 5.9.3 | 5.1+ requis (OK) |

Sources : [Next.js 16 Blog](https://nextjs.org/blog/next-16) | [Guide de migration](https://nextjs.org/docs/app/guides/upgrading/version-16)

---

## 1. BREAKING CHANGES - Impact direct sur le projet

### 1.1 Turbopack devient le bundler par defaut (IMPACT FORT)

**Probleme** : Le projet a une configuration `webpack` custom dans `next.config.mjs` (lignes 62-94). Avec Next.js 16, `next build` utilise Turbopack par defaut et **echouera si une config webpack est detectee**.

**Config webpack actuelle** :
- Server-side : externalise `better-sqlite3`
- Client-side : polyfills `crypto-browserify`, `stream-browserify`, `buffer` + ProvidePlugin pour `Buffer`/`process`
- Suppression des logs d'infrastructure

**Solutions** :
- **Option A (recommandee)** : Utiliser `next build --webpack` et `next dev --webpack` pour garder le comportement actuel. Aucune migration necessaire.
- **Option B** : Migrer vers Turbopack en utilisant `turbopack.resolveAlias` avec des modules vides pour les polyfills client :
  ```ts
  turbopack: {
    resolveAlias: {
      fs: { browser: './empty.ts' },
      path: { browser: './empty.ts' },
      crypto: { browser: 'crypto-browserify' },
      stream: { browser: 'stream-browserify' },
      buffer: { browser: 'buffer' },
    }
  }
  ```
  Cela necessite aussi de resoudre le `ProvidePlugin` (Buffer/process globaux) qui n'a pas d'equivalent direct en Turbopack.

**Fichiers concernes** : `next.config.mjs`, `package.json` (scripts)

---

### 1.2 `middleware.ts` renomme en `proxy.ts` (IMPACT MOYEN)

**Probleme** : Le fichier `middleware.ts` est deprecie. La convention est maintenant `proxy.ts` avec une fonction exportee `proxy` au lieu de `middleware`.

**Etat actuel** : `middleware.ts` utilise `createMiddleware` de `next-intl/middleware`. Le runtime passe de `edge` (implicite) a `nodejs` pour `proxy.ts`.

**Action** :
- Renommer `middleware.ts` → `proxy.ts`
- Adapter l'export si next-intl le supporte (verifier la compatibilite)
- **Attention** : `proxy.ts` utilise le runtime `nodejs` exclusivement. Si next-intl necessite le runtime `edge`, garder `middleware.ts` (toujours supporte mais deprecie)

**Fichiers concernes** : `middleware.ts`

---

### 1.3 Suppression de `next lint` (IMPACT MOYEN)

**Probleme** : La commande `next lint` est supprimee. `next build` ne lance plus le linting non plus.

**Etat actuel** : `package.json` a `"lint": "next lint"`. La config `eslint: { ignoreDuringBuilds: true }` dans `next.config.mjs` est aussi supprimee.

**Action** :
- Remplacer le script `"lint"` par un appel direct a ESLint : `"lint": "eslint ."`
- Supprimer `eslint: { ignoreDuringBuilds: true }` de `next.config.mjs`
- Mettre a jour `eslint-config-next` vers la version 16 ou migrer vers le format flat config ESLint
- **Codemod disponible** : `npx @next/codemod@canary next-lint-to-eslint-cli .`

**Fichiers concernes** : `package.json`, `next.config.mjs`

---

### 1.4 `images.domains` deprecie (IMPACT FAIBLE)

**Probleme** : La config `images: { domains: ['localhost'] }` est depreciee.

**Action** : Remplacer par `images.remotePatterns` :
```js
images: {
  unoptimized: true,
  remotePatterns: [
    { protocol: 'https', hostname: 'localhost' },
  ],
}
```

**Note** : Comme `unoptimized: true` est utilise, l'impact est minimal. Les images ne passent pas par l'optimiseur Next.js.

**Fichiers concernes** : `next.config.mjs`

---

### 1.5 Async Request APIs - Acces synchrone supprime (IMPACT NUL)

Le projet utilise **deja** le pattern async pour `params` :
```ts
async function LocaleLayout({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
}
```

Aucune utilisation de `cookies()`, `headers()`, ou `draftMode()` n'a ete detectee dans le code applicatif. **Aucune action requise.**

---

### 1.6 Changements `next/image` (IMPACT NUL)

- `minimumCacheTTL` passe de 60s a 4h (pas d'impact, images `unoptimized: true`)
- `imageSizes` retire la taille 16px (pas d'impact, images `unoptimized: true`)
- `qualities` reduit a `[75]` (pas d'impact, images `unoptimized: true`)
- `dangerouslyAllowLocalIP` bloque par defaut (pas d'impact, images `unoptimized: true`)

**Aucune action requise** tant que `unoptimized: true` est maintenu.

---

## 2. DEPRECATIONS A SURVEILLER

| Element | Status | Urgence |
|---------|--------|---------|
| `middleware.ts` | Deprecie, remplace par `proxy.ts` | Migrer avant Next.js 17 |
| `images.domains` | Deprecie, remplace par `remotePatterns` | Faible urgence |
| `revalidateTag()` a 1 argument | Deprecie, necessaire 2e argument `cacheLife` | Non utilise dans le projet |

---

## 3. CONFIG `next.config.mjs` - Changements requis

```diff
 // Options a supprimer
- eslint: {
-   ignoreDuringBuilds: true,
- },

 // Options a migrer
- images: {
-   domains: ['localhost'],
-   unoptimized: true,
- },
+ images: {
+   unoptimized: true,
+   remotePatterns: [
+     { protocol: 'https', hostname: 'localhost' },
+   ],
+ },

 // Turbopack : deja en top-level (OK)
 // La config turbopack actuelle est deja au bon endroit
```

---

## 4. NOUVELLES FONCTIONNALITES DISPONIBLES

### 4.1 Apports immediats (sans opt-in)

| Feature | Benefice pour le projet |
|---------|------------------------|
| **Routing optimise** | Layout deduplication + prefetch incremental. Toutes les pages du dashboard beneficient automatiquement de navigations plus rapides |
| **Dev/Build concurrent** | `.next/dev` et `.next/build` separes. Permet de builder sans arreter le dev server |
| **Performance `next dev`** | Demarrage plus rapide, meilleurs logs avec temps compile/render |
| **React 19.2** | `useEffectEvent` (stabilise), View Transitions, `<Activity>` |
| **Turbopack FS Cache (beta)** | Persistance du cache compilateur entre redemarrages dev |

### 4.2 Opt-in disponibles

| Feature | Activation | Interet pour le projet |
|---------|-----------|----------------------|
| **React Compiler** | `reactCompiler: true` dans next.config | Auto-memoization des composants. Potentiellement interessant pour le dashboard complexe (Dockview + cartes). Augmente le temps de build. |
| **Cache Components** | `cacheComponents: true` | PPR opt-in. Pas critique pour ce projet (pas de contenu statique/dynamique mixte). |
| **Turbopack FS Cache** | `experimental: { turbopackFileSystemCacheForDev: true }` | Reduit les temps de compile entre redemarrages dev. Recommande. |
| **View Transitions** | API React native | Animations de transition entre pages sans Framer Motion. Pourrait simplifier certaines animations d'overlay. |

### 4.3 Nouvelles APIs de cache

| API | Description |
|-----|------------|
| `updateTag()` | Server Actions only - read-your-writes semantics |
| `refresh()` | Server Actions only - rafraichit le router client |
| `cacheLife` / `cacheTag` | Stabilises (plus de prefix `unstable_`) |

**Note** : Le projet n'utilise pas de Server Actions ni de caching Next.js. Ces APIs sont disponibles si le projet evolue vers ce pattern.

---

## 5. DEPENDANCES TIERCES - Compatibilite

| Dependance | Version actuelle | Compatible Next.js 16 ? | Action |
|-----------|-----------------|------------------------|--------|
| `next-intl` | 4.7.0 | Oui (v4.8.2 disponible) | Upgrader vers 4.8.x pour support `proxy.ts` |
| `next-themes` | 0.4.6 | Oui | Aucune |
| `eslint-config-next` | 15.5.9 | Non | Upgrader vers 16.x |
| `next/jest` | Via next | Oui | Aucune |
| `@tanstack/react-query` | 5.90.16 | Oui | Aucune |
| `framer-motion` | 12.34.0 | Oui | Aucune |
| `dockview` | 4.12.0 | Oui | Aucune |
| `zustand` | 5.0.11 | Oui | Aucune |

---

## 6. SERVEUR CUSTOM HTTPS (`server.js`)

Le fichier `server.js` utilise l'API `next()` et `app.getRequestHandler()`. Cette API est toujours supportee en Next.js 16 mais **necessite des tests** :
- L'output dev est maintenant dans `.next/dev` au lieu de `.next`
- Le script `scripts/start-frontend.mjs` verifie `existsSync('.next/BUILD_ID')` ce qui devrait continuer a fonctionner pour la production
- Tester le HTTPS custom server apres upgrade

---

## 7. PLAN DE MIGRATION RECOMMANDE

### Etape 1 : Preparation (sans changer de version)
1. Remplacer `images.domains` par `images.remotePatterns` dans `next.config.mjs`
2. Supprimer `eslint: { ignoreDuringBuilds: true }` de `next.config.mjs`
3. Changer le script lint : `"lint": "eslint ."` dans `package.json`

### Etape 2 : Upgrade des dependances
```bash
pnpm add next@16.1.16 react@latest react-dom@latest
pnpm add -D eslint-config-next@16 @types/react@latest @types/react-dom@latest
pnpm add next-intl@latest
```

### Etape 3 : Adapter la configuration
1. Ajouter `--webpack` aux scripts build : `"build:direct": "next build --webpack"`
2. Renommer `middleware.ts` → `proxy.ts` (si next-intl le supporte)
3. Supprimer le script `"lint": "next lint"` ou le remplacer par ESLint CLI

### Etape 4 : Verification
1. `pnpm dev` - Verifier que le dev server demarre
2. `pnpm build --webpack` - Verifier que le build passe
3. Tester le serveur HTTPS custom
4. Tester la navigation i18n (next-intl middleware/proxy)
5. Tester les overlays OBS (WebSocket + rendu)
6. `pnpm test` - Lancer les tests unitaires
7. `pnpm type-check` - Verifier le typage

### Etape 5 : Optimisations optionnelles (post-migration)
1. Activer `turbopackFileSystemCacheForDev` pour accelerer le dev
2. Evaluer le React Compiler sur le dashboard
3. Migrer la config webpack vers Turbopack si les polyfills peuvent etre elimines

---

## 8. ESTIMATION DES RISQUES

| Risque | Probabilite | Impact | Mitigation |
|--------|------------|--------|------------|
| Build echoue (webpack config) | **Certain** si pas `--webpack` | Bloquant | Ajouter flag `--webpack` |
| next-intl incompatible proxy.ts | Faible | Moyen | Garder `middleware.ts` (deprecie mais supporte) |
| Serveur HTTPS custom casse | Faible | Fort | Tester avant deploiement |
| Polyfills client cassent | Faible (si `--webpack`) | Moyen | Garder webpack pour le build |
| Tests Jest echouent | Faible | Faible | `next/jest` toujours supporte |

---

## 9. APPROCHE NOMINALE : MIGRATION TURBOPACK COMPLETE

### 9.1 Interet de l'approche Turbopack (sans `--webpack`)

| Avantage | Detail |
|----------|--------|
| **Build 2-5x plus rapide** | Turbopack est significativement plus rapide que webpack pour les builds de production. Sur un projet de cette taille (~100+ composants client, 95+ routes API), le gain est substantiel. |
| **Fast Refresh jusqu'a 10x plus rapide** | Le HMR en dev est nettement accelere. Chaque sauvegarde de fichier se reflète plus vite dans le navigateur. |
| **FS Cache (beta)** | Le cache filesystem persiste entre redemarrages du dev server. Turbopack le supporte nativement, webpack non. |
| **Pérennite** | Webpack est en voie de depreciation dans Next.js. L'equipe Vercel investit exclusivement dans Turbopack. Le flag `--webpack` sera probablement retire dans Next.js 17 ou 18. |
| **Moins de config** | Turbopack n'a pas besoin de la moitie de la config webpack actuelle (ProvidePlugin, fallbacks, infrastructure logging). Config plus simple = moins de maintenance. |
| **Alignement avec l'ecosysteme** | 50%+ des sessions dev et 20%+ des builds en production sur Next.js 15.3+ utilisent deja Turbopack. Les nouveaux outils et features sont d'abord testes/optimises pour Turbopack. |

### 9.2 Analyse de la config webpack actuelle

La config webpack du projet fait 3 choses :

**A. Externalisation de `better-sqlite3` (server-side)**
```js
if (isServer) { config.externals.push('better-sqlite3'); }
```
→ **Deja gere** par `serverExternalPackages: ['better-sqlite3', 'obs-websocket-js', 'ws']` dans la config Next.js. Turbopack respecte cette option. **Aucune action requise.**

**B. Polyfills client-side (crypto, stream, buffer, fs, path)**
```js
config.resolve.fallback = { fs: false, path: false, crypto: 'crypto-browserify', stream: 'stream-browserify', buffer: 'buffer' };
config.plugins.push(new webpack.ProvidePlugin({ Buffer: ['buffer', 'Buffer'], process: 'process/browser' }));
```

**Constat important** : Apres analyse exhaustive du code source (`components/`, `hooks/`, `lib/`, `app/`), **aucun fichier applicatif n'importe directement `crypto`, `stream`, `buffer`, ou `process`**. Ces polyfills ont ete ajoutes pour des dependances transitives qui ne sont peut-etre plus d'actualite (ou qui ne sont importees que cote serveur).

**C. Suppression des logs d'infrastructure**
```js
config.infrastructureLogging = { level: 'error' };
```
→ Specifique a webpack. Turbopack a ses propres logs, plus propres par defaut. **Non necessaire.**

### 9.3 Impact sur l'implementation

#### Suppression de la config webpack

La totalite du bloc `webpack: (config, { isServer, dev, webpack }) => { ... }` peut etre supprime. Turbopack gere nativement les externals serveur via `serverExternalPackages`.

#### Gestion des polyfills client : 2 scenarios

**Scenario 1 : Les polyfills ne sont pas necessaires (probable)**

Si le build Turbopack passe sans la config webpack, cela confirme qu'aucune dependance client n'utilise ces modules Node.js. Dans ce cas :

- Supprimer tout le bloc `webpack` de `next.config.mjs`
- Supprimer les dependances devenues inutiles de `package.json` :
  - `crypto-browserify`
  - `stream-browserify`
  - `buffer`
  - `process`
- Alleger le bundle client (ces polyfills pesent ~50-100KB minifies)

**Scenario 2 : Certaines dependances client utilisent des modules Node.js**

Si le build echoue avec des erreurs `Module not found: Can't resolve 'crypto'` (ou similaire) :

- Identifier quelle dependance est en cause via le message d'erreur Turbopack
- Utiliser `turbopack.resolveAlias` pour fournir des fallbacks cibles :
  ```ts
  turbopack: {
    resolveAlias: {
      // Seulement les modules reellement necessaires
      crypto: { browser: 'crypto-browserify' },
      // Pour les modules a ignorer completement
      fs: { browser: './turbopack-empty.ts' },  // export default {}
    },
  }
  ```
- Pour `Buffer` et `process` globaux : pas d'equivalent `ProvidePlugin` en Turbopack. Il faudrait ajouter des imports explicites dans les fichiers qui en ont besoin, ou creer un polyfill global dans le layout racine.

#### Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `next.config.mjs` | Supprimer le bloc `webpack` (lignes 62-94) |
| `package.json` | Retirer `crypto-browserify`, `stream-browserify`, `buffer`, `process` des dependencies |
| `package.json` | Retirer `--webpack` des scripts si ajoute precedemment |
| `turbopack-empty.ts` | Creer si scenario 2 : `export default {}` (fichier vide pour les fallbacks) |

#### Procedure de test

1. Supprimer le bloc webpack de `next.config.mjs`
2. Lancer `pnpm dev` (Turbopack par defaut)
3. Naviguer sur toutes les pages du dashboard, overlays, quiz, presenter
4. Si erreurs `Module not found` → identifier le module et appliquer scenario 2
5. Lancer `pnpm build` (Turbopack par defaut)
6. Verifier que le build passe et que l'app fonctionne en mode production

### 9.4 Recommandation finale

| Approche | Effort | Performance | Perennite | Risque |
|----------|--------|-------------|-----------|--------|
| `--webpack` (conservative) | ~2h | Identique a aujourd'hui | Limitee (webpack sera retire) | Quasi nul |
| Turbopack (nominale) | ~3-4h | Build 2-5x plus rapide, HMR 10x | Excellente | Faible (polyfills inutilises) |

**Recommandation** : Tenter d'abord l'approche Turbopack nominale. Vu que les polyfills ne sont pas utilises par le code applicatif, il est tres probable que le build passe directement sans config webpack. En cas d'echec, le fallback `--webpack` est immediat.

**Strategie en 2 temps** :
1. Supprimer le bloc webpack et tester → si ca passe, c'est fini
2. Si ca echoue, ajouter les `resolveAlias` Turbopack necessaires → si ca echoue encore, fallback `--webpack`

---

## 10. VERDICT

**Recommandation : Upgrade recommande avec approche Turbopack nominale.**

**Effort estime** : ~3-4h de travail effectif (config + tests manuels + validation polyfills)

**Benefices principaux** :
- Build 2-5x plus rapide, Fast Refresh jusqu'a 10x plus rapide
- Routing optimise (navigations plus rapides dans le dashboard)
- React 19.2 stabilise (`useEffectEvent`, View Transitions)
- Dev server plus performant + FS cache
- Config simplifiee (suppression du bloc webpack)
- Acces aux futurs React Compiler et Cache Components
- Perennite : alignement avec la direction de Next.js

**Strategie** : Tenter Turbopack d'emblee (les polyfills sont tres probablement inutiles). Fallback `--webpack` disponible instantanement si necessaire.
