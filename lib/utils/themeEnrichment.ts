/**
 * Theme Enrichment Utility
 * Shared logic for enriching overlay payloads with active theme data
 */

import { ProfileRepository } from "../repositories/ProfileRepository";
import { ThemeRepository } from "../repositories/ThemeRepository";
import { Theme } from "../models/Theme";

export interface LowerThirdThemeData {
  colors: Theme["colors"];
  template: Theme["lowerThirdTemplate"];
  font: Theme["lowerThirdFont"];
  layout: Theme["lowerThirdLayout"];
  lowerThirdAnimation: Theme["lowerThirdAnimation"];
}

export interface CountdownThemeData {
  colors: Theme["colors"];
  style: Theme["countdownStyle"];
  font: Theme["countdownFont"];
  layout: Theme["countdownLayout"];
}

export interface PosterThemeData {
  layout: Theme["posterLayout"];
}

export interface ChatHighlightThemeData {
  colors: {
    primary: string;
    accent: string;
    surface: string;
    text: string;
  };
  font: {
    family: string;
    size: number;
    weight: number;
  };
}

/**
 * Get the active theme from the database
 * @returns Theme object or null if not found
 */
export function getActiveTheme(): Theme | null {
  try {
    const profileRepo = ProfileRepository.getInstance();
    const themeRepo = ThemeRepository.getInstance();

    const activeProfile = profileRepo.getActive();

    if (!activeProfile || !activeProfile.themeId) {
      console.log("[ThemeEnrichment] No active profile or themeId found");
      return null;
    }

    const theme = themeRepo.getById(activeProfile.themeId) as Theme;
    if (theme) {
      console.log("[ThemeEnrichment] Found theme:", theme.name, "ID:", theme.id);
    } else {
      console.log("[ThemeEnrichment] Theme not found for ID:", activeProfile.themeId);
    }

    return theme;
  } catch (error) {
    console.error("[ThemeEnrichment] Failed to get active theme:", error);
    return null;
  }
}

/**
 * Extract lower third theme data from a Theme object
 * @param theme Theme object
 * @returns LowerThirdThemeData or undefined
 */
export function getLowerThirdThemeData(theme: Theme | null): LowerThirdThemeData | undefined {
  if (!theme) return undefined;
  
  return {
    colors: theme.colors,
    template: theme.lowerThirdTemplate,
    font: theme.lowerThirdFont,
    layout: theme.lowerThirdLayout,
    lowerThirdAnimation: theme.lowerThirdAnimation,
  };
}

/**
 * Extract countdown theme data from a Theme object
 * @param theme Theme object
 * @returns CountdownThemeData or undefined
 */
export function getCountdownThemeData(theme: Theme | null): CountdownThemeData | undefined {
  if (!theme) return undefined;
  
  return {
    colors: theme.colors,
    style: theme.countdownStyle,
    font: theme.countdownFont,
    layout: theme.countdownLayout,
  };
}

/**
 * Extract poster theme data from a Theme object
 * @param theme Theme object
 * @returns PosterThemeData or undefined
 */
export function getPosterThemeData(theme: Theme | null): PosterThemeData | undefined {
  if (!theme) return undefined;
  
  return {
    layout: theme.posterLayout,
  };
}

/**
 * Enrich a lower third payload with active theme data
 * @param payload Existing payload
 * @returns Enriched payload with theme data
 */
export function enrichLowerThirdPayload<T extends Record<string, unknown>>(
  payload: T
): T & { theme?: LowerThirdThemeData } {
  const theme = getActiveTheme();
  const themeData = getLowerThirdThemeData(theme);

  return {
    ...payload,
    theme: themeData,
  };
}

/**
 * Enrich a countdown payload with active theme data
 * @param payload Existing payload
 * @returns Enriched payload with theme data
 */
export function enrichCountdownPayload<T extends Record<string, unknown>>(
  payload: T
): T & { theme?: CountdownThemeData } {
  const theme = getActiveTheme();
  const themeData = getCountdownThemeData(theme);

  return {
    ...payload,
    theme: themeData,
  };
}

/**
 * Enrich a poster payload with active theme data
 * @param payload Existing payload
 * @returns Enriched payload with theme data
 */
export function enrichPosterPayload<T extends Record<string, unknown>>(
  payload: T
): T & { theme?: PosterThemeData } {
  const theme = getActiveTheme();
  const themeData = getPosterThemeData(theme);

  return {
    ...payload,
    theme: themeData,
  };
}

/**
 * Extract chat highlight theme data from a Theme object
 * Uses lower third font settings for consistency
 * @param theme Theme object
 * @returns ChatHighlightThemeData or undefined
 */
export function getChatHighlightThemeData(theme: Theme | null): ChatHighlightThemeData | undefined {
  if (!theme) return undefined;

  return {
    colors: {
      primary: theme.colors.primary,
      accent: theme.colors.accent,
      surface: theme.colors.surface,
      text: theme.colors.text,
    },
    font: theme.lowerThirdFont,
  };
}

/**
 * Enrich a chat highlight payload with active theme data
 * @param payload Existing payload
 * @returns Enriched payload with theme data
 */
export function enrichChatHighlightPayload<T extends Record<string, unknown>>(
  payload: T
): T & { theme?: ChatHighlightThemeData } {
  const theme = getActiveTheme();
  const themeData = getChatHighlightThemeData(theme);

  return {
    ...payload,
    theme: themeData,
  };
}

