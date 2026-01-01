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

---

## Pages à traduire 📝

### Dashboard
| Page/Composant | Fichier | Priorité |
|----------------|---------|----------|
| Dashboard Shell | `components/shell/DashboardShell.tsx` | Haute |
| Dashboard Header | `components/dashboard/DashboardHeader.tsx` | Haute |
| Admin Sidebar | `components/dashboard/AdminSidebar.tsx` | Haute |
| Command Palette | `components/shell/CommandPalette.tsx` | Haute |
| Countdown Card | `components/dashboard/cards/CountdownCard.tsx` | Moyenne |
| Lower Third Card | `components/dashboard/cards/LowerThirdCard.tsx` | Moyenne |
| Poster Card | `components/dashboard/cards/PosterCard.tsx` | Moyenne |
| Widget Manager | `components/dashboard/widgets/WidgetManager.tsx` | Moyenne |
| Add Widget Dialog | `components/dashboard/widgets/AddWidgetDialog.tsx` | Moyenne |
| Event Log | `components/dashboard/EventLog.tsx` | Basse |
| Macros Bar | `components/dashboard/MacrosBar.tsx` | Basse |

### Settings
| Page/Composant | Fichier | Priorité |
|----------------|---------|----------|
| General Settings | `components/settings/GeneralSettings.tsx` | Haute |
| OBS Settings | `components/settings/OBSSettings.tsx` | Haute |
| Path Settings | `components/settings/PathSettings.tsx` | Moyenne |
| Plugin Settings | `components/settings/PluginSettings.tsx` | Moyenne |
| Room Settings | `components/settings/RoomSettings.tsx` | Haute |
| Ollama Settings | `components/settings/OllamaSettings.tsx` | Basse |

### Assets
| Page/Composant | Fichier | Priorité |
|----------------|---------|----------|
| Guest Manager | `components/assets/GuestManager.tsx` | Haute |
| Guest Card | `components/assets/GuestCard.tsx` | Haute |
| Poster Manager | `components/assets/PosterManager.tsx` | Haute |
| Poster Card | `components/assets/PosterCard.tsx` | Haute |
| Poster Uploader | `components/assets/PosterUploader.tsx` | Moyenne |
| Theme Manager | `components/assets/ThemeManager.tsx` | Moyenne |
| Avatar Uploader | `components/assets/AvatarUploader.tsx` | Basse |
| Image Cropper | `components/assets/ImageCropper.tsx` | Basse |

### Profiles
| Page/Composant | Fichier | Priorité |
|----------------|---------|----------|
| Profile Manager | `components/profiles/ProfileManager.tsx` | Haute |

### Quiz
| Page/Composant | Fichier | Priorité |
|----------------|---------|----------|
| Quiz Host Top Bar | `components/quiz/host/QuizHostTopBar.tsx` | Haute |
| Quiz Host Navigator | `components/quiz/host/QuizHostNavigator.tsx` | Haute |
| Quiz Question Stage | `components/quiz/host/QuizQuestionStage.tsx` | Haute |
| Quiz Players Panel | `components/quiz/host/QuizPlayersPanel.tsx` | Haute |
| Live Scoreboard | `components/quiz/host/LiveScoreboard.tsx` | Moyenne |
| Question Editor | `components/quiz/manage/QuestionEditor.tsx` | Moyenne |
| Question List | `components/quiz/manage/QuestionList.tsx` | Moyenne |
| Round Editor | `components/quiz/manage/RoundEditor.tsx` | Moyenne |
| Bulk Question Import | `components/quiz/manage/BulkQuestionImport.tsx` | Basse |

### Theme Editor
| Page/Composant | Fichier | Priorité |
|----------------|---------|----------|
| Theme Editor | `components/theme-editor/ThemeEditor.tsx` | Moyenne |
| Theme List | `components/theme-editor/ThemeList.tsx` | Moyenne |
| Theme Card | `components/theme-editor/ThemeCard.tsx` | Moyenne |

### Shell / Navigation
| Page/Composant | Fichier | Priorité |
|----------------|---------|----------|
| App Shell | `components/shell/AppShell.tsx` | Haute |
| Navigation links | Sidebar, menus | Haute |

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
```

---

## Fichiers de configuration i18n

| Fichier | Description |
|---------|-------------|
| `i18n/routing.ts` | Configuration des locales (fr, en) |
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
| Dashboard | 11 | 0 | 0% |
| Settings | 6 | 0 | 0% |
| Assets | 8 | 0 | 0% |
| Profiles | 1 | 0 | 0% |
| Quiz | 9 | 0 | 0% |
| Theme Editor | 3 | 0 | 0% |
| Shell | 2 | 0 | 0% |
| **Total** | **51** | **11** | **~22%** |
