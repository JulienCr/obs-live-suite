/**
 * Twitch Integration Models
 *
 * Zod schemas and types for Twitch stream info and updates.
 * Used by TwitchService, API routes, and dashboard panels.
 */

import { z } from "zod";

// ============================================================================
// STREAM INFO SCHEMAS
// ============================================================================

/**
 * Twitch stream information returned by providers
 */
export const TwitchStreamInfoSchema = z.object({
  /** Whether the stream is currently live */
  isLive: z.boolean(),
  /** Current viewer count (0 if offline) */
  viewerCount: z.number(),
  /** Stream title */
  title: z.string(),
  /** Game/category name */
  category: z.string(),
  /** Game/category ID (for updates) */
  categoryId: z.string(),
  /** Stream uptime in seconds (null if offline) */
  uptimeSeconds: z.number().nullable(),
  /** Broadcaster display name */
  broadcasterName: z.string().optional(),
});

export type TwitchStreamInfo = z.infer<typeof TwitchStreamInfoSchema>;

/**
 * Parameters for updating stream info
 */
export const TwitchUpdateParamsSchema = z.object({
  /** New stream title (optional) */
  title: z.string().min(1).max(140).optional(),
  /** New category ID (optional) */
  categoryId: z.string().optional(),
  /** New category name (for display, resolved to ID by service) */
  categoryName: z.string().optional(),
});

export type TwitchUpdateParams = z.infer<typeof TwitchUpdateParamsSchema>;

// ============================================================================
// CATEGORY SEARCH SCHEMAS
// ============================================================================

/**
 * Single category search result
 */
export const TwitchCategorySchema = z.object({
  /** Category/game ID */
  id: z.string(),
  /** Category/game name */
  name: z.string(),
  /** Box art URL template */
  boxArtUrl: z.string().optional(),
});

export type TwitchCategory = z.infer<typeof TwitchCategorySchema>;

/**
 * Category search response
 */
export const TwitchCategorySearchResultSchema = z.object({
  categories: z.array(TwitchCategorySchema),
});

export type TwitchCategorySearchResult = z.infer<typeof TwitchCategorySearchResultSchema>;

// ============================================================================
// PROVIDER STATUS SCHEMAS
// ============================================================================

/**
 * Provider types
 */
export const TwitchProviderType = z.enum(["twitch-api", "none"]);
export type TwitchProviderType = z.infer<typeof TwitchProviderType>;

/**
 * Provider status information
 */
export const TwitchProviderStatusSchema = z.object({
  /** Currently active provider */
  activeProvider: TwitchProviderType,
  /** Whether direct Twitch API is available (has valid OAuth token) */
  twitchApiAvailable: z.boolean(),
  /** Last successful poll timestamp */
  lastPollTime: z.number().nullable(),
  /** Current poll interval in milliseconds */
  pollIntervalMs: z.number(),
  /** Whether polling is currently active */
  isPolling: z.boolean(),
});

export type TwitchProviderStatus = z.infer<typeof TwitchProviderStatusSchema>;

// ============================================================================
// OAUTH SCHEMAS
// ============================================================================

/**
 * Cached Twitch user info (stored alongside tokens to avoid API calls on reload)
 */
export const TwitchUserInfoSchema = z.object({
  /** Twitch user ID (broadcaster_id for API calls) */
  id: z.string(),
  /** Twitch login name (lowercase) */
  login: z.string(),
  /** Twitch display name */
  displayName: z.string(),
  /** User email (if scope includes user:read:email) */
  email: z.string().optional(),
  /** Profile image URL */
  profileImageUrl: z.string().optional(),
});

export type TwitchUserInfo = z.infer<typeof TwitchUserInfoSchema>;

/**
 * OAuth token data stored in settings
 */
export const TwitchOAuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.number(), // Unix timestamp in milliseconds
  scope: z.array(z.string()).optional(),
  /** Cached user info to avoid API calls on backend reload */
  user: TwitchUserInfoSchema.optional(),
});

export type TwitchOAuthTokens = z.infer<typeof TwitchOAuthTokensSchema>;

// ============================================================================
// WEBSOCKET EVENT TYPES
// ============================================================================

/**
 * WebSocket channel for Twitch events
 */
export const TWITCH_WS_CHANNEL = "twitch" as const;

/**
 * Twitch WebSocket event types
 */
export type TwitchEvent =
  | { type: "stream-info"; data: TwitchStreamInfo }
  | { type: "provider-changed"; data: TwitchProviderStatus }
  | { type: "poll-error"; data: { error: string; provider: string } };

// ============================================================================
// SETTINGS SCHEMAS
// ============================================================================

/**
 * Twitch integration settings stored in database
 */
export const TwitchSettingsSchema = z.object({
  /** Enable Twitch integration */
  enabled: z.boolean().default(true),
  /** Polling interval in milliseconds */
  pollIntervalMs: z.number().min(10000).max(300000).default(30000),
  /** Preferred provider order */
  preferredProvider: TwitchProviderType.default("twitch-api"),
  /** OAuth tokens (encrypted in DB) */
  oauth: TwitchOAuthTokensSchema.nullable().optional(),
  /** Twitch Client ID (for direct API) */
  clientId: z.string().optional(),
});

export type TwitchSettings = z.infer<typeof TwitchSettingsSchema>;

/**
 * Default Twitch settings
 */
export const DEFAULT_TWITCH_SETTINGS: TwitchSettings = {
  enabled: true,
  pollIntervalMs: 30000,
  preferredProvider: "twitch-api",
  oauth: null,
  clientId: undefined,
};
