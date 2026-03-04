import { z } from "zod";

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
  panelId: z.string().min(1),
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
 * Returns the CSS class name for a panel color scheme, or empty string for neutral.
 */
export function getPanelSchemeClass(scheme: ColorScheme | undefined): string {
  return scheme && scheme !== "neutral" ? `panel-scheme-${scheme}` : "";
}

