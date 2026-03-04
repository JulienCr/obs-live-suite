"use client";

import type { LucideIcon } from "lucide-react";
import {
  Type,
  Timer,
  Users,
  Image,
  Command,
  FileText,
  BookText,
  MessageSquare,
  Inbox,
  MessagesSquare,
  Radio,
  Send,
  SendHorizontal,
  UserCheck,
  Music,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Panel IDs — single source of truth
// ---------------------------------------------------------------------------

export const PANEL_IDS = [
  "lowerThird",
  "countdown",
  "guests",
  "poster",
  "macros",
  "eventLog",
  "cueComposer",
  "presenceStatus",
  "regieInternalChat",
  "regieInternalChatView",
  "regiePublicChat",
  "twitch",
  "chatMessages",
  "textPresets",
  "mediaPlayerArtlist",
  "mediaPlayerYoutube",
] as const;

export type PanelId = (typeof PANEL_IDS)[number];

// ---------------------------------------------------------------------------
// Panel metadata
// ---------------------------------------------------------------------------

/** Contract: every panel MUST implement all fields. No optional icon or keywords. */
export interface PanelMeta {
  /** Lucide icon for sidebar and UI */
  icon: LucideIcon;
  /** Extra dockview params (e.g. driverId for media players) */
  params?: Record<string, unknown>;
  /** Whether panel appears in the sidebar toggle list (default: true) */
  inSidebar?: boolean;
  /** Search keywords for CommandPalette. Empty array = in palette with no extra keywords. */
  commandPaletteKeywords: string[];
}

/** TS errors if any PanelId key is missing */
export const PANEL_REGISTRY: Record<PanelId, PanelMeta> = {
  lowerThird: {
    icon: Type,
    commandPaletteKeywords: ["panel", "widget", "lower", "third", "overlay", "add"],
  },
  countdown: {
    icon: Timer,
    commandPaletteKeywords: ["panel", "widget", "countdown", "timer", "add"],
  },
  guests: {
    icon: Users,
    commandPaletteKeywords: ["panel", "widget", "guests", "people", "add"],
  },
  poster: {
    icon: Image,
    commandPaletteKeywords: ["panel", "widget", "poster", "gallery", "add"],
  },
  macros: {
    icon: Command,
    commandPaletteKeywords: ["panel", "widget", "macros", "shortcuts", "add"],
  },
  eventLog: {
    icon: FileText,
    commandPaletteKeywords: ["panel", "widget", "event", "log", "history", "add"],
  },
  cueComposer: {
    icon: SendHorizontal,
    commandPaletteKeywords: ["panel", "widget", "cue", "composer", "presenter", "add"],
  },
  presenceStatus: {
    icon: UserCheck,
    commandPaletteKeywords: ["panel", "widget", "presence", "status", "online", "add"],
  },
  regieInternalChat: {
    icon: MessageSquare,
    commandPaletteKeywords: ["panel", "widget", "internal", "chat", "regie", "add"],
  },
  regieInternalChatView: {
    icon: Inbox,
    commandPaletteKeywords: ["panel", "widget", "internal", "chat", "view", "regie", "add"],
  },
  regiePublicChat: {
    icon: MessagesSquare,
    commandPaletteKeywords: ["panel", "widget", "public", "chat", "regie", "add"],
  },
  twitch: {
    icon: Radio,
    commandPaletteKeywords: [
      "panel", "widget", "twitch", "stats", "viewers", "broadcast",
      "stream", "control", "title", "category", "edit", "add",
    ],
  },
  chatMessages: {
    icon: Send,
    commandPaletteKeywords: ["panel", "widget", "chat", "messages", "add"],
  },
  textPresets: {
    icon: BookText,
    commandPaletteKeywords: ["panel", "widget", "text", "presets", "lower", "third", "quick", "add"],
  },
  mediaPlayerArtlist: {
    icon: Music,
    params: { driverId: "artlist" },
    commandPaletteKeywords: ["panel", "widget", "media", "player", "artlist", "music", "add"],
  },
  mediaPlayerYoutube: {
    icon: Music,
    params: { driverId: "youtube" },
    commandPaletteKeywords: ["panel", "widget", "media", "player", "youtube", "video", "add"],
  },
};

// ---------------------------------------------------------------------------
// Derived constants (computed once at module load)
// ---------------------------------------------------------------------------

/** Panels that appear in the sidebar toggle list */
export const SIDEBAR_PANELS: { id: PanelId; icon: LucideIcon }[] =
  PANEL_IDS.filter((id) => PANEL_REGISTRY[id].inSidebar !== false).map((id) => ({
    id,
    icon: PANEL_REGISTRY[id].icon,
  }));

/** All panels available in the CommandPalette */
export const COMMAND_PALETTE_PANELS: { id: PanelId; keywords: string[] }[] =
  PANEL_IDS.map((id) => ({
    id,
    keywords: PANEL_REGISTRY[id].commandPaletteKeywords,
  }));

/** Pre-computed i18n keys: "showLowerThirdPanel", etc. */
export const COMMAND_PALETTE_I18N_KEYS: Record<PanelId, string> =
  Object.fromEntries(
    PANEL_IDS.map((id) => [id, `show${id.charAt(0).toUpperCase()}${id.slice(1)}Panel`])
  ) as Record<PanelId, string>;

/** Extra dockview params for a panel (e.g. driverId for media players) */
export function getPanelParams(id: PanelId): Record<string, unknown> | undefined {
  return PANEL_REGISTRY[id].params;
}

// ---------------------------------------------------------------------------
// Backward-compat re-exports (usePanelTitle)
// ---------------------------------------------------------------------------

export const PANEL_TITLE_KEYS = PANEL_IDS;
export type PanelTitleKey = PanelId;
