import { z } from "zod";

/**
 * Panel IDs for the dashboard dockview panels
 */
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
] as const;

export type PanelId = (typeof PANEL_IDS)[number];

/**
 * Extended panel ID type that allows custom IDs beyond the predefined ones.
 * Use this for new panels that haven't been added to PANEL_IDS yet.
 */
export type ExtendedPanelId = PanelId | (string & {});

/**
 * Color schemes available for panel customization
 */
export const COLOR_SCHEMES = [
  "neutral",
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "orange",
  "pink",
  "cyan",
] as const;

export type ColorScheme = (typeof COLOR_SCHEMES)[number];

/**
 * Display names for color schemes in UI
 */
export const COLOR_SCHEME_DISPLAY_NAMES: Record<ColorScheme, string> = {
  neutral: "Neutral",
  red: "Red",
  blue: "Blue",
  green: "Green",
  yellow: "Yellow",
  purple: "Purple",
  orange: "Orange",
  pink: "Pink",
  cyan: "Cyan",
};

/**
 * Zod schema for panel color configuration
 */
export const panelColorSchema = z.object({
  id: z.string().uuid(),
  panelId: z.enum(PANEL_IDS),
  scheme: z.enum(COLOR_SCHEMES).default("neutral"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PanelColor = z.infer<typeof panelColorSchema>;

/**
 * Schema for creating/updating panel colors (partial, for API requests)
 */
export const panelColorUpdateSchema = z.object({
  scheme: z.enum(COLOR_SCHEMES).optional(),
});

export type PanelColorUpdate = z.infer<typeof panelColorUpdateSchema>;

/**
 * Panel display names for UI
 */
export const PANEL_DISPLAY_NAMES: Record<PanelId, string> = {
  lowerThird: "Lower Third",
  countdown: "Countdown",
  guests: "Guests",
  poster: "Poster",
  macros: "Macros",
  eventLog: "Event Log",
  cueComposer: "Cue Composer",
  presenceStatus: "Presence Status",
  regieInternalChat: "Regie Internal Chat",
  regieInternalChatView: "Regie Internal Chat View",
  regiePublicChat: "Regie Public Chat",
  twitch: "Twitch",
};
