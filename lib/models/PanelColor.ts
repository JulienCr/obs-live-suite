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
] as const;

export type PanelId = (typeof PANEL_IDS)[number];

/**
 * Hex color validation regex
 */
const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

/**
 * Zod schema for panel color configuration
 */
export const panelColorSchema = z.object({
  id: z.string().uuid(),
  panelId: z.enum(PANEL_IDS),
  lightBackground: z.string().regex(hexColorRegex).nullable(),
  lightHeader: z.string().regex(hexColorRegex).nullable(),
  darkBackground: z.string().regex(hexColorRegex).nullable(),
  darkHeader: z.string().regex(hexColorRegex).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PanelColor = z.infer<typeof panelColorSchema>;

/**
 * Schema for creating/updating panel colors (partial, for API requests)
 */
export const panelColorUpdateSchema = z.object({
  lightBackground: z.string().regex(hexColorRegex).nullable().optional(),
  lightHeader: z.string().regex(hexColorRegex).nullable().optional(),
  darkBackground: z.string().regex(hexColorRegex).nullable().optional(),
  darkHeader: z.string().regex(hexColorRegex).nullable().optional(),
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
};
