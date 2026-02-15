# Stack Frontend - OBS Live Suite

## Framework & Runtime

| Tech | Version | Role |
|------|---------|------|
| **Next.js** | 15.5+ | Framework principal (App Router) |
| **React** | 19.2 | Library UI |
| **TypeScript** | 5.9 | Typage strict (`strict: true`, target ES2022) |
| **Turbopack** | (integre Next.js) | Bundler dev (config dans `next.config.mjs`) |
| **Node.js** | >= 20 | Runtime requis |

## Styling

| Tech | Version | Role |
|------|---------|------|
| **Tailwind CSS** | 3.4 | Utility-first CSS |
| **tailwindcss-animate** | 1.0 | Animations Tailwind |
| **PostCSS + Autoprefixer** | 8.5 / 10.4 | Post-processing CSS |
| **CSS Variables (HSL)** | - | Theming via custom properties (`--primary`, `--background`, etc.) |
| **next-themes** | 0.4 | Dark mode (class-based, dark par defaut) |
| **styled-jsx** | 5.1 | CSS-in-JS ponctuel |

## UI Components

| Tech | Role |
|------|------|
| **shadcn/ui** (Radix + CVA) | Base components (`components/ui/` - 34 composants) |
| **Radix UI** | Primitives accessibles (dialog, dropdown, popover, tabs, select, switch, slider, etc.) |
| **class-variance-authority (CVA)** | Variants de composants |
| **clsx + tailwind-merge** | Merge conditionnel de classes |
| **Lucide React** | Icones |
| **Blueprint.js** | Composants complementaires (core, icons, popover2, select) |
| **cmdk** | Command palette |
| **Sonner** | Toasts/notifications |

## State & Data Fetching

| Tech | Version | Role |
|------|---------|------|
| **TanStack React Query** | 5.90 | Server state, cache, requetes API |
| **React Hook Form** | 7.69 | Gestion de formulaires |
| **@hookform/resolvers** | 3.10 | Validation avec Zod |
| **Zod** | 3.25 | Validation de schemas |
| **React Context** | (natif) | State applicatif (AppMode, Dockview, PanelColors, Workspaces, LayoutPresets) |

## Layout & Workspace

| Tech | Role |
|------|------|
| **Dockview** (core + react) 4.12 | Dashboard dockable/resizable panels |
| **@dnd-kit** (core + sortable) | Drag & drop |
| **react-easy-crop** | Crop d'images |

## Real-time & Communication

| Tech | Role |
|------|------|
| **WebSocket natif** (cote client) | Connexion au hub WS (port 3003) |
| **Custom hooks** | `useWebSocketChannel`, `useMultiChannelWebSocket`, `useSyncWithOverlayState`, `useOverlayActiveState` |

## Internationalization (i18n)

| Tech | Config |
|------|--------|
| **next-intl** 4.7 | FR (defaut) + EN |
| **Routing** | `[locale]` prefix (`as-needed`), pas de detection navigateur |
| **Middleware** | Exclut `/api`, `/overlays`, `/_next`, `/cert` |
| **Fichiers** | `messages/fr.json`, `messages/en.json` |

## Fonts

| Font | Source |
|------|--------|
| **Inter** | Google Fonts (via `next/font`) |

## Routing (App Router)

```
app/
├── layout.tsx                    # Root layout minimal (overlays, non-localise)
├── [locale]/
│   ├── layout.tsx                # Layout localise (providers, AppShell)
│   ├── dashboard/page.tsx        # Dashboard principal
│   ├── assets/                   # Gestion guests, posters, themes, text-presets
│   ├── quiz/                     # host + manage
│   ├── presenter/page.tsx        # Vue presentateur
│   ├── profiles/page.tsx
│   ├── settings/                 # 12 pages settings
│   ├── shortcuts/page.tsx
│   └── updater/page.tsx
├── overlays/                     # Browser sources OBS (sans locale)
│   ├── lower-third, countdown, poster, poster-bigpicture
│   ├── quiz, chat-highlight, composite
│   └── test
└── cert/page.tsx                 # Installation certificat mobile
```

## Provider Tree (locale layout)

```
QueryProvider (TanStack React Query)
  └── NextIntlClientProvider
      └── ThemeProvider (next-themes, dark par defaut)
          └── AppModeProvider
              └── BodyThemeSync
                  └── AppShell (DashboardShell / navigation)
```

## Custom Hooks

| Hook | Role |
|------|------|
| `useWebSocketChannel` | Souscription a un canal WS |
| `useMultiChannelWebSocket` | Multi-canal WS |
| `useSyncWithOverlayState` | Sync etat overlay |
| `useOverlayActiveState` | Etat actif overlay |
| `usePosterPlayback` | Lecture poster (video + YouTube) |
| `useChapterNavigation` | Navigation chapitres |
| `useYouTubeIframeApi` | API YouTube postMessage |
| `useDebouncedAction` | Debounce actions |
| `useEventLog` | Log d'evenements temps reel |
| `useKeyboardShortcuts` | Raccourcis clavier |

## Testing Frontend

| Tech | Version | Role |
|------|---------|------|
| **Jest** | 30 | Test runner |
| **@testing-library/react** | 16.3 | Tests composants React |
| **jest-environment-jsdom** | 30 | Env navigateur |
| **Playwright** | 1.57 | Tests fonctionnels (E2E) |
| **Supertest** | 7.2 | Tests API |

## Markdown Rendering

| Tech | Role |
|------|------|
| **react-markdown** | Rendu markdown |
| **remark-gfm** | Support GitHub Flavored Markdown |
| **remark-breaks** | Line breaks |

## Dev Tools

| Tech | Role |
|------|------|
| **ESLint** 8 + eslint-config-next | Linting |
| **React Query Devtools** | Debug queries (dev only) |
| **concurrently** | Front + back en parallele |
