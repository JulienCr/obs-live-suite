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
  /** Whether panel appears in the sidebar toggle list */
  inSidebar: boolean;
  /** Search keywords for CommandPalette. Empty array = in palette with no extra keywords. */
  commandPaletteKeywords: string[];
}

/** TS errors if any PanelId key is missing */
export const PANEL_REGISTRY: Record<PanelId, PanelMeta> = {
  lowerThird: {
    icon: Type,
    inSidebar: true,
    commandPaletteKeywords: ["panel", "widget", "lower", "third", "overlay", "add"],
  },
  countdown: {
    icon: Timer,
    inSidebar: true,
    commandPaletteKeywords: ["panel", "widget", "countdown", "timer", "add"],
  },
  guests: {
    icon: Users,
    inSidebar: true,
    commandPaletteKeywords: ["panel", "widget", "guests", "people", "add"],
  },
  poster: {
    icon: Image,
    inSidebar: true,
    commandPaletteKeywords: ["panel", "widget", "poster", "gallery", "add"],
  },
  macros: {
    icon: Command,
    inSidebar: true,
    commandPaletteKeywords: ["panel", "widget", "macros", "shortcuts", "add"],
  },
  eventLog: {
    icon: FileText,
    inSidebar: true,
    commandPaletteKeywords: ["panel", "widget", "event", "log", "history", "add"],
  },
  cueComposer: {
    icon: SendHorizontal,
    inSidebar: true,
    commandPaletteKeywords: ["panel", "widget", "cue", "composer", "presenter", "add"],
  },
  presenceStatus: {
    icon: UserCheck,
    inSidebar: true,
    commandPaletteKeywords: ["panel", "widget", "presence", "status", "online", "add"],
  },
  regieInternalChat: {
    icon: MessageSquare,
    inSidebar: true,
    commandPaletteKeywords: ["panel", "widget", "internal", "chat", "regie", "add"],
  },
  regieInternalChatView: {
    icon: Inbox,
    inSidebar: true,
    commandPaletteKeywords: ["panel", "widget", "internal", "chat", "view", "regie", "add"],
  },
  regiePublicChat: {
    icon: MessagesSquare,
    inSidebar: true,
    commandPaletteKeywords: ["panel", "widget", "public", "chat", "regie", "add"],
  },
  twitch: {
    icon: Radio,
    inSidebar: true,
    commandPaletteKeywords: [
      "panel", "widget", "twitch", "stats", "viewers", "broadcast",
      "stream", "control", "title", "category", "edit", "add",
    ],
  },
  chatMessages: {
    icon: Send,
    inSidebar: true,
    commandPaletteKeywords: ["panel", "widget", "chat", "messages", "add"],
  },
  textPresets: {
    icon: BookText,
    inSidebar: true,
    commandPaletteKeywords: ["panel", "widget", "text", "presets", "lower", "third", "quick", "add"],
  },
  mediaPlayerArtlist: {
    icon: Music,
    params: { driverId: "artlist" },
    inSidebar: true,
    commandPaletteKeywords: ["panel", "widget", "media", "player", "artlist", "music", "add"],
  },
  mediaPlayerYoutube: {
    icon: Music,
    params: { driverId: "youtube" },
    inSidebar: true,
    commandPaletteKeywords: ["panel", "widget", "media", "player", "youtube", "video", "add"],
  },
};

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

/** Panels that appear in the sidebar toggle list */
export function getSidebarPanels(): { id: PanelId; icon: LucideIcon }[] {
  return PANEL_IDS.filter((id) => PANEL_REGISTRY[id].inSidebar).map((id) => ({
    id,
    icon: PANEL_REGISTRY[id].icon,
  }));
}

/** All panels available in the CommandPalette */
export function getCommandPalettePanels(): { id: PanelId; keywords: string[] }[] {
  return PANEL_IDS.map((id) => ({
    id,
    keywords: PANEL_REGISTRY[id].commandPaletteKeywords,
  }));
}

/** Extra dockview params for a panel (e.g. driverId for media players) */
export function getPanelParams(id: PanelId): Record<string, unknown> | undefined {
  return PANEL_REGISTRY[id].params;
}

/** CommandPalette i18n key for a panel: "showLowerThirdPanel", etc. */
export function getCommandPaletteI18nKey(id: PanelId): string {
  return `show${id.charAt(0).toUpperCase()}${id.slice(1)}Panel`;
}

// ---------------------------------------------------------------------------
// Backward-compat re-exports (usePanelTitle)
// ---------------------------------------------------------------------------

export const PANEL_TITLE_KEYS = PANEL_IDS;
export type PanelTitleKey = PanelId;
