# État des traductions i18n

Ce document liste toutes les pages et composants de l'application avec leur état de traduction.

## Configuration

- **Librairie**: next-intl
- **Langues**: Français (défaut), Anglais
- **Fichiers de traduction**: `messages/fr.json`, `messages/en.json`

---

## Pages traduites ✅

### Vue Presenter (Priorité 1)
| Page/Composant | Fichier | État |
|----------------|---------|------|
| Presenter Shell | `components/presenter/PresenterShell.tsx` | ✅ Traduit |
| Cue Card | `components/presenter/CueCard.tsx` | ✅ Traduit |
| Cue Feed Panel | `components/presenter/panels/CueFeedPanel.tsx` | ✅ Traduit |
| Quick Reply Panel | `components/presenter/panels/QuickReplyPanel.tsx` | ✅ Traduit |
| VDO.Ninja Panel | `components/presenter/panels/VdoNinjaPanel.tsx` | ✅ Traduit |
| Streamerbot Chat Panel | `components/presenter/panels/streamerbot-chat/StreamerbotChatPanel.tsx` | ✅ Traduit |
| Streamerbot Chat Header | `components/presenter/panels/streamerbot-chat/StreamerbotChatHeader.tsx` | ✅ Traduit |
| Streamerbot Chat Toolbar | `components/presenter/panels/streamerbot-chat/StreamerbotChatToolbar.tsx` | ✅ Traduit |
| Streamerbot Message List | `components/presenter/panels/streamerbot-chat/StreamerbotChatMessageList.tsx` | ✅ Traduit |
| Chat Event Message | `components/presenter/chat/ChatEventMessage.tsx` | ✅ Traduit |
| Presenter Layout | `app/[locale]/presenter/layout.tsx` | ✅ Metadata traduits |

### Dashboard
| Page/Composant | Fichier | État |
|----------------|---------|------|
| Dashboard Header | `components/dashboard/DashboardHeader.tsx` | ✅ Traduit |
| Lower Third Card | `components/dashboard/cards/LowerThirdCard.tsx` | ✅ Traduit |
| Countdown Card | `components/dashboard/cards/CountdownCard.tsx` | ✅ Traduit |
| Poster Card | `components/dashboard/cards/PosterCard.tsx` | ✅ Traduit |
| Guests Card | `components/dashboard/cards/GuestsCard.tsx` | ✅ Traduit |
| Event Log | `components/dashboard/EventLog.tsx` | ✅ Traduit |
| Macros Bar | `components/dashboard/MacrosBar.tsx` | ✅ Traduit |
| Widget Manager | `components/dashboard/widgets/WidgetManager.tsx` | ⏭️ N/A (no strings) |
| Add Widget Dialog | `components/dashboard/widgets/AddWidgetDialog.tsx` | ✅ Traduit |
| Widget Toolbar | `components/dashboard/widgets/WidgetToolbar.tsx` | ✅ Traduit |

### Settings
| Page/Composant | Fichier | État |
|----------------|---------|------|
| General Settings | `components/settings/GeneralSettings.tsx` | ✅ Traduit |
| OBS Settings | `components/settings/OBSSettings.tsx` | ✅ Traduit |
| Path Settings | `components/settings/PathSettings.tsx` | ✅ Traduit |
| Plugin Settings | `components/settings/PluginSettings.tsx` | ✅ Traduit |
| Room Settings | `components/settings/RoomSettings.tsx` | ✅ Traduit |

### Profiles
| Page/Composant | Fichier | État |
|----------------|---------|------|
| Profile Manager | `components/profiles/ProfileManager.tsx` | ✅ Traduit |

### Quiz
| Page/Composant | Fichier | État |
|----------------|---------|------|
| Quiz Host Top Bar | `components/quiz/host/QuizHostTopBar.tsx` | ✅ Traduit |
| Quiz Host Navigator | `components/quiz/host/QuizHostNavigator.tsx` | ✅ Traduit |
| Quiz Question Stage | `components/quiz/host/QuizQuestionStage.tsx` | ✅ Traduit |
| Quiz Players Panel | `components/quiz/host/QuizPlayersPanel.tsx` | ✅ Traduit |
| Live Scoreboard | `components/quiz/host/LiveScoreboard.tsx` | ✅ Traduit |
| Question Editor | `components/quiz/manage/QuestionEditor.tsx` | ✅ Traduit |
| Question List | `components/quiz/manage/QuestionList.tsx` | ✅ Traduit |
| Round Editor | `components/quiz/manage/RoundEditor.tsx` | ✅ Traduit |

### Theme Editor
| Page/Composant | Fichier | État |
|----------------|---------|------|
| Theme Editor | `components/theme-editor/ThemeEditor.tsx` | ✅ Traduit |
| Theme List | `components/theme-editor/ThemeList.tsx` | ✅ Traduit |
| Theme Card | `components/theme-editor/ThemeCard.tsx` | ✅ Traduit |

### Shell / Navigation
| Page/Composant | Fichier | État |
|----------------|---------|------|
| Dashboard Shell | `components/shell/DashboardShell.tsx` | ✅ Traduit |
| Admin Sidebar | `components/dashboard/AdminSidebar.tsx` | ✅ Traduit |
| Command Palette | `components/shell/CommandPalette.tsx` | ✅ Traduit |
| Header Overflow Menu | `components/dashboard/HeaderOverflowMenu.tsx` | ✅ Traduit |
| Regie Internal Chat | `components/shell/panels/RegieInternalChatPanel.tsx` | ✅ Traduit |
| App Shell | `components/shell/AppShell.tsx` | ⏭️ N/A (layout only) |

### Shell Panels (Dockview)
| Page/Composant | Fichier | État |
|----------------|---------|------|
| Lower Third Panel | `components/shell/panels/LowerThirdPanel.tsx` | ✅ Traduit |
| Guests Panel | `components/shell/panels/GuestsPanel.tsx` | ✅ Traduit |
| Poster Panel | `components/shell/panels/PosterPanel.tsx` | ⏭️ N/A (wrapper only) |
| Countdown Panel | `components/shell/panels/CountdownPanel.tsx` | 📝 À traduire |
| Macros Panel | `components/shell/panels/MacrosPanel.tsx` | 📝 À traduire |
| Event Log Panel | `components/shell/panels/EventLogPanel.tsx` | 📝 À traduire |
| Regie Public Chat | `components/shell/panels/RegiePublicChatPanel.tsx` | 📝 À traduire |
| Regie Internal Chat View | `components/shell/panels/RegieInternalChatViewPanel.tsx` | 📝 À traduire |

### Assets
| Page/Composant | Fichier | État |
|----------------|---------|------|
| Guest Manager | `components/assets/GuestManager.tsx` | ✅ Traduit |
| Poster Manager | `components/assets/PosterManager.tsx` | ✅ Traduit |
| Guest Card | `components/assets/GuestCard.tsx` | ✅ Traduit |
| Poster Uploader | `components/assets/PosterUploader.tsx` | ✅ Traduit |
| Avatar Uploader | `components/assets/AvatarUploader.tsx` | ✅ Traduit |
| Image Cropper | `components/assets/ImageCropper.tsx` | ✅ Traduit |
| Poster Quick Add | `components/assets/PosterQuickAdd.tsx` | ✅ Traduit |

---

## Pages à traduire 📝

### Shell Panels (Dockview)
| Page/Composant | Fichier | Priorité |
|----------------|---------|----------|
| Countdown Panel | `components/shell/panels/CountdownPanel.tsx` | Moyenne |
| Macros Panel | `components/shell/panels/MacrosPanel.tsx` | Moyenne |
| Event Log Panel | `components/shell/panels/EventLogPanel.tsx` | Basse |
| Regie Public Chat | `components/shell/panels/RegiePublicChatPanel.tsx` | Basse |
| Regie Internal Chat View | `components/shell/panels/RegieInternalChatViewPanel.tsx` | Basse |

### Settings
| Page/Composant | Fichier | Priorité |
|----------------|---------|----------|
| Ollama Settings | `components/settings/OllamaSettings.tsx` | Basse |

### Assets
| Page/Composant | Fichier | Priorité |
|----------------|---------|----------|
| Poster Card (assets) | `components/assets/PosterCard.tsx` | Moyenne |
| Theme Manager | `components/assets/ThemeManager.tsx` | Moyenne |

### Quiz
| Page/Composant | Fichier | Priorité |
|----------------|---------|----------|
| Bulk Question Import | `components/quiz/manage/BulkQuestionImport.tsx` | Basse |

### Updater
| Page/Composant | Fichier | Priorité |
|----------------|---------|----------|
| Updater Container | `components/updater/UpdaterContainer.tsx` | Basse |

---

## Overlays (Non localisés)

Les overlays OBS ne nécessitent pas de traduction car ils affichent du contenu dynamique (noms d'invités, textes configurés, etc.).

| Overlay | Fichier | Notes |
|---------|---------|-------|
| Lower Third | `components/overlays/LowerThirdDisplay.tsx` | Contenu dynamique |
| Poster | `components/overlays/PosterDisplay.tsx` | Contenu dynamique |
| Countdown | `components/overlays/CountdownDisplay.tsx` | Chiffres uniquement |
| Chat Highlight | `components/overlays/ChatHighlightDisplay.tsx` | Messages chat |
| Quiz displays | `components/quiz/Quiz*.tsx` | Contenu dynamique |

---

## Comment traduire un composant

### 1. Importer useTranslations
```typescript
import { useTranslations } from "next-intl";
```

### 2. Initialiser le hook
```typescript
export function MonComposant() {
  const t = useTranslations("namespace");
  // ...
}
```

### 3. Remplacer les textes hardcodés
```typescript
// Avant
<button>Save</button>

// Après
<button>{t("actions.save")}</button>
```

### 4. Ajouter les clés dans les fichiers JSON
```json
// messages/fr.json
{
  "namespace": {
    "actions": {
      "save": "Enregistrer"
    }
  }
}

// messages/en.json
{
  "namespace": {
    "actions": {
      "save": "Save"
    }
  }
}
```

### 5. Interpolation de variables
```typescript
// Composant
t("greeting", { name: userName })

// JSON
"greeting": "Bonjour {name} !"
```

---

## Structure des namespaces

```
common          # Textes communs (erreur, chargement, boutons génériques)
presenter       # Vue Presenter
dashboard       # Dashboard principal
settings        # Pages de paramètres
assets          # Gestion des assets (invités, posters, thèmes)
profiles        # Gestion des profils
quiz            # Module Quiz
navigation      # Liens de navigation, sidebar
regieChat       # Panel chat interne régie
```

---

## Fichiers de configuration i18n

| Fichier | Description |
|---------|-------------|
| `i18n/routing.ts` | Configuration des locales (fr, en), `localeDetection: false` |
| `i18n/request.ts` | Chargement des messages côté serveur |
| `i18n/navigation.ts` | Helpers de navigation typés |
| `middleware.ts` | Routing i18n (exclut /overlays et /api) |
| `messages/fr.json` | Traductions françaises |
| `messages/en.json` | Traductions anglaises |

---

## Progression estimée

| Section | Composants | Traduits | Progression |
|---------|------------|----------|-------------|
| Presenter | 11 | 11 | 100% ✅ |
| Dashboard | 11 | 11 | 100% ✅ |
| Shell / Navigation | 6 | 5 | 83% |
| Shell Panels (Dockview) | 8 | 3 | 38% |
| Settings | 6 | 5 | 83% |
| Assets | 9 | 7 | 78% |
| Profiles | 1 | 1 | 100% ✅ |
| Quiz | 9 | 8 | 89% |
| Theme Editor | 3 | 3 | 100% ✅ |
| Updater | 1 | 0 | 0% |
| **Total** | **65** | **54** | **~83%** |

> Note: Shell/Navigation - AppShell n'a pas besoin de traduction (layout uniquement).
> Note: Shell Panels - PosterPanel est un wrapper qui utilise PosterCard (déjà traduit).
> Note: Widget Manager n'a pas de strings à traduire (composant logique uniquement).
