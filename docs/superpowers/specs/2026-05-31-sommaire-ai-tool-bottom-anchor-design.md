# Sommaire — AI tool `set-sommaire` + ancrage bas de l'overlay

Date: 2026-05-31

## Contexte

Le système Sommaire affiche une table des matières en overlay (catégories `#`,
sous-items `##`). Il se pilote depuis le `SommairePanel` (dashboard) qui contient
une zone de texte markdown persistée en base (`/api/settings/sommaire`), avec
boutons Show/Hide et navigation de highlight. L'overlay (`SommaireDisplay`) écoute
le canal WebSocket `sommaire` (SHOW / HIDE / HIGHLIGHT).

Deux besoins :

1. **Tool IA** — permettre à l'assistant IA intégré de transformer une liste de
   titres/sections collée en texte brut en sommaire structuré `#`/`##` et de
   **remplir le panel** (sans afficher à l'antenne — l'opérateur garde la main).
2. **Débordement** — un sommaire long déborde du bas de l'écran car l'overlay est
   centré verticalement. Il faut qu'il reste centré quand il est court mais
   s'ancre en bas (et s'empile vers le haut) quand il est long.

## Décisions

| Sujet | Choix |
|-------|-------|
| Destination du résultat | Remplit le panel (persiste), n'affiche PAS à l'antenne |
| Mise à jour du panel | Live (broadcast WebSocket), pas de rechargement manuel |
| Ancrage overlay | Centré quand court, bascule en ancrage bas quand long |
| Nom du tool MCP | `set-sommaire` |

La **transformation** texte brut → structure `#`/`##` est faite par le LLM
(l'agent IA), pas par un parseur déterministe : décider qu'une ligne est un titre
ou un sous-titre est interprétatif. Le tool ne fait que valider, persister et
diffuser le markdown déjà structuré par l'IA.

## Partie A — Tool IA `set-sommaire`

### Comportement

`set-sommaire({ markdown })` :

1. Valide qu'il y a ≥ 1 catégorie (réutilise `parseSommaireMarkdown`), sinon
   renvoie une erreur explicite.
2. **Persiste** le markdown : `frontendFetch('POST /api/settings/sommaire', { markdown })`.
3. **Diffuse** pour live-refresh du panel :
   `backendFetch('POST /api/overlays/sommaire', { action: 'set-markdown', payload: { markdown } })`.
4. Renvoie un résumé texte (nb de catégories / sous-items, rappel « clique Show
   pour l'afficher »).

N'appelle **jamais** `show`. L'opérateur révise puis affiche manuellement.
L'agent IA in-app découvre le tool automatiquement (`AiToolBridge`, cache 60s).
Tool non-destructif → exécution directe sans confirmation client.

### Live-refresh

Nouvel event sur le canal `sommaire` : `SommaireEventType.SET_MARKDOWN =
"set-markdown"`, payload `{ markdown: string }`. Le `SommaireRenderer` (overlay)
n'a pas de case pour ce type → il l'ignore (fallthrough vers `sendAck`). Le
`SommairePanel` s'abonne au canal via `useWebSocketChannel("sommaire")` et, sur
`set-markdown`, fait `setMarkdown(payload.markdown)` + toast « Sommaire mis à
jour par l'IA ».

Garde-fou accepté : le live-update écrase le contenu en cours d'édition. C'est le
comportement voulu (l'opérateur a demandé à l'IA de remplir).

### Fichiers

- `lib/models/OverlayEvents.ts` — `SommaireEventType.SET_MARKDOWN`
- `lib/models/Sommaire.ts` — `sommaireSetMarkdownPayloadSchema = z.object({ markdown: z.string().min(1) })`
- `server/api/overlays.ts` — case `set-markdown` dans la route `/sommaire`
- `mcp-server/src/tools/sommaire.ts` — tool `set-sommaire` (+ import `frontendFetch`)
- `components/shell/panels/SommairePanel.tsx` — abonnement + handler `set-markdown`
- `lib/services/ai/systemPrompt.ts` — capacité Sommaire + consigne de structuration
- `messages/fr.json`, `messages/en.json` — clé toast `dashboard.sommaire.aiUpdated`
- `mcp-server/__tests__/tools/sommaire.test.ts` — tests du tool

## Partie B — Overlay ancré en bas

Dans `components/overlays/SommaireDisplay.tsx`, remplacer le positionnement
centré fixe par un positionnement par le bas calculé à partir de la hauteur
mesurée du bloc :

```
bottomPx = max(MARGIN, (window.innerHeight - blockHeight) / 2)
```

- Bloc court → `(vh - h)/2 > MARGIN` → `bottom = (vh - h)/2` ⇒ visuellement
  centré (top et bottom égaux).
- Bloc long → `(vh - h)/2 < MARGIN` → `bottom = MARGIN` ⇒ ancré en bas, s'empile
  vers le haut.

Implémentation : `ref` sur le `motion.div`, `useLayoutEffect` qui mesure
`offsetHeight` et recalcule `bottomPx` (dépendances : `categories`), plus un
listener `resize`. Style : `bottom: bottomPx`, suppression de `top: "50%"` et
`transform: translateY(-50%)`. L'animation framer-motion (`x`, slide gauche) est
inchangée — `bottom` n'entre pas en conflit avec le `transform` animé.

`MARGIN` ≈ 60px. Caveat assumé (YAGNI) : un sommaire plus haut que l'écran
débordera en **haut** ; un scale-down auto pourra être ajouté plus tard.

## Hors périmètre

- Pas de scale-down/auto-fit pour les sommaires dépassant la hauteur d'écran.
- Pas de tool IA pour Show/Hide/Highlight (l'opérateur pilote l'antenne).
- Pas de garde anti-écrasement de l'édition en cours dans le panel.

## Tests

- `mcp-server/__tests__/tools/sommaire.test.ts` : succès (persist + broadcast
  appelés avec les bons arguments), markdown sans catégorie → erreur, échec
  persist → erreur.
- `pnpm type-check` + `pnpm test:mcp`.
